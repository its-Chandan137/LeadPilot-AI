import type { Project } from "@prisma/client";
import { normalizeWidgetMode, normalizeWidgetTemplate, defaultTemplateFor, type WidgetConfig } from "@leadpilot/types";
import { getDatabaseUrl, getSharedPrismaClient } from "@/lib/prisma";

type StoredProject = Pick<Project, "id" | "name" | "clientId" | "siteUrl" | "widgetConfig">;

type StoredConversation = {
  id: string;
  projectId: string;
  visitorId: string;
};

// A single turn as understood by the chat model. Roles are limited to the two
// roles the assistant actually participates in.
type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type WidgetConfigJson = {
  color?: string;
  botName?: string;
  welcomeMessage?: string;
  avatarUrl?: string;
  showBranding?: boolean;
  fontFamily?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  mode?: "chat" | "voice" | "both";
  template?: string;
  livekitUrl?: string;
  provider?: "groq" | "livekit-openai" | "sarvam";
  traffic?: {
    blockedReferrers?: string[];
    blockedPaths?: string[];
  };
};

const demoProject: StoredProject = {
  id: "demo-project",
  name: "Acme Services",
  clientId: "demo-client-id",
  siteUrl: "https://acme.com",
  widgetConfig: {
    color: "#2563eb",
    botName: "Ava",
    welcomeMessage: "Hi! I can help you choose the right service.",
    mode: "chat",
    template: "chatonly-classic",
    provider: "groq"
  }
};

const memoryConversations = new Map<string, StoredConversation>();

// In-memory transcript per conversation (used only when no database is configured).
const memoryMessages = new Map<string, HistoryMessage[]>();

// Maximum number of prior turns to send to the model. Kept as a single source of
// truth so the limit is easy to tune in one place.
const CONVERSATION_HISTORY_LIMIT = Number(
  process.env.MAX_HISTORY_MESSAGES ?? 20
);

function getPrisma() {
  if (!getDatabaseUrl()) {
    return null;
  }

  return getSharedPrismaClient();
}

function asWidgetConfigJson(value: unknown): WidgetConfigJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as WidgetConfigJson;
}

export function toWidgetConfig(project: StoredProject): WidgetConfig {
  const config = asWidgetConfigJson(project.widgetConfig);
  const mode = normalizeWidgetMode(config.mode);

  return {
    clientId: project.clientId,
    projectName: project.name,
    color: config.color ?? "#2563eb",
    botName: config.botName ?? "LeadPilot",
    welcomeMessage: config.welcomeMessage ?? "Hi! How can I help you today?",
    avatarUrl: config.avatarUrl,
    showBranding: config.showBranding ?? true,
    fontFamily: config.fontFamily,
    headerTitle: config.headerTitle,
    headerSubtitle: config.headerSubtitle,
    mode,
    template: config.template
      ? normalizeWidgetTemplate(config.template, mode)
      : defaultTemplateFor(mode),
    livekitUrl: config.livekitUrl || process.env.LIVEKIT_URL || "wss://your-app.livekit.cloud",
    provider: config.provider ?? "groq",
  };
}

export async function findProjectByClientId(clientId: string) {
  const prisma = getPrisma();

  if (!prisma) {
    return clientId === demoProject.clientId ? demoProject : null;
  }

  return prisma.project.findUnique({
    where: { clientId },
    select: {
      id: true,
      name: true,
      clientId: true,
      siteUrl: true,
      widgetConfig: true
    }
  });
}

export async function createConversation(clientId: string, visitorId: string) {
  const project = await findProjectByClientId(clientId);

  if (!project) {
    return null;
  }

  const prisma = getPrisma();

  if (!prisma) {
    const conversation: StoredConversation = {
      id: `local-${crypto.randomUUID()}`,
      projectId: project.id,
      visitorId
    };
    memoryConversations.set(conversation.id, conversation);
    return conversation.id;
  }

  const conversation = await prisma.conversation.create({
    data: {
      projectId: project.id,
      visitorId
    },
    select: {
      id: true
    }
  });

  return conversation.id;
}

export async function saveChatTurn(input: {
  clientId: string;
  visitorId: string;
  conversationId: string;
  message: string;
  reply: string;
}) {
  const project = await findProjectByClientId(input.clientId);

  if (!project) {
    return false;
  }

  const prisma = getPrisma();

  if (!prisma) {
    const existing = memoryConversations.get(input.conversationId);
    if (existing && existing.projectId === project.id && existing.visitorId === input.visitorId) {
      recordMemoryTurn(input.conversationId, input.message, input.reply);
      return true;
    }

    if (!input.conversationId.startsWith("local-")) {
      return false;
    }

    recordMemoryTurn(input.conversationId, input.message, input.reply);
    return true;
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: input.conversationId,
      projectId: project.id,
      visitorId: input.visitorId
    },
    select: { id: true }
  });

  if (!conversation) {
    return false;
  }

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: "USER",
        content: input.message
      }
    }),
    prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: "ASSISTANT",
        content: input.reply
      }
    })
  ]);

  return true;
}

