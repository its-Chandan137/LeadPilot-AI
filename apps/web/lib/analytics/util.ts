import type { PersistedConversation } from "@/lib/intelligence-store";
import type { AnalyticsRange } from "./types";

/** Maps a free-text qualification value to a canonical label. */
export function capitalize(s?: string): string {
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Converts a conversation-quality label into a 1-3 numeric score. */
export function qualityToScore(value?: string): number {
  switch ((value ?? "").toLowerCase()) {
    case "good":
      return 3;
    case "average":
      return 2;
    case "poor":
      return 1;
    default:
      return 0;
  }
}

export function qualityScoreToPercent(score: number): number {
  if (score <= 0) return 0;
  return Math.round((score / 3) * 100);
}

/** The conversation's start date, derived from the first timeline event. */
export function getConversationStartDate(record: PersistedConversation): Date | null {
  const first = record.timeline?.[0]?.timestamp;
  if (!first) return null;
  const d = new Date(first);
  return isNaN(d.getTime()) ? null : d;
}

/** Conversation duration in minutes, derived from the first and last timeline events. */
export function conversationDurationMinutes(record: PersistedConversation): number | null {
  const tl = record.timeline ?? [];
  if (tl.length < 2) return null;
  const first = new Date(tl[0].timestamp).getTime();
  const last = new Date(tl[tl.length - 1].timestamp).getTime();
  if (isNaN(first) || isNaN(last) || last < first) return null;
  return (last - first) / 60000;
}

export function safeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function lastNumericValue(arr?: (number | string)[]): number | null {
  if (!arr || arr.length === 0) return null;
  const raw = arr[arr.length - 1];
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

export function rangeStart(range: AnalyticsRange, now: Date): Date | null {
  const d = new Date(now);
  switch (range) {
    case "today":
      d.setHours(0, 0, 0, 0);
      return d;
    case "yesterday": {
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7d":
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    case "30d":
      d.setDate(d.getDate() - 29);
      d.setHours(0, 0, 0, 0);
      return d;
    case "90d":
      d.setDate(d.getDate() - 89);
      d.setHours(0, 0, 0, 0);
      return d;
    case "all":
      return null;
  }
}

/** Filters records to the selected range using the conversation start date. */
export function applyRange(records: PersistedConversation[], range: AnalyticsRange): PersistedConversation[] {
  const start = rangeStart(range, new Date());
  if (!start) return records;

  if (range === "yesterday") {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return records.filter((r) => {
      const d = getConversationStartDate(r);
      return d ? d >= start && d < end : false;
    });
  }

  return records.filter((r) => {
    const d = getConversationStartDate(r);
    return d ? d >= start : false;
  });
}

export function bucketScore(score: number): string {
  if (score <= 20) return "0-20";
  if (score <= 40) return "21-40";
  if (score <= 60) return "41-60";
  if (score <= 80) return "61-80";
  return "81-100";
}

/** Returns the top N entries by value, dropping empty names. */
export function topN(entries: [string, number][], n = 8): { name: string; value: number }[] {
  return entries
    .filter(([name]) => !!name && name.trim().length > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name, value }));
}

/** Counts occurrences of a derived key across items. */
export function countBy<T>(items: (T | null | undefined)[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    const k = key(item);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function isQualified(qualification?: string): boolean {
  const v = (qualification ?? "").toLowerCase();
  return v === "warm" || v === "hot";
}
