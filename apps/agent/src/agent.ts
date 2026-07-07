import { fileURLToPath } from 'url';
import { WorkerOptions, cli, defineAgent, JobContext, voice, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);

// Validate required env vars
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LEADPILOT_API_URL = process.env.LEADPILOT_API_URL ?? 'http://localhost:3000';

if (!LIVEKIT_URL || !OPENAI_API_KEY) {
  throw new Error('Missing required env vars: LIVEKIT_URL, OPENAI_API_KEY');
}

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
