"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  MessageSquare,
  Users,
  Globe,
  ShieldOff,
  ExternalLink,
  Clock,
  Info,
  X,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BlockDomainConfirm } from "@/components/popups";
import type { AnalyticsData, ReferrerHit, ReferrerGroup, TrafficConfig } from "./lib/mock-analytics";

type DomainFilter = "all" | "blocked";

// Shared grid template so the select-all header, domain rows, and counts line
// up exactly. First col is a fixed checkbox slot (empty for Direct / none),
// middle is the flexible domain block, last is a fixed right-aligned count.
const ROW_GRID = "grid grid-cols-[1.25rem_1fr_2.5rem] items-center gap-3";

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function extractDomain(referrer: string): string {
  if (!referrer) return "Direct / none";
  try {
    const hostname = new URL(referrer).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

function domainInitial(domain: string): string {
  if (domain === "Direct / none") return "D";
  return domain.charAt(0).toUpperCase();
}

const TIME_RANGES = [
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
  { value: "all", label: "All" },
] as const;

type TimeRange = (typeof TIME_RANGES)[number]["value"];

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#6B7280]">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#111827] tabular-nums">{value}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-4">
        <Globe className="w-7 h-7 text-[#7C3AED]" />
      </div>
      <p className="text-sm font-medium text-[#111827] mb-1">No traffic data yet</p>
      <p className="text-xs text-[#6B7280] max-w-xs">
        Referring sites will appear here once the widget is live and receiving visitors.
      </p>
    </div>
  );
}

