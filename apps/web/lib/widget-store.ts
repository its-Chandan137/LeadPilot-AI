import type { Project } from "@prisma/client";
import type { WidgetConfig } from "@leadpilot/types";
import { getDatabaseUrl, getSharedPrismaClient } from "@/lib/prisma";

type StoredProject = Pick<Project, "id" | "name" | "clientId" | "siteUrl" | "widgetConfig">;

type StoredConversation = {
  id: string;
  projectId: string;
  visitorId: string;
};

type WidgetConfigJson = {
  color?: string;
  botName?: string;
  welcomeMessage?: string;
  avatarUrl?: string;
  mode?: "chat" | "voice" | "both";
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
    mode: "chat"
  }
};

const memoryConversations = new Map<string, StoredConversation>();

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

  return {
    clientId: project.clientId,
    projectName: project.name,
    color: config.color ?? "#2563eb",
    botName: config.botName ?? "LeadPilot",
    welcomeMessage: config.welcomeMessage ?? "Hi! How can I help you today?",
    avatarUrl: config.avatarUrl,
    mode: (config.mode as "chat" | "voice" | "both") ?? "chat"
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
      return true;
    }

    if (!input.conversationId.startsWith("local-")) {
      return false;
    }

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

export async function listProjects() {
  const prisma = getPrisma();

  if (!prisma) {
    return [demoProject];
  }

  return prisma.project.findMany({
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
