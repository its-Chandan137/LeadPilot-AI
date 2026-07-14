import type { PersistedConversation } from "@/lib/intelligence-store";
import type { EngagementMetrics, SeriesPoint, NamedValue } from "./types";
import { safeMean, qualityToScore, qualityScoreToPercent, getConversationStartDate, countBy } from "./util";

export function calculateEngagementMetrics(records: PersistedConversation[]): EngagementMetrics {
  // Group by conversation start date and average the per-conversation metrics.
  const engByDay = new Map<string, number[]>();
  const qualByDay = new Map<string, number[]>();

  for (const r of records) {
    const d = getConversationStartDate(r);
    const c = r.conversation;
    if (!d || !c) continue;
    const key = d.toISOString().slice(0, 10);
    if (!engByDay.has(key)) engByDay.set(key, []);
    if (!qualByDay.has(key)) qualByDay.set(key, []);
    engByDay.get(key)!.push(c.engagementScore);
    qualByDay.get(key)!.push(qualityToScore(c.conversationQuality));
  }

  const engagementOverTime: SeriesPoint[] = [...engByDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({ date, value: Math.round(safeMean(vals)) }));

  const qualityOverTime: SeriesPoint[] = [...qualByDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({ date, value: qualityScoreToPercent(safeMean(vals)) }));

  const convs = records.filter((r) => r.conversation);
  const dist = countBy(convs, (c) => {
    const e = c.conversation!.engagementScore;
    return e >= 70 ? "High" : e >= 40 ? "Medium" : "Low";
  });
  const distribution: NamedValue[] = ["Low", "Medium", "High"].map((k) => ({
    name: k,
    value: dist.get(k) ?? 0
  }));

  return { engagementOverTime, qualityOverTime, distribution };
}
