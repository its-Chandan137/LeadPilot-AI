import { getSharedPrismaClient } from "@/lib/prisma";
import { getAllPersisted, getAllPersistedForProject } from "@/lib/intelligence-store";
import type { ActivityEvent } from "./types";

function importanceLabel(n: number): string {
  if (n >= 3) return "high";
  if (n === 2) return "medium";
  return "low";
}

function titleFor(event: string, who: string, company: string | null): string {
  const subject = who || company || "A visitor";
  switch (event) {
    case "Visitor Started Conversation":
      return `${subject} started a conversation`;
    case "Shared Name":
      return `${subject} shared their name`;
    case "Shared Email":
      return `Email collected from ${subject}`;
    case "Shared Phone":
      return `Phone collected from ${subject}`;
    case "Shared Company":
      return `${company ?? subject} was identified`;
    case "Mentioned Budget":
      return `${subject} mentioned a budget`;
    case "Mentioned Timeline":
      return `${subject} mentioned a timeline`;
    case "Asked Pricing":
      return `${subject} requested pricing`;
    case "Asked About Features":
      return `${subject} explored features`;
    case "Asked Booking":
      return `${subject} asked about booking`;
    case "Requested Demo":
      return `Demo requested (${subject})`;
    case "Requested Contact":
      return `Contact requested (${subject})`;
    case "Qualified Warm":
      return `${subject} became a Warm Lead`;
    case "Qualified Hot":
      return `${subject} became a Hot Lead`;
    default:
      return `${subject}: ${event}`;
  }
}

export async function getActivityFeed(opts: {
  workspaceId: string;
  projectIds: string[];
  projectId?: string;
  limit?: number;
}): Promise<ActivityEvent[]> {
  const prisma = getSharedPrismaClient();

  const records =
    opts.projectId
      ? await getAllPersistedForProject(opts.projectId)
      : (await getAllPersisted()).filter(
          (r) => !r.projectId || opts.projectIds.includes(r.projectId)
        );

  // Context: lead name per conversationId, and project name per projectId.
  const leads = await prisma.lead.findMany({
    where: { project: { workspaceId: opts.workspaceId } },
    select: { conversationId: true, name: true },
    take: 5000
  });
  const leadNameByConv = new Map<string, string | null>();
  for (const l of leads) if (l.conversationId) leadNameByConv.set(l.conversationId, l.name);

  const projects = await prisma.project.findMany({
    where: opts.projectId ? { id: opts.projectId } : { workspaceId: opts.workspaceId },
    select: { id: true, name: true }
  });
  const projectNameById = new Map<string, string>(projects.map((p) => [p.id, p.name]));

  const events: ActivityEvent[] = [];
  for (const rec of records) {
    const leadName = leadNameByConv.get(rec.conversationId) ?? null;
    const company = rec.business?.company ?? null;
    const projectName = rec.projectId ? projectNameById.get(rec.projectId) ?? null : null;
    for (const e of rec.timeline) {
      events.push({
        id: `${rec.conversationId}-${e.timestamp}-${e.event}`,
        conversationId: rec.conversationId,
        visitorId: rec.conversationId,
        projectId: rec.projectId ?? null,
        projectName,
        leadName,
        title: titleFor(e.event, leadName ?? "", company),
        description: e.description,
        category: e.category,
        timestamp: e.timestamp,
        importance: importanceLabel(e.importance)
      });
    }
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, opts.limit ?? 20);
}