// Records a user/assistant turn into the in-memory transcript (no-database mode).
function recordMemoryTurn(conversationId: string, message: string, reply: string) {
  const turns = memoryMessages.get(conversationId) ?? [];
  turns.push({ role: "user", content: message });
  turns.push({ role: "assistant", content: reply });
  memoryMessages.set(conversationId, turns);
}

// Returns the chronological transcript for a conversation, limited to the most
// recent turns so the request stays bounded.
export async function getConversationHistory(
  conversationId: string,
  limit = CONVERSATION_HISTORY_LIMIT
): Promise<HistoryMessage[]> {
  const prisma = getPrisma();

  if (!prisma) {
    const turns = memoryMessages.get(conversationId) ?? [];
    return turns.slice(-limit);
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { role: true, content: true }
  });

  return messages.map((m) => ({
    role: m.role === "ASSISTANT" ? "assistant" : "user",
    content: m.content
  }));
}

/**
 * Channel-agnostic history loader + writer.
 *
 * Chat persists to the `Message` table; Voice persists to the `VoiceMessage`
 * table. Both channels share the SAME conversation-memory store and the SAME
 * AI brain, so the only difference is which transcript table backs a given
 * conversation. These helpers let the voice endpoint reuse the exact same
 * history semantics as chat without duplicating the logic.
 */
export type ConversationChannel = "chat" | "voice";

export async function getChannelHistory(
  conversationId: string,
  channel: ConversationChannel,
  limit = CONVERSATION_HISTORY_LIMIT
): Promise<HistoryMessage[]> {
  if (channel === "chat") {
    return getConversationHistory(conversationId, limit);
  }

  const prisma = getPrisma();
  if (!prisma) {
    const turns = memoryMessages.get(conversationId) ?? [];
    return turns.slice(-limit);
  }

  const messages = await prisma.voiceMessage.findMany({
    where: { voiceConversationId: conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { role: true, content: true }
  });

  return messages.map((m) => ({
    role: m.role === "ASSISTANT" ? "assistant" : "user",
    content: m.content
  }));
}

/**
 * Persists a user/assistant turn for the given channel. Returns false if the
 * conversation does not exist (or, in no-database mode, is not a local id).
 */
export async function saveChannelTurn(input: {
  conversationId: string;
  channel: ConversationChannel;
  message: string;
  reply: string;
}): Promise<boolean> {
  if (input.channel === "chat") {
    return saveChatTurn({
      clientId: "",
      visitorId: "",
      conversationId: input.conversationId,
      message: input.message,
      reply: input.reply
    });
  }

  const prisma = getPrisma();
  if (!prisma) {
    recordMemoryTurn(input.conversationId, input.message, input.reply);
    return true;
  }

  const conversation = await prisma.voiceConversation.findUnique({
    where: { id: input.conversationId },
    select: { id: true }
  });
  if (!conversation) return false;

  await prisma.$transaction([
    prisma.voiceMessage.create({
      data: {
        voiceConversationId: input.conversationId,
        role: "USER",
        content: input.message
      }
    }),
    prisma.voiceMessage.create({
      data: {
        voiceConversationId: input.conversationId,
        role: "ASSISTANT",
        content: input.reply
      }
    })
  ]);

  return true;
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  siteUrl: string;
  widgetConfig?: WidgetConfigJson;
}): Promise<StoredProject | null> {
  const prisma = getPrisma();

  if (!prisma) {
    return {
      id: `local-${crypto.randomUUID()}`,
      name: input.name,
      clientId: `local-client-${crypto.randomUUID()}`,
      siteUrl: input.siteUrl,
      widgetConfig: input.widgetConfig ?? {}
    };
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      siteUrl: input.siteUrl,
      clientId: crypto.randomUUID(),
      widgetConfig: input.widgetConfig ?? {}
    },
    select: {
      id: true,
      name: true,
      clientId: true,
      siteUrl: true,
      widgetConfig: true
    }
  });

  return project;
}

export async function listProjects(workspaceId?: string | null) {
  const prisma = getPrisma();

  if (!prisma) {
    return [demoProject];
  }

  if (!workspaceId) {
    return [];
  }

  return prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      siteUrl: true,
      clientId: true,
      widgetConfig: true
    }
  });
}
