import { fileURLToPath } from 'url';
import { WorkerOptions, cli, defineAgent, JobContext, voice, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { VAD as SileroVAD } from '@livekit/agents-plugin-silero';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import util from 'node:util';
dotenv.config();

// Module-level handle to the per-room data-channel publisher. The LLM reply
// text (produced in LeadPilotLLMStream.run) is spoken through this so replies
// are delivered over the LiveKit Data channel as WAV (the working audio path on
// this platform), instead of the framework's silent native track.
let replySpeaker: ((text: string) => Promise<void>) | null = null;
// Module-level handle so the LeadPilotLLMStream constructor (separate class
// scope) can publish transcripts over the data channel.
let publishTranscriptFn: ((role: 'user' | 'assistant', text: string, final: boolean) => void) | null = null;
// Prevents concurrent turns from firing simultaneous TTS + publishWav calls.
// If a turn is already in flight, new ones are dropped until it completes.
let turnInFlight = false;
// Per-room RAG cache: after the first turn warms the pipeline, subsequent
// turns reuse the cached context. Cleared on room disconnect.
const ragCache = new Map<string, string>();
// AbortController for the in-flight turn so in-flight HTTP requests to
// agent-turn can be cancelled when the user starts speaking again (barge-in).
let currentTurnAbort: AbortController | null = null;
// Set to true when user barges in — publishWav checks this and aborts
// synthesis early instead of finishing a reply that will be immediately
// discarded.
let bargeInRequested = false;

const __filename = fileURLToPath(import.meta.url);

const REQUIRED_ENV_VARS = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'OPENAI_API_KEY',
];

/**
 * Validate that every required environment variable is set and non-empty.
 */
function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:\n');
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    console.error('\nSet the missing variables and restart the agent.');
    process.exit(1);
  }
}

validateEnv();

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LEADPILOT_API_URL = process.env.LEADPILOT_API_URL ?? 'http://localhost:3000';

// Fetch project config from LeadPilot backend
async function getProjectConfig(roomName: string) {
  try {
    const res = await fetch(
      `${LEADPILOT_API_URL}/api/voice/agent-config?roomName=${encodeURIComponent(roomName)}`
    );
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[Agent] agent-config non-JSON response:', res.status, text.slice(0, 200));
      return null;
    }
    const json = await res.json() as {
      success: boolean;
      data: { botName: string; systemPrompt: string; welcomeMessage: string; projectId: string };
    };
    return json.data ?? null;
  } catch (err) {
    console.error('[Agent] getProjectConfig failed:', err);
    return null;
  }
}

// Run a single turn through the SHARED LeadPilot AI brain (the exact same
// pipeline the chat widget uses: pgvector RAG + Gemini embeddings, the shared
// system prompt/objectives/decision framework, the same OpenAI model, AIOS,
// memory updates, intelligence persistence and lead extraction).
async function getAgentTurn(
  projectId: string,
  conversationId: string,
  message: string,
  roomName: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    const res = await fetch(`${LEADPILOT_API_URL}/api/voice/agent-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        conversationId,
        message,
        skipRagRefresh: ragCache.has(roomName),
      }),
      signal,
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) {
      return '';
    }
    const data = (await res.json()) as { success: boolean; data?: { reply: string } };
    ragCache.set(roomName, 'warm');
    return data.data?.reply ?? '';
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.log('[VOICE] Turn aborted — user started speaking');
      return '';
    }
    console.error('[Agent] getAgentTurn failed:', err);
    return '';
  }
}

// Save transcript to LeadPilot webhook (lead extraction + durable voice transcript)
async function saveTranscript(
  roomName: string,
  transcript: Array<{ role: string; content: string }>,
  duration: number
) {
  try {
    await fetch(`${LEADPILOT_API_URL}/api/voice/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, transcript, duration }),
    });
    console.log('[Agent] Transcript saved');
  } catch (err) {
    console.error('[Agent] saveTranscript failed:', err);
  }
}

/**
 * Custom LiveKit LLM that delegates every completion to the shared LeadPilot
 * brain (apps/web /api/voice/agent-turn). This guarantees the Voice Agent uses
 * the EXACT same RAG + prompt + OpenAI + AIOS pipeline as the Chat widget — the
 * only difference is the input/output modality (speech vs text).
 *
 * LiveKit still owns STT (speech->text), TTS (text->speech), VAD and turn
 * detection; this class is purely the "brain" slot.
 */
