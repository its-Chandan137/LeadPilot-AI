import { Prisma } from "@prisma/client";
import { getSharedPrismaClient } from "@/lib/prisma";
import { getPersistedIntelligence } from "./intelligence";
import type {
  EnrichedLead,
  LeadQuery,
  LeadFilters,
  ProjectRef
} from "./types";

type RawLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visitorId: string;
  score: string;
  status: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  conversationId: string | null;
  project: ProjectRef;
};

function dateCondition(dateRange?: string): Prisma.Sql | null {
  if (dateRange === "today") return Prisma.sql`l."createdAt" >= CURRENT_DATE`;
  if (dateRange === "7days") return Prisma.sql`l."createdAt" >= CURRENT_DATE - INTERVAL '7 days'`;
  if (dateRange === "30days") return Prisma.sql`l."createdAt" >= CURRENT_DATE - INTERVAL '30 days'`;
  return null;
}

async function fetchRawLeads(workspaceId: string, opts: LeadQuery): Promise<RawLead[]> {
  const prisma = getSharedPrismaClient();
  const conditions: Prisma.Sql[] = [Prisma.sql`p."workspaceId" = ${workspaceId}`];
  if (opts.projectId) conditions.push(Prisma.sql`l."projectId" = ${opts.projectId}`);
  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(Prisma.sql`(
      l.name ILIKE ${term} OR l.email ILIKE ${term} OR l.phone ILIKE ${term}
      OR l."visitorId" ILIKE ${term} OR p.name ILIKE ${term}
    )`);
  }
  if (opts.status) conditions.push(Prisma.sql`l.status = CAST(${opts.status} AS "LeadStatus")`);
  if (opts.score) conditions.push(Prisma.sql`l.score = CAST(${opts.score} AS "LeadScore")`);
  const dc = dateCondition(opts.dateRange);
  if (dc) conditions.push(dc);
  const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  return prisma.$queryRaw<RawLead[]>`
    SELECT l.id, l.name, l.email, l.phone, l."visitorId",
           l.score, l.status, l.source, l."createdAt", l."updatedAt",
           l."conversationId",
           json_build_object('id', p.id, 'name', p.name) AS project
    FROM "Lead" l
    JOIN "Project" p ON l."projectId" = p.id
    ${where}
    ORDER BY l."createdAt" DESC
  `;
}

function matchesFilters(lead: EnrichedLead, f?: LeadFilters): boolean {
  if (!f) return true;
  const intel = lead.intelligence;
  if (f.qualification && (intel.lead?.qualification ?? "") !== f.qualification) return false;
  if (f.industry && (intel.business?.industry ?? "") !== f.industry) return false;
  if (f.businessType && (intel.business?.businessType ?? "") !== f.businessType) return false;
  if (f.visitorStage && (intel.lead?.visitorStage ?? "") !== f.visitorStage) return false;
  if (f.goal && (intel.lead?.currentGoal ?? "") !== f.goal) return false;
  if (f.strategy && (intel.lead?.currentStrategy ?? "") !== f.strategy) return false;
  if (f.mission && (intel.lead?.currentMission ?? "") !== f.mission) return false;
  if (f.recommendedAction && (intel.lead?.recommendedAction ?? "") !== f.recommendedAction) return false;
  if (f.engagementMin != null) {
    const eng = intel.conversation?.engagementScore ?? -1;
    if (eng < f.engagementMin) return false;
  }
  if (f.conversationQuality && (intel.conversation?.conversationQuality ?? "") !== f.conversationQuality) return false;
  if (f.product) {
    const products = intel.business?.products ?? intel.conversation?.productsDiscussed ?? [];
    if (!products.some((p) => p === f.product)) return false;
  }
  if (f.painPoint) {
    const pains = intel.conversation?.painPoints ?? [];
    if (!pains.some((p) => p === f.painPoint)) return false;
  }
  if (f.hasTimeline && (!intel.timeline || intel.timeline.length === 0)) return false;
  return true;
}

async function toEnriched(raw: RawLead): Promise<EnrichedLead> {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    visitorId: raw.visitorId,
    score: raw.score,
    status: raw.status,
    source: raw.source,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    project: raw.project,
    conversationId: raw.conversationId,
    intelligence: await getPersistedIntelligence(raw.conversationId)
  };
}

export interface EnrichedLeadsResult {
  leads: EnrichedLead[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export async function getEnrichedLeads(opts: LeadQuery): Promise<EnrichedLeadsResult> {
  const raw = await fetchRawLeads(opts.workspaceId, opts);
  const allEnriched = await Promise.all(raw.map(toEnriched));
  const enriched = allEnriched.filter((l) => matchesFilters(l, opts.filters));

  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const leads = enriched.slice(start, start + limit);

  return { leads, total, totalPages, page, limit };
}

export async function getEnrichedLead(
  leadId: string,
  workspaceId: string
): Promise<EnrichedLead | null> {
  const prisma = getSharedPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, project: { workspaceId } },
    include: { project: { select: { id: true, name: true } } }
  });
  if (!lead) return null;

  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    visitorId: lead.visitorId,
    score: lead.score,
    status: lead.status,
    source: lead.source,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    project: lead.project,
    conversationId: lead.conversationId,
    intelligence: await getPersistedIntelligence(lead.conversationId)
  };
}
