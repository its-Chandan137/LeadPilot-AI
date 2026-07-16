import { fileURLToPath } from 'url';
import { WorkerOptions, cli, defineAgent, JobContext, voice, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import util from 'node:util';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const REQUIRED_ENV_VARS = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'OPENAI_API_KEY',
];

/**
 * Validate that every required environment variable is set and non-empty.
 *
 * This is a pre-flight check: catching problems here (before any network I/O)
 * produces a clear, actionable error instead of a cryptic failure partway
 * through the agent startup sequence.
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
    const json = await res.json() as { success: boolean; data: { botName: string; systemPrompt: string; welcomeMessage: string; projectId: string } };
    return json.data ?? null;
  } catch (err) {
    console.error('[Agent] getProjectConfig failed:', err);
    return null;
  }
}

// Fetch RAG context from LeadPilot backend
async function getRAGContext(projectId: string, query: string): Promise<string> {
  try {
    const res = await fetch(`${LEADPILOT_API_URL}/api/voice/rag-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, query }),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) {
      return '';
    }
    const data = await res.json() as { context: string };
    return data.context ?? '';
  } catch {
    return '';
  }
}

// Save transcript to LeadPilot webhook
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

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const roomName = ctx.room.name;
    const startTime = Date.now();
    console.log('[Agent] Entry called for room:', roomName);

    // ─── Startup diagnostics ───────────────────────────────────────────────────
    // Printed on every successful connect so operators can verify the agent's
    // configuration at a glance — without leaking any secret material.
    const NODE_VERSION = process.version;
    const ENVIRONMENT = process.env.NODE_ENV || 'development';

    // LIVEKIT_URL is non-sensitive so we show it directly. The API / secret
    // keys are redacted (Present / Missing only) to avoid accidental log
    // leakage in shared systems or CI pipelines.
    const envDiagnostics: Record<string, 'Present' | 'Missing'> = {
      LIVEKIT_URL: LIVEKIT_URL ? 'Present' : 'Missing',
      LIVEKIT_API_KEY:
        (process.env.LIVEKIT_API_KEY ?? '').trim() ? 'Present' : 'Missing',
      LIVEKIT_API_SECRET:
        (process.env.LIVEKIT_API_SECRET ?? '').trim() ? 'Present' : 'Missing',
      OPENAI_API_KEY: (process.env.OPENAI_API_KEY ?? '').trim() ? 'Present' : 'Missing',
    };

    console.log([
      '========== LEADPILOT AGENT ==========',
      `Agent started successfully`,
      `Environment: ${ENVIRONMENT}`,
      `Node: ${NODE_VERSION}`,
      `LiveKit: Connected`,
      `OpenAI Key: ${envDiagnostics.OPENAI_API_KEY}`,
      `Realtime Model: gpt-realtime (default)`,
      '=====================================',
    ].join('\n'));
    // ─── End startup diagnostics ───────────────────────────────────────────────

    // Parse dispatch metadata
    let projectId: string | null = null;
    try {
      if (ctx.job.metadata) {
        const meta = JSON.parse(ctx.job.metadata);
        projectId = meta.projectId ?? null;
      }
    } catch {
      console.log('[Agent] No dispatch metadata');
    }

    // Fetch project config
    const config = await getProjectConfig(roomName);
    const botName = config?.botName ?? 'LeadPilot Assistant';
    const welcomeMessage = config?.welcomeMessage ?? 'Hi! How can I help you today?';
    const customSystemPrompt = config?.systemPrompt ?? '';
    const resolvedProjectId = projectId ?? config?.projectId ?? null;

    console.log('[Agent] Config loaded:', botName);

    // Build system prompt
    const buildSystemPrompt = async (userMessage?: string) => {
      let ragContext = '';
      if (resolvedProjectId && userMessage) {
        ragContext = await getRAGContext(resolvedProjectId, userMessage);
      }
      return `You are ${botName}, a helpful voice assistant.
${customSystemPrompt}
${ragContext ? `Use the following knowledge base context to answer questions:\n\n${ragContext}\n\nIf the answer is not in the context, say you don't have that information but offer to help with something else.` : ''}
Keep responses concise and conversational — this is a voice call, not a chat.
Speak naturally. Avoid bullet points or markdown. English only.`;
    };

    const instructions = await buildSystemPrompt();

    // Transcript accumulator
    const transcript: Array<{ role: string; content: string }> = [];

    // Create AgentSession with OpenAI Realtime
    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        model: 'gpt-realtime',
        voice: 'alloy',
        temperature: 0.8,
        turnDetection: {
          type: 'server_vad',
          threshold: 0.5,
          silence_duration_ms: 600,
          prefix_padding_ms: 300,
        },
      }),
    });

    // ─── Realtime session error handler ───────────────────────────────────────
    // The OpenAI Realtime WebSocket can emit errors at any time (quota exceeded,
    // invalid key, rate-limit, server error, network failure, etc.). LiveKit's
    // AgentSession surfaces these via its own Error event; additionally, the
    // underlying WebSocket can trigger Node's unhandledRejection or
    // uncaughtException mechanism if a callback in the error path throws.
    //
    // Without explicit handling this crashes the worker — and because the agent
    // runs as a dispatched LiveKit worker, a crash is invisible to operators
    // and goes uncounted. We log a structured, actionable message instead, and
    // keep the Node process alive for every error that is *plausibly* caused by
    // the Realtime session so the worker can continue serving other rooms.
    const FRIENDLY_MESSAGES: Record<string, string> = {
      insufficient_quota:
        'OpenAI billing/quota exceeded. Check your API credits.',
      invalid_api_key:
        'Invalid OpenAI API key.',
      rate_limit_exceeded:
        'OpenAI rate limit exceeded.',
      authentication_error:
        'Authentication failed. Verify your OpenAI API key.',
      model_not_found:
        'The configured model does not exist or your account cannot access it.',
      invalid_request_error:
        'The request sent to OpenAI is invalid.',
      server_error:
        'OpenAI server error. Please try again in a few moments.',
    };

    // Strings that indicate a network / DNS / socket-level failure originating
    // from Node's http/https layer rather than from the OpenAI API itself.
    const NETWORK_ERROR_PATTERN =
      /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network|socket hang up/i;

    const OPENAI_REALTIME_ERROR_PATTERN = /openai|realtime|rtc/i;

    // OpenAI API errors that, by nature of the problem, cannot self-recover.
    // We surface these with Recoverable: false so a human operator knows to
    // intervene (e.g. rotate a key) before retrying.
    const NON_RECOVERABLE_TYPES = new Set([
      'invalid_api_key',
      'authentication_error',
    ]);

    /**
     * Recursively unwrap a nested error object.
     *
     * The LiveKit AgentSession Error event wraps the real OpenAI error one or
     * two levels deep (typically under an `error` key that itself looks like
     * `{ type: 'error', error: <real OpenAI error> }`). This helper follows
     * that chain until it reaches an object that has its own `type`/`message`
     * that is not the generic sentinel 'error', or until a depth guard is hit.
     */
    const unwrapError = (
      err: unknown,
      depth = 0
    ): Record<string, unknown> => {
      const MAX_DEPTH = 5;
      if (depth > MAX_DEPTH) return err as Record<string, unknown>;

      if (!err || typeof err !== 'object') return { message: String(err) };

      const asRecord = err as Record<string, unknown>;
      const rawType = (asRecord.type as string) || '';
      const hasMessage = typeof asRecord.message === 'string';
      const nested = asRecord.error;

      // An object whose type is 'error' with a nested .error is a wrapper —
      // keep descending so we find the real OpenAI error body.
      if (rawType.toLowerCase() === 'error' && nested) {
        return unwrapError(nested, depth + 1);
      }

      // If we found something with its own message and a non-generic type,
      // this is likely the real OpenAI error.
      if (hasMessage && rawType && rawType.toLowerCase() !== 'error') {
        return asRecord;
      }

      // If the type is 'error' but nothing is nested, that's the terminal leaf.
      if (rawType.toLowerCase() === 'error' && !nested && hasMessage) {
        return asRecord;
      }

      // If there is a nested error but nothing meaningful at this level, recurse.
      if (nested) {
        return unwrapError(nested, depth + 1);
      }

      return asRecord;
    };

    const logRealtimeError = (err: unknown) => {
      const raw = unwrapError(err);
      const type =
        (raw.type as string) ||
        (raw.code as string) ||
        (raw.name as string) ||
        'unknown';
      const code = (raw.code as string) || (raw.type as string) || '';
      const rawMessage = (raw.message as string) || String(err);

      const isNetworkError = NETWORK_ERROR_PATTERN.test(rawMessage);
      const friendlyMessage = FRIENDLY_MESSAGES[type] || (isNetworkError
        ? 'Unable to reach OpenAI. Check your internet connection or OpenAI service status.'
        : rawMessage);

      const isRecoverable = !NON_RECOVERABLE_TYPES.has(type);

      const timestamp = new Date().toISOString();
      const header = [
        '========== OPENAI REALTIME ERROR ==========',
        `Time: ${timestamp}`,
        `Type: ${type}`,
        code ? `Code: ${code}` : '',
        `Message: ${friendlyMessage}`,
        `Recoverable: ${isRecoverable}`,
        '===========================================',
      ].filter(Boolean).join('\n');

      console.error(header);
      console.error('\nRaw Error:');
      // util.inspect preserves non-enumerable properties (e.g. stack traces)
      // and nested objects without requiring JSON serialization.
      console.error(
        util.inspect(err, {
          depth: null,
          colors: true,
          showHidden: true,
          compact: false,
        })
      );
    };

    /**
     * Returns true when the error message or structure suggests the failure
     * originated from the OpenAI Realtime session (or its underlying WebSocket
     * transport) rather than from an unrelated part of the application.
     *
     * We restrict suppression to this narrow band so that genuine bugs (an
     * unhandled TypeError in business logic, a bad config access, etc.) still
     * crash the process and surface during development.
     */
    const isRealtimeError = (err: Error): boolean =>
      OPENAI_REALTIME_ERROR_PATTERN.test(err.message) ||
      err.message.includes('WebSocket') ||
      err.message.includes('realtime');

    session.on(voice.AgentSessionEventTypes.Error, (err: unknown) => {
      logRealtimeError(err);
    });

    // Safety net: the RealtimeModel uses a WebSocket internally, and some error
    // paths resolve or reject a promise without the library ever emitting an
    // AgentSession Error event. unhandledRejection catches those.
    process.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      if (isRealtimeError(err)) {
        logRealtimeError(err);
      }
      // Non-Realtime rejections are intentionally NOT caught here so the
      // standard Node.js unhandledRejection warning/exit behaviour fires.
    });

    // Final backstop: in rare cases the library's internal callback throws
    // synchronously, bypassing both the event emitter and promise machinery.
    // We intercept those exclusively for Realtime-originated errors so the
    // worker stays alive. Anything unrelated is re-thrown to preserve
    // fail-fast semantics for genuine application bugs.
    process.on('uncaughtException', (err: Error) => {
      if (isRealtimeError(err)) {
        logRealtimeError(err);
        return;
      }
      throw err;
    });
    // ─── End Realtime session error handler ───────────────────────────────────

    // Listen for user transcription for live logging
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev: any) => {
      if (ev.isFinal && ev.transcript) {
        console.log('[Agent] User said:', ev.transcript);
      }
    });

    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev: any) => {
      if (ev.newState === 'speaking') {
        console.log('[Agent] Assistant is speaking...');
      }
    });

    // Start session
    await session.start({
      agent: new voice.Agent({ instructions }),
      room: ctx.room,
    });

    console.log('[Agent] Session started, speaking welcome message:', welcomeMessage);

    // Speak welcome message
    await session.generateReply({
      instructions: `Greet the user with exactly this message: "${welcomeMessage}"`,
    });

    // Save transcript on disconnect
    ctx.room.on('disconnected', async () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      const finalTranscript = session.chatCtx.items
        .filter((i: any) => i.role === 'user' || i.role === 'assistant')
        .map((i: any) => {
          let text = '';
          if (typeof i.content === 'string') {
            text = i.content;
          } else if (Array.isArray(i.content)) {
            text = i.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
          }
          return { role: i.role, content: text };
        })
        .filter((i: any) => i.content);

      await saveTranscript(roomName, finalTranscript, duration);
      console.log('[Agent] Room disconnected. Duration:', duration, 's');
    });
  },
});

cli.runApp(new WorkerOptions({ agent: __filename, agentName: 'leadpilot-agent' }));
