import { getSharedPrismaClient } from "@/lib/prisma";

export type ReferrerHit = {
  referrer: string;
  path?: string;
  occurredAt: string;
};

export type ReferrerGroup = {
  domain: string;
  count: number;
  lastSeen: string;
  blocked: boolean;
};

export type AnalyticsData = {
  totals: {
    conversations: number;
    leads: number;
    uniqueReferrers: number;
  };
  hits: ReferrerHit[];
  groups: ReferrerGroup[];
};

const DIRECT_LABEL = "Direct / none";

// Server-only. Reads WidgetTraffic rows (capture-time normalized domains)
// and groups them by domain. `blockedReferrers` are the admin-managed,
// already-normalized domains from the project's widgetConfig.traffic.
export async function getTrafficAnalytics(
  projectId: string,
  blockedReferrers: string[]
): Promise<AnalyticsData> {
  const prisma = getSharedPrismaClient();
  const blocked = new Set(blockedReferrers.map((d) => d.toLowerCase()));

  const [groupRows, hitRows, conversations, leads] = await Promise.all([
    prisma.widgetTraffic.groupBy({
      by: ["referrerDomain"],
      where: { projectId },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.widgetTraffic.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { referrer: true, path: true, createdAt: true },
    }),
    prisma.conversation.count({ where: { projectId } }),
    prisma.lead.count({ where: { projectId } }),
  ]);

  const groups: ReferrerGroup[] = groupRows
    .map((g) => {
      const domain = g.referrerDomain ?? DIRECT_LABEL;
      return {
        domain,
        count: g._count._all,
        lastSeen: (g._max.createdAt ?? new Date()).toISOString(),
        blocked:
          domain !== DIRECT_LABEL && blocked.has(domain.toLowerCase()),
      };
    })
    .sort((a, b) => b.count - a.count);

  const hits: ReferrerHit[] = hitRows.map((h) => ({
    referrer: h.referrer ?? "",
    path: h.path ?? undefined,
    occurredAt: h.createdAt.toISOString(),
  }));

  const uniqueReferrers = groupRows.filter((g) => g.referrerDomain != null).length;

  return {
    totals: { conversations, leads, uniqueReferrers },
    hits,
    groups,
  };
}