class LeadPilotLLM extends llm.LLM {
  projectId: string | null = null;
  conversationId: string | null = null;
  roomName: string | null = null;

  label(): string {
    return 'leadpilot';
  }

  get model(): string {
    return 'leadpilot-shared-brain';
  }

  get provider(): string {
    return 'leadpilot';
  }

  chat(opts: { chatCtx: llm.ChatContext }): llm.LLMStream {
    const items = (opts.chatCtx.items as any[]).map((i) => i.role);
    console.log('[VOICE] LeadPilotLLM.chat() called. chatCtx roles:', JSON.stringify(items));
    return new LeadPilotLLMStream(this, { chatCtx: opts.chatCtx, connOptions: {} as any });
  }
}

class LeadPilotLLMStream extends llm.LLMStream {
  #llm: LeadPilotLLM;

  constructor(llmInstance: LeadPilotLLM, opts: { chatCtx: llm.ChatContext; connOptions: any }) {
    super(llmInstance as any, opts);
    this.#llm = llmInstance;
    const items = (opts.chatCtx?.items ?? []).map((i: any) => i.role);
    console.log('[VOICE] LeadPilotLLMStream constructed; chatCtx roles:', JSON.stringify(items));

    // The base LLMStream schedules run() via startSoon(mainTask), which on this
    // platform never invokes our override before the turn completes. To guarantee
    // the reply (text + audio) is delivered, compute it eagerly here and push it
    // straight onto the output queue that the framework iterates (for await).
    (async () => {
      if (turnInFlight) {
        // Abort the previous turn if user speaks again (barge-in)
        if (currentTurnAbort) {
          currentTurnAbort.abort();
          currentTurnAbort = null;
        }
        turnInFlight = false; // allow new turn to proceed
      }
      turnInFlight = true;
      bargeInRequested = false; // new turn starting — clear any previous barge-in
      const abortCtrl = new AbortController();
      currentTurnAbort = abortCtrl;
      try {
        const lastUser = [...(opts.chatCtx?.items ?? [])]
          .reverse()
          .find((i: any) => i.role === 'user');
        const text = extractText((lastUser as any)?.content);
        console.log('[VOICE] Extracted user text:', JSON.stringify(text), 'projectId:', this.#llm.projectId, 'conversationId:', this.#llm.conversationId);

        let spoken = "Sorry, I didn't catch that.";
        if (text && this.#llm.projectId) {
          console.log('[VOICE] Calling /api/voice/agent-turn with:', JSON.stringify({ projectId: this.#llm.projectId, conversationId: this.#llm.conversationId, message: text }));
          const reply = await getAgentTurn(
            this.#llm.projectId,
            this.#llm.conversationId ?? '',
            text,
            this.#llm.roomName ?? '',
            abortCtrl.signal
          );
          console.log('[VOICE] Response received. Reply:', JSON.stringify(reply));
          if (reply) {
            spoken = reply;
          } else if (bargeInRequested) {
            // Aborted due to barge-in — stay completely silent
            console.log('[BARGE-IN] turn aborted — staying silent');
            return;
          } else {
            // Genuine failure (not a barge-in) — speak the fallback
            spoken = "I heard you, but my brain is temporarily unavailable. Please try again in a moment.";
          }
        } else {
          console.log('[VOICE] No user text/projectId — using fallback');
        }

        // Publish the reply as a transcript AND speak it over the data channel.
        if (publishTranscriptFn) publishTranscriptFn('assistant', spoken, true);
        console.log('[TRANSCRIPT] assistant reply sent:', JSON.stringify(spoken));
        if (replySpeaker) {
          replySpeaker(spoken).catch((e: any) =>
            console.log('[DATACH-FB] reply speak ERR', e && e.message)
          );
        }
      } catch (e: any) {
        console.log('[VOICE] LLMStream reply THREW:', e && e.message);
      } finally {
        turnInFlight = false;
        currentTurnAbort = null;
      }
    })();
  }

  protected async run(): Promise<void> {
    // Reply is produced eagerly in the constructor; nothing to do here.
  }
}

/** Extract plain text from a LiveKit chat context content field. */
function extractText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c: any) => {
        if (!c) return '';
        if (typeof c === 'string') return c; // LiveKit stores STT as ["Can you hear me?"]
        if (c.type === 'text') return c.text ?? '';
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

// Load the Silero VAD exactly once per worker process. OpenAI's STT
// (gpt-realtime-whisper) requires a VAD instance to commit audio at
// end-of-speech. Using a module-level singleton avoids any dependency on
// prewarm->entry userData propagation.
let vadPromise: Promise<any> | null = null;
function getVad(): Promise<any> {
  if (!vadPromise) {
    vadPromise = SileroVAD.load().then((v) => {
      console.log('[DIAG] SileroVAD.load() success:', !!v, 'type:', typeof v);
      return v;
    });
  }
  return vadPromise;
}

export default defineAgent({
  prewarm: async (proc: any) => {
    console.log('[DIAG] prewarm executing');
    const loaded = await getVad();
    proc.userData.vad = loaded;
    proc.userData.__prewarmMarker = true;
    console.log('[DIAG] prewarm proc.userData.vad set:', !!proc.userData.vad);
  },
  entry: async (ctx: JobContext) => {
    console.log('[TRACE] WORKER RECEIVED JOB for room:', ctx.room?.name, 'jobId:', ctx.job?.id, 'workerId:', ctx.workerId);
    await ctx.connect();
    console.log('[TRACE] BROWSER/CONNECT: agent connected to room:', ctx.room.name);

    const roomName = ctx.room.name;
    const startTime = Date.now();
    console.log('[Agent] Entry called for room:', roomName);

    const NODE_VERSION = process.version;
    const ENVIRONMENT = process.env.NODE_ENV || 'development';

    const envDiagnostics: Record<string, 'Present' | 'Missing'> = {
      LIVEKIT_URL: LIVEKIT_URL ? 'Present' : 'Missing',
      LIVEKIT_API_KEY: (process.env.LIVEKIT_API_KEY ?? '').trim() ? 'Present' : 'Missing',
      LIVEKIT_API_SECRET: (process.env.LIVEKIT_API_SECRET ?? '').trim() ? 'Present' : 'Missing',
      OPENAI_API_KEY: (process.env.OPENAI_API_KEY ?? '').trim() ? 'Present' : 'Missing',
    };

    console.log(
      [
        '========== LEADPILOT AGENT ==========',
        `Agent started successfully`,
        `Environment: ${ENVIRONMENT}`,
        `Node: ${NODE_VERSION}`,
        `LiveKit: Connected`,
        `OpenAI Key: ${envDiagnostics.OPENAI_API_KEY}`,
        `Brain: LeadPilot shared AI brain (OpenAI + RAG)`,
        '=====================================',
      ].join('\n')
    );

    // Parse dispatch metadata
    let projectId: string | null = null;
    let voiceConversationId: string | null = null;
    try {
      if (ctx.job.metadata) {
        const meta = JSON.parse(ctx.job.metadata);
        projectId = meta.projectId ?? null;
        voiceConversationId = meta.voiceConversationId ?? null;
      }
    } catch {
      console.log('[Agent] No dispatch metadata');
    }

    // Fetch project config
    const config = await getProjectConfig(roomName);
    const botName = config?.botName ?? 'LeadPilot Assistant';
    const welcomeMessage = config?.welcomeMessage ?? 'Hi! How can I help you today?';
    const resolvedProjectId = projectId ?? config?.projectId ?? null;
    const conversationId = voiceConversationId ?? '';

    console.log('[Agent] Config loaded:', botName);

    // The shared brain builds the REAL system prompt itself; the LiveKit Agent
    // only needs a lightweight persona instruction for the session wrapper.
    const instructions = `You are ${botName}, a helpful voice assistant for this business. Speak naturally and conversationally.`;

    const transcript: Array<{ role: string; content: string }> = [];

    // Wire the shared LeadPilot brain into the agent's LLM slot.
    const leadpilotLLM = new LeadPilotLLM();
    leadpilotLLM.projectId = resolvedProjectId;
    leadpilotLLM.conversationId = conversationId;
    leadpilotLLM.roomName = roomName;

    // VAD loaded once (module singleton / prewarm). OpenAI's STT
    // (gpt-realtime-whisper) requires the SAME VAD instance passed directly to
    // the STT constructor — passing it only to AgentSession is not enough.
    const vad = (ctx.proc.userData.vad as any) ?? (await getVad());
    console.log('[DIAG] entry: vad truthy:', !!vad, 'type:', typeof vad, 'fromPrewarm:', !!ctx.proc.userData.vad);
    console.log('[DIAG] creating openai.STT with vad truthy:', !!vad);

    // Shared TTS instance (used by the greeting via session.say).
    const tts = new openai.TTS({ voice: 'alloy' });

    // Dedicated TTS instance for the data-channel reply fallback. Using a
    // separate instance avoids serializing/contending with the greeting TTS on
    // the shared OpenAI client (which previously caused ~10s reply latency).
    const fallbackTts = new openai.TTS({ voice: 'alloy' });

    const session = new voice.AgentSession({
      // STT/TTS stay voice-specific (OpenAI). The LLM is the shared LeadPilot brain.
      stt: new openai.STT({ vad }) as any,
      tts: tts as any,
      llm: leadpilotLLM,
      // VAD required by OpenAI's STT (gpt-realtime-whisper) for end-of-speech
      // audio commits. Loaded once in prewarm.
      vad,
      // Use STT-finalized turn detection so the assistant replies only after the
      // visitor finishes speaking (no realtime-LLM turn detection — the shared
      // brain owns the reply).
      turnDetection: 'stt',
      // Disable preemptive generation: without it LiveKit generates a (wasted,
      // interruptible) reply on the interim transcript AND again on the final
      // one — causing a doubled/overlapping reply and 2x latency.
      preemptiveGeneration: false,
    });

    // Listen for user transcription for live logging
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev: any) => {
      console.log('[VOICE] Transcript event isFinal=', ev.isFinal, 'text=', JSON.stringify(ev.transcript));
      if (ev.isFinal && ev.transcript) {
        console.log('[Agent] User said:', ev.transcript);
        transcript.push({ role: 'user', content: ev.transcript });
      }
    });

    // User state (speaking/listening) — surfaced by VAD/turn detection.
    // When user starts speaking, immediately signal widget to stop current
    // audio AND abort in-flight TTS synthesis. This is the barge-in: user
    // speech interrupts the agent's reply mid-sentence.
    session.on(voice.AgentSessionEventTypes.UserStateChanged, (ev: any) => {
      const rawState = ev.state ?? ev.newState ?? ev;
      const stateStr = typeof rawState === 'string' ? rawState : JSON.stringify(rawState);
      console.log('[VOICE] UserStateChanged:', stateStr);

      if (stateStr === 'speaking') {
        // User started talking — set flag to abort ongoing TTS synthesis
        bargeInRequested = true;
        console.log('[BARGE-IN] user speaking — aborting TTS');

        // Signal widget to stop playing current audio immediately
        try {
          const stopMsg = new TextEncoder().encode(JSON.stringify({ stop: true }));
          ctx.room.localParticipant.publishData(stopMsg, {
            reliable: true,
            topic: 'agent-audio-control',
          }).catch((e: any) => console.log('[BARGE-IN] publishData ERR', e?.message));
        } catch (e: any) {
          console.log('[BARGE-IN] encode ERR', e?.message);
        }
      }
    });

    // EOT prediction from VAD/turn detection.
    session.on(voice.AgentSessionEventTypes.EotPrediction, (ev: any) => {
      console.log('[VOICE] EotPrediction:', JSON.stringify(ev));
    });

    // Conversation item added (assistant/user turns committed to chatCtx).
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev: any) => {
      console.log('[VOICE] ConversationItemAdded role=', ev.item?.role, 'content=', JSON.stringify(typeof ev.item?.content === 'string' ? ev.item.content : (Array.isArray(ev.item?.content) ? ev.item.content.map((c: any) => c.text).join(' ') : '')));
    });

    // Speech created (TTS job queued).
    session.on(voice.AgentSessionEventTypes.SpeechCreated, (ev: any) => {
      console.log('[VOICE] SpeechCreated');
    });

    // [DATACH-FALLBACK] Publish TTS PCM over the LiveKit Data channel as RAW
    // Int16 chunks (NOT standalone WAVs). Each message carries a 5-byte header
    // [0x01, seqHi, seqLo, lastFlag, ch]; the widget concatenates ALL chunks of
    // one utterance into a single AudioBuffer and plays it ONCE. This avoids the
    // garbled "multiple fast voices" caused by playing many tiny WAV clips.
    async function publishWav(text: string): Promise<void> {
      bargeInRequested = false; // new utterance starting — reset barge-in
      (publishWav as any)._last ??= '';
      (publishWav as any)._ts ??= 0;
      const t = (text || '').trim();
      if (!t) return;
      const now = Date.now();
      if ((publishWav as any)._last === t && now - ((publishWav as any)._ts || 0) < 1500) return;
      (publishWav as any)._last = t;
      (publishWav as any)._ts = now;

      try {
        const sr = 24000;
        const ch = 1;
        const blockAlign = ch * 2;
        const MAX_PAYLOAD = 14000;
        const samplesPerChunk = Math.floor(MAX_PAYLOAD / blockAlign / 10) * 10;

        // Collect all frames first to know total length for last-flag accuracy,
        // but send each chunk immediately as it's ready — no waiting for full synthesis.
        const parts: Int16Array[] = [];
        let totalSamples = 0;

        for await (const item of fallbackTts.synthesize(t)) {
          if (bargeInRequested) {
            console.log('[BARGE-IN] synthesis aborted');
            // Send zero-sample last chunk so widget resets sequence state
            const buf = new ArrayBuffer(6);
            const dv = new DataView(buf);
            dv.setUint8(0, 0x01); dv.setUint16(1, 0, false);
            dv.setUint8(3, 1); dv.setUint8(4, 1); dv.setUint8(5, 0);
            await ctx.room.localParticipant.publishData(
              new Uint8Array(buf), { reliable: true, topic: 'agent-audio' }
            ).catch(() => {});
            return;
          }
          const frame: any = item && item.frame ? item.frame : item;
          if (!frame || !frame.data) continue;
          const pcm: Int16Array = frame.data;
          if (!pcm.length) continue;
          parts.push(pcm);
          totalSamples += pcm.length;
        }

        if (!totalSamples || bargeInRequested) return;

        // Merge into single buffer then stream chunks with correct last-flag
        const full = new Int16Array(totalSamples);
        let off = 0;
        for (const p of parts) { full.set(p, off); off += p.length; }

        let sent = 0;
        let seq = 0;
        while (sent < totalSamples) {
          if (bargeInRequested) {
            console.log('[BARGE-IN] chunk publishing aborted at seq', seq);
            // Send a last-flag chunk with zero samples so widget resets state cleanly
            const buf = new ArrayBuffer(6);
            const dv = new DataView(buf);
            dv.setUint8(0, 0x01);
            dv.setUint16(1, seq, false);
            dv.setUint8(3, 1); // last flag
            dv.setUint8(4, ch);
            dv.setUint8(5, 0);
            await ctx.room.localParticipant.publishData(
              new Uint8Array(buf),
              { reliable: true, topic: 'agent-audio' }
            ).catch(() => {});
            return;
          }
          const n = Math.min(samplesPerChunk, totalSamples - sent);
          const isLast = sent + n >= totalSamples;
          const dataSize = n * blockAlign;
          const buf = new ArrayBuffer(6 + dataSize);
          const dv = new DataView(buf);
          dv.setUint8(0, 0x01);
          dv.setUint16(1, seq, false);
          dv.setUint8(3, isLast ? 1 : 0);
          dv.setUint8(4, ch);
          dv.setUint8(5, 0);
          new Int16Array(buf, 6).set(full.subarray(sent, sent + n));
          await ctx.room.localParticipant.publishData(
            new Uint8Array(buf),
            { reliable: true, topic: 'agent-audio' }
          ).catch((e: any) => console.log('[DATACH-FB] publishData ERR', e?.message));
          sent += n;
          seq++;
        }
        console.log('[DATACH-FB] streamed', { seq, totalSamples });
      } catch (e: any) {
        console.log('[DATACH-FB] synthesize/publish ERR', e?.message);
      }
    }

    // AUDIO DISABLED (debug phase). We no longer publish TTS audio; instead we
    // stream transcripts over the Data channel so the widget can show the
    // conversation word-by-word. `replySpeaker` is kept (unused) for later.
    replySpeaker = publishWav;

    // Publish a small JSON text message on a data-channel topic the widget reads.
    const publishTranscript = (role: 'user' | 'assistant', text: string, final: boolean) => {
      try {
        const u8 = new TextEncoder().encode(JSON.stringify({ role, text, final }));
        ctx.room.localParticipant.publishData(u8, { reliable: false, topic: 'agent-transcript' })
          .catch((e: any) => console.log('[TRANSCRIPT] publish ERR', e && e.message));
      } catch (e: any) {
        console.log('[TRANSCRIPT] encode ERR', e && e.message);
      }
    };
    // Expose to the LeadPilotLLMStream constructor (separate scope) so it can
    // publish the AI reply transcript.
    publishTranscriptFn = publishTranscript;

    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev: any) => {
      console.log('[VOICE] AgentStateChanged:', ev.newState);
      if (ev.newState === 'speaking') {
        console.log('[Agent] Assistant is speaking...');
      }
    });

