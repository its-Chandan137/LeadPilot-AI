import type { PersistedConversation } from "@/lib/intelligence-store";
import type { LeadMetrics, FunnelStage, NamedValue } from "./types";
import { safeMean, bucketScore, topN, countBy, capitalize, isQualified } from "./util";

function funnelStage(label: string, value: number, base: number): FunnelStage {
  return {
    label,
    value,
    conversion: base > 0 ? Math.round((value / base) * 100) : 0
  };
}

function isContactReady(record: PersistedConversation): boolean {
  const action = (record.lead?.recommendedAction ?? "").toLowerCase();
  const stage = (record.lead?.visitorStage ?? "").toLowerCase();
  return (
    action.includes("contact") ||
    action.includes("demo") ||
    stage.includes("ready") ||
    stage.includes("contact")
  );
}

export function calculateLeadMetrics(records: PersistedConversation[]): LeadMetrics {
  const leads = records.filter((r) => r.lead);
  const conversations = records.filter((r) => r.conversation);

  const total = records.length;
  const engaged = conversations.filter((r) => r.conversation!.engagementScore >= 40).length;
  const qualified = leads.filter((r) => isQualified(r.lead!.qualification)).length;
  const hot = leads.filter((r) => (r.lead!.qualification ?? "").toLowerCase() === "hot").length;
  const contactReady = leads.filter(isContactReady).length;

  const funnel: FunnelStage[] = [
    funnelStage("Visitors", total, total),
    funnelStage("Engaged", engaged, total),
    funnelStage("Qualified", qualified, total),
    funnelStage("Hot", hot, total),
    funnelStage("Contact Ready", contactReady, total)
  ];

  const scoreBuckets = new Map<string, number>();
  for (const r of leads) {
    const b = bucketScore(r.lead!.leadScore);
    scoreBuckets.set(b, (scoreBuckets.get(b) ?? 0) + 1);
  }
  const scoreOrder = ["0-20", "21-40", "41-60", "61-80", "81-100"];
  const scoreDistribution: NamedValue[] = scoreOrder.map((b) => ({
    name: b,
    value: scoreBuckets.get(b) ?? 0
  }));

  const qualMap = countBy(leads, (l) => capitalize(l.lead!.qualification));
  const qualificationBreakdown: NamedValue[] = ["Cold", "Warm", "Hot"].map((q) => ({
    name: q,
    value: qualMap.get(q) ?? 0
  }));

  const engMap = new Map<string, number>();
  for (const r of conversations) {
    const e = r.conversation!.engagementScore;
    const k = e >= 70 ? "High" : e >= 40 ? "Medium" : "Low";
    engMap.set(k, (engMap.get(k) ?? 0) + 1);
  }
  const engagementBreakdown: NamedValue[] = ["Low", "Medium", "High"].map((k) => ({
    name: k,
    value: engMap.get(k) ?? 0
  }));

  const reasonCounts = new Map<string, number>();
  for (const r of leads) {
    for (const reason of r.lead!.scoreReasons) {
      const k = reason?.trim();
      if (k) reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
    }
  }
  const topScoreReasons = topN([...reasonCounts.entries()], 8);

  return {
    funnel,
    scoreDistribution,
    qualificationBreakdown,
    engagementBreakdown,
    topScoreReasons,
    avgScore: Math.round(safeMean(leads.map((r) => r.lead!.leadScore)))
  };
}
