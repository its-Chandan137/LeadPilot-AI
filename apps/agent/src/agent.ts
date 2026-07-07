import dotenv from "dotenv";
dotenv.config();

import {
  cli,
  defineAgent,
  JobContext,
  llm,
  WorkerOptions,
  multimodal,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import fetch from "node-fetch";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function getProjectConfig(roomName: string) {
  const baseUrl = requireEnv("LEADPILOT_API_URL");
  const res = await fetch(
    `${baseUrl}/api/voice/agent-config?roomName=${encodeURIComponent(roomName)}`
  );
  if (!res.ok) {
    return {
      botName: "Assistant",
      systemPrompt: "You are a helpful assistant.",
      welcomeMessage: "Hi! How can I help you today?",
      projectId: null,
    };
  }
  return res.json() as Promise<{
    botName: string;
    systemPrompt: string;
    welcomeMessage: string;
    projectId: string;
  }>;
}

async function getRAGContext(projectId: string, query: string): Promise<string> {
  try {
    const baseUrl = requireEnv("LEADPILOT_API_URL");
    const res = await fetch(`${baseUrl}/api/voice/rag-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, query }),
    });
    if (!res.ok) return "";
    const data = await res.json() as { context: string };
    return data.context || "";
  } catch {
    return "";
  }
}

async function saveTranscript(
  roomName: string,
  transcript: Array<{ role: string; content: string }>,
  duration: number
) {
  try {
    const baseUrl = requireEnv("LEADPILOT_API_URL");
    await fetch(`${baseUrl}/api/voice/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, transcript, duration }),
    });
  } catch (e) {
    console.error("Failed to save transcript:", e);
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const roomName = ctx.room.name as string;
    const startTime = Date.now();

    console.log(`Agent joined room: ${roomName}`);

    const config = await getProjectConfig(roomName);

    const buildSystemPrompt = async (userMessage?: string) => {
      let ragContext = "";
      if (config.projectId && userMessage) {
        ragContext = await getRAGContext(config.projectId, userMessage);
      }

      return `You are ${config.botName}, a helpful voice assistant.
${config.systemPrompt || ""}

${
  ragContext
    ? `Use the following knowledge base context to answer questions:\n\n${ragContext}\n\nIf the answer is not in the context, say you don't have that information but offer to help with something else.`
    : ""
}

Keep responses concise and conversational — this is a voice call, not a chat.
Speak naturally, avoid bullet points or markdown formatting.
English only.`;
    };

    const transcript: Array<{ role: string; content: string }> = [];

    const initialPrompt = await buildSystemPrompt();

    const model = new openai.realtime.RealtimeModel({
      modalities: ["text", "audio"],
      instructions: initialPrompt,
      voice: "alloy",
      temperature: 0.8,
      maxResponseOutputTokens: 4096,
      turnDetection: {
        type: "server_vad",
        threshold: 0.5,
        silence_duration_ms: 600,
        prefix_padding_ms: 300,
      },
    });

    const chatCtx = new llm.ChatContext();
    chatCtx.append({
      role: llm.ChatRole.ASSISTANT,
      text: config.welcomeMessage || "Hi! How can I help you today?",
    });

    const agent = new multimodal.MultimodalAgent({ model, chatCtx });

    let currentSession: any = null;

    agent.on("user_speech_committed", async (msg: any) => {
      const userText = msg.content;
      if (typeof userText !== "string") return;

      transcript.push({ role: "user", content: userText });

      const updatedPrompt = await buildSystemPrompt(userText);
      if (currentSession) {
        currentSession.sessionUpdate({
          modalities: ["text", "audio"],
          instructions: updatedPrompt,
        });
      }
    });

    agent.on("agent_speech_committed", (msg: any) => {
      const assistantText = msg.content;
      if (typeof assistantText === "string") {
        transcript.push({ role: "assistant", content: assistantText });
      }
    });

    currentSession = await agent.start(ctx.room);

    ctx.room.on("disconnected", async () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      await saveTranscript(roomName, transcript, duration);
      console.log(`Room ${roomName} disconnected. Transcript saved.`);
    });
  },
});

cli.runApp(new WorkerOptions({ agent: __filename }));