    session.on(voice.AgentSessionEventTypes.Error, (ev: any) => {
      console.log('[VOICE] Session Error:', JSON.stringify(ev?.error?.message ?? ev));
    });

    // Stream the visitor's recognized speech (interim + final) to the widget as
    // a transcript. AUDIO is disabled, so this is how the user sees what they said.
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev: any) => {
      const text = ev?.transcript ?? '';
      if (!text) return;
      console.log('[TRANSCRIPT] user', ev?.isFinal ? '(final)' : '(interim)', JSON.stringify(text));
      publishTranscript('user', text, !!ev?.isFinal);
    });

    // Track assistant audio track publication (LiveKit output stage).
    ctx.room.on('trackPublished', (pub: any) => {
      console.log('[VOICE] Track published by', pub?.participant?.identity, 'kind=', pub?.kind);
    });

    // Start session (preemptive generation disabled via AgentSession constructor).
    await session.start({
      agent: new voice.Agent({ instructions }),
      room: ctx.room,
    });

    console.log('[TRACE] SESSION CREATED for room:', roomName);
    console.log('[Agent] Session started, speaking welcome message:', welcomeMessage);

    // [STAGE9] Probe agent-side outbound RTP to confirm bytes are actually sent.
    const _probe = setInterval(async () => {
      try {
        const pubs = Array.from((ctx.room.localParticipant?.trackPublications ?? new Map()).values());
        for (const pub of pubs) {
          try {
            const stats = await pub.track?.getStats?.();
            let bytes = 0, packets = 0;
            for (const r of (stats?.as?.(undefined) ?? stats ?? [])) {
              if (r.type === 'outbound-rtp' || r.kind === 'audio') { bytes = r.bytesSent ?? r.bytes; packets = r.packetsSent ?? r.packets; }
            }
            console.log('[STAGE9] outbound-rtp', { trackSid: pub.trackSid, trackSid2: pub.track?.sid, kind: pub.kind, source: pub.source, bytes, packets, hasTrack: !!pub.track, trackEnabled: pub.track?.isEnabled, trackMuted: pub.track?.isMuted, pubSid: pub.sid });
          } catch (e) { console.log('[STAGE9] statErr', (e as Error).message); }
        }
      } catch (e) { console.log('[STAGE9] probeErr', (e as Error).message); }
    }, 1500);
    setTimeout(() => clearInterval(_probe), 20000).unref?.();

    ctx.room.on('localTrackPublished', (pub: any) => {
      console.log('[STAGE9b] localTrackPublished', { trackSid: pub.trackSid, sid: pub.sid, kind: pub.kind, source: pub.source, hasTrack: !!pub.track });
    });
    // FFI-level error surfacing
    try {
      const { FfiClient } = await import('@livekit/rtc-node') as any;
      FfiClient.instance.on('ffiError', (e: any) => console.log('[STAGE9c] FFI ERROR', JSON.stringify(e)));
    } catch (e) { console.log('[STAGE9c] ffiImportErr', (e as Error).message); }

    // Speak the greeting ONCE over the data channel via replySpeaker (the single
    // de-duplicated audio source). session.say is intentionally NOT used here:
    // the native source-encoder is silent on this platform, and routing the
    // greeting through both session.say and replySpeaker caused a double "Holaa".
    publishTranscript('assistant', welcomeMessage, true);
    if (replySpeaker) {
      await replySpeaker(welcomeMessage).catch((e: any) =>
        console.log('[DATACH-FB] greeting speak ERR', e && e.message)
      );
    }
    console.log('[TRACE] GREETING SENT:', welcomeMessage);

    // Save transcript on disconnect
    ctx.room.on('disconnected', async () => {
      clearInterval(_probe);
      ragCache.delete(roomName);
      const duration = Math.round((Date.now() - startTime) / 1000);

      const finalTranscript =
        transcript.length > 0
          ? transcript
          : session.chatCtx.items
              .filter((i: any) => i.role === 'user' || i.role === 'assistant')
              .map((i: any) => {
                let text = '';
                if (typeof i.content === 'string') text = i.content;
                else if (Array.isArray(i.content))
                  text = i.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
                return { role: i.role, content: text };
              })
              .filter((i: any) => i.content);

      await saveTranscript(roomName, finalTranscript, duration);
      console.log('[Agent] Room disconnected. Duration:', duration, 's');
    });
  },
});

cli.runApp(new WorkerOptions({ agent: __filename, agentName: 'leadpilot-agent' }));