export function TrafficPanel({
  data,
  projectId,
  apiUrl,
  trafficConfig,
}: {
  data: AnalyticsData;
  projectId: string;
  apiUrl: string;
  trafficConfig: TrafficConfig;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [search, setSearch] = useState("");
  const [blockedDomains, setBlockedDomains] = useState<Set<string>>(new Set());
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingBlock, setPendingBlock] = useState<ReferrerGroup | null>(null);
  const [blockedPaths, setBlockedPaths] = useState<string[]>(trafficConfig?.blockedPaths ?? []);
  const [pathInput, setPathInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial = new Set<string>();
    for (const g of data.groups) {
      if (g.blocked) initial.add(g.domain);
    }
    setBlockedDomains(initial);
  }, [data.groups]);

  const filteredHits = useMemo(() => {
    const q = search.toLowerCase();
    return data.hits
      .filter(
        (h) =>
          !q ||
          h.referrer.toLowerCase().includes(q) ||
          (h.path ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [data.hits, search]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    return data.groups
      .filter((g) => !q || g.domain.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count);
  }, [data.groups, search]);

  const displayedGroups = useMemo(() => {
    if (domainFilter === "all") return filteredGroups;
    return filteredGroups.filter((g) => blockedDomains.has(g.domain));
  }, [filteredGroups, domainFilter, blockedDomains]);

  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectableGroups = useMemo(
    () => displayedGroups.filter((g) => g.domain !== "Direct / none"),
    [displayedGroups]
  );
  const selectedInView = selectableGroups.filter((g) => selected.has(g.domain)).length;
  const allSelected = selectableGroups.length > 0 && selectedInView === selectableGroups.length;
  const someSelected = selectedInView > 0 && !allSelected;
  const anyBlockedSelected = selectableGroups.some((g) => selected.has(g.domain) && blockedDomains.has(g.domain));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const g of selectableGroups) next.delete(g.domain);
      } else {
        for (const g of selectableGroups) next.add(g.domain);
      }
      return next;
    });
  }

  function handleToggle(group: ReferrerGroup) {
    if (blockedDomains.has(group.domain)) {
      void applyToggle(group);
    } else {
      setPendingBlock(group);
    }
  }

  // Persists the full `traffic` block config (both axes) via the existing
  // settings route. Returns false (without touching state) on failure.
  async function persistTraffic(
    nextReferrers: string[],
    nextPaths: string[]
  ): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetConfig: {
            traffic: { blockedReferrers: nextReferrers, blockedPaths: nextPaths },
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to update traffic settings");
        return false;
      }
      return true;
    } catch {
      setError("Failed to update traffic settings");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Optimistically flips the local referrer block state and persists the full
  // traffic config. On failure the previous state is restored.
  async function applyToggle(group: ReferrerGroup) {
    const willBlock = !blockedDomains.has(group.domain);
    const nextBlocked = new Set(blockedDomains);
    if (willBlock) nextBlocked.add(group.domain);
    else nextBlocked.delete(group.domain);
    const previous = blockedDomains;

    setBlockedDomains(nextBlocked);
    const ok = await persistTraffic(Array.from(nextBlocked), blockedPaths);
    if (!ok) setBlockedDomains(previous);
  }

  function toggleSelect(domain: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  // Bulk block/unblock in a SINGLE PUT. When the filter is "Blocked" the
  // selected set is unblocked; otherwise it is added to blockedReferrers.
  // Reuses persistTraffic (the exact same path as the single-row toggle).
  async function applyBulk() {
    if (selected.size === 0) return;
    const willBlock = !anyBlockedSelected;
    const nextBlocked = new Set(blockedDomains);
    for (const d of selected) {
      if (willBlock) nextBlocked.add(d);
      else nextBlocked.delete(d);
    }
    const previous = blockedDomains;
    setBlockedDomains(nextBlocked);
    setSelected(new Set());
    const ok = await persistTraffic(Array.from(nextBlocked), blockedPaths);
    if (!ok) setBlockedDomains(previous);
  }

  function isValidPathGlob(value: string): string | null {
    const v = value.trim();
    if (!v || !v.startsWith("/")) return null;
    return v;
  }

  async function addBlockedPath() {
    const v = isValidPathGlob(pathInput);
    if (!v) {
      setError("Enter a path starting with / (e.g. /careers/*)");
      return;
    }
    if (blockedPaths.includes(v)) {
      setPathInput("");
      return;
    }
    const next = [...blockedPaths, v];
    const previous = blockedPaths;
    setBlockedPaths(next);
    setPathInput("");
    const ok = await persistTraffic(Array.from(blockedDomains), next);
    if (!ok) setBlockedPaths(previous);
  }

  async function removeBlockedPath(glob: string) {
    const next = blockedPaths.filter((p) => p !== glob);
    const previous = blockedPaths;
    setBlockedPaths(next);
    const ok = await persistTraffic(Array.from(blockedDomains), next);
    if (!ok) setBlockedPaths(previous);
  }

  const hasData = data.hits.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            onClick={() => setTimeRange(tr.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${timeRange === tr.value
                ? "bg-[#7C3AED] text-white"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED]"
              }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Conversations"
          value={data.totals.conversations}
          icon={MessageSquare}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Leads"
          value={data.totals.leads}
          icon={Users}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          label="Unique Referrers"
          value={data.totals.uniqueReferrers}
          icon={Globe}
          color="text-[#7C3AED]"
          bg="bg-[#EDE9FE]"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pane A: Traffic Sources */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col">
          <div className="px-5 pt-5 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#111827]">Traffic Sources</h2>
              <span className="text-xs text-[#9CA3AF] tabular-nums">{filteredHits.length} hits</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <Input
                placeholder="Search sources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-[#F3F4F6]">
            {!hasData ? (
              <EmptyState />
            ) : filteredHits.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#9CA3AF]">No matching sources</div>
            ) : (
              filteredHits.map((hit, i) => (
                <HitRow key={i} hit={hit} />
              ))
            )}
          </div>
        </div>

        {/* Pane B: Grouped by Domain + Block */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col">
          <div className="px-5 pt-5 pb-3 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-[#111827]">By Referring Domain</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Top sources sorted by traffic volume</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    aria-label="Filter referring domains"
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value as DomainFilter)}
                    className="h-9 pl-3 pr-8 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] cursor-pointer appearance-none focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="all">All</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#6B7280]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-[#F3F4F6]">
            {!hasData ? (
              <EmptyState />
            ) : displayedGroups.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#9CA3AF]">
                {domainFilter === "blocked" ? "No blocked domains" : "No matching domains"}
              </div>
            ) : (
              <>
                <div className={`${ROW_GRID} px-5 py-2 border-b border-[#F3F4F6] bg-white`}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all referring domains"
                    className="w-4 h-4 accent-[#7C3AED] cursor-pointer rounded"
                  />
                  <span className="text-xs font-medium text-[#6B7280]">Select all</span>
                  <span className="text-xs text-[#9CA3AF] text-right">Count</span>
                </div>
                {displayedGroups
                  .filter((group) => group.domain !== "Direct / none")
                  .map((group) => (
                    <GroupRow
                      key={group.domain}
                      group={group}
                      blocked={blockedDomains.has(group.domain)}
                      direct={group.domain === "Direct / none"}
                      disabled={saving}
                      selected={selected.has(group.domain)}
                      onSelectChange={() => toggleSelect(group.domain)}
                    />
                  ))}
                <div className="sticky bottom-0 z-10 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_8px_rgba(17,24,39,0.04)] px-5 py-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => void applyBulk()}
                    disabled={selected.size === 0 || saving}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${selected.size === 0
                        ? "bg-red-600 text-white cursor-not-allowed"
                        : anyBlockedSelected
                          ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                  >
                    {selected.size === 0
                      ? "Block selected"
                      : anyBlockedSelected
                        ? `Unblock selected (${selected.size})`
                        : `Block selected (${selected.size})`}
                  </button>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mx-5 mb-4 mt-2 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Blocked page paths */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-5">
        <h2 className="text-sm font-semibold text-[#111827]">Blocked page paths</h2>
        <p className="text-xs text-[#9CA3AF] mt-0.5 mb-3">
          Glob patterns (e.g. <code className="text-[#6B7280]">/careers/*</code>). Visitors on a
          matching path won&apos;t see the widget.
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="/careers/*"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addBlockedPath();
              }
            }}
            className="h-9 text-sm"
          />
          <Button type="button" onClick={() => void addBlockedPath()} disabled={saving} className="shrink-0">
            Add
          </Button>
        </div>
        {blockedPaths.length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">No blocked paths.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {blockedPaths.map((glob) => (
              <span
                key={glob}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700"
              >
                {glob}
                <button
                  type="button"
                  onClick={() => void removeBlockedPath(glob)}
                  disabled={saving}
                  aria-label={`Remove ${glob}`}
                  className="hover:text-red-900 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {pendingBlock && (
        <BlockDomainConfirm
          domain={pendingBlock.domain}
          onConfirm={() => {
            void applyToggle(pendingBlock);
            setPendingBlock(null);
          }}
          onCancel={() => setPendingBlock(null)}
        />
      )}
    </div>
  );
}

function HitRow({ hit }: { hit: ReferrerHit }) {
  const domain = extractDomain(hit.referrer);
  const isDirect = !hit.referrer;

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors">
      <div className="w-8 h-8 rounded-full bg-[#F5F3FF] text-[#7C3AED] text-xs font-bold flex items-center justify-center shrink-0">
        {isDirect ? "D" : domainInitial(domain)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111827] truncate">
          {isDirect ? "Direct / none" : domain}
        </p>
        <p className="text-xs text-[#9CA3AF] truncate">
          {hit.path && hit.path !== "/" ? hit.path : isDirect ? "No referrer" : hit.referrer}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] shrink-0">
        <Clock className="w-3 h-3" />
        <span className="tabular-nums">{relativeTime(hit.occurredAt)}</span>
      </div>
      {!isDirect && (
        <a
          href={hit.referrer}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#9CA3AF] hover:text-[#7C3AED] transition-colors shrink-0"
          aria-label={`Open ${domain} in new tab`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function GroupRow({
  group,
  blocked,
  direct,
  disabled,
  selected,
  onSelectChange,
}: {
  group: ReferrerGroup;
  blocked: boolean;
  direct: boolean;
  disabled: boolean;
  selected: boolean;
  onSelectChange: () => void;
}) {
  return (
    <div className={`${ROW_GRID} px-5 py-3 hover:bg-[#FAFAFA] transition-colors`}>
      {direct ? (
        <span aria-hidden="true" />
      ) : (
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelectChange}
          aria-label={`Select ${group.domain}`}
          className="w-4 h-4 accent-[#7C3AED] cursor-pointer rounded"
        />
      )}
      <div className="min-w-0 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#111827] truncate">{group.domain}</p>
          <p className="text-xs text-[#9CA3AF]">
            Last seen {relativeTime(group.lastSeen)}
          </p>
        </div>
        {blocked && (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-600">
            Blocked
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-[#111827] tabular-nums text-right">
        {group.count}
      </span>
    </div>
  );
}
