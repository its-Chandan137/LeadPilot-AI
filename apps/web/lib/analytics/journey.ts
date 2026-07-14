import type { PersistedConversation } from "@/lib/intelligence-store";
import type { JourneyMetrics, FunnelStage, NamedValue } from "./types";
import { countBy, capitalize } from "./util";

export function calculateJourneyMetrics(records: PersistedConversation[]): JourneyMetrics {
  const withLead = records.filter((r) => r.lead);

  const stageMap = countBy(withLead, (l) => capitalize(l.lead!.visitorStage));
  const stageDistribution: NamedValue[] = [...stageMap.entries()]
    .filter(([name]) => name && name !== "Unknown")
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Progression is derived from the qualification history (Cold -> Warm -> Hot).
  const transitions = new Map<string, number>();
  let reachedHot = 0;
  let didNotReachHot = 0;
  const exitStages = new Map<string, number>();

  for (const r of withLead) {
    const hist = r.analytics?.qualificationHistory ?? [];
    const last = hist[hist.length - 1] ?? r.lead!.qualification;
    if ((last ?? "").toLowerCase() === "hot") reachedHot++;
    else didNotReachHot++;
    exitStages.set(capitalize(last), (exitStages.get(capitalize(last)) ?? 0) + 1);

    for (let i = 1; i < hist.length; i++) {
      const prev = capitalize(hist[i - 1]);
      const cur = capitalize(hist[i]);
      if (prev !== cur) {
        const key = `${prev} → ${cur}`;
        transitions.set(key, (transitions.get(key) ?? 0) + 1);
      }
    }
  }

  const qualificationProgression: NamedValue[] = [...transitions.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  let mostCommonExit = "Unknown";
  let max = -1;
  for (const [k, v] of exitStages) {
    if (v > max) {
      max = v;
      mostCommonExit = k;
    }
  }

  const total = withLead.length || 1;
  const warmPlus = withLead.filter((r) => {
    const v = (r.lead!.qualification ?? "").toLowerCase();
    return v === "warm" || v === "hot";
  }).length;

  const funnel: FunnelStage[] = [
    { label: "Started", value: withLead.length, conversion: 100 },
    { label: "Warm+", value: warmPlus, conversion: Math.round((warmPlus / total) * 100) },
    { label: "Hot", value: reachedHot, conversion: Math.round((reachedHot / total) * 100) }
  ];

  return {
    stageDistribution,
    qualificationProgression,
    dropOff: { reachedHot, didNotReachHot, mostCommonExit },
    funnel
  };
}
