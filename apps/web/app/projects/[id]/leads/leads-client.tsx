"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Users, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadSidebar } from "./lead-sidebar";
import { LeadDetail } from "./lead-detail";

type LeadSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visitorId: string;
  score: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
};

type LeadDetailData = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visitorId: string;
  score: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  conversation: {
    id: string;
    visitorId: string;
    createdAt: string;
    messages: Array<{
      id: string;
      role: "USER" | "ASSISTANT";
      content: string;
      createdAt: string;
    }>;
  } | null;
};

export function LeadsClient({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loadingList, setLoadingList] = useState(true);
  const [detail, setDetail] = useState<LeadDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const fetchLeads = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      params.set("projectId", projectId);
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (scoreFilter !== "all") params.set("score", scoreFilter);
      if (dateRange !== "all") params.set("dateRange", dateRange);

      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data.leads);
        setPagination(json.data.pagination);
      }
    } finally {
      setLoadingList(false);
    }
  }, [page, search, statusFilter, scoreFilter, dateRange, projectId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (leadId && !selectedId) {
      setSelectedId(leadId);
      setMobileView("detail");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/leads/${selectedId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setDetail(json.data);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileView("detail");
  }

  function handleBack() {
    setMobileView("list");
  }

  function handleLeadUpdated(id: string, updates: { status?: string; score?: string }) {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
    setDetail(prev => prev ? { ...prev, ...updates } : null);
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-6">
      <div className={`${
        mobileView === "detail" ? "hidden" : "flex"
      } md:flex w-full md:w-[380px] flex-col border-r border-[#E5E7EB] bg-white shrink-0`}>
        <div className="p-4 border-b border-[#E5E7EB] space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value="all">All Status</option>
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="LOST">LOST</option>
            </select>
            <select
              value={scoreFilter}
              onChange={(e) => handleFilterChange(setScoreFilter)(e.target.value)}
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value="all">All Scores</option>
              <option value="COLD">COLD</option>
              <option value="WARM">WARM</option>
              <option value="HOT">HOT</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => handleFilterChange(setDateRange)(e.target.value)}
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="7days">7 Days</option>
              <option value="30days">30 Days</option>
            </select>
          </div>
        </div>
        <LeadSidebar
          leads={leads}
          selectedId={selectedId}
          onSelect={handleSelect}
          loading={loadingList}
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      </div>
      <div className={`${
        mobileView === "list" ? "hidden" : "flex"
      } md:flex flex-1 flex-col bg-[#F5F3FF]`}>
        <div className="md:hidden flex items-center gap-2 p-3 border-b bg-white">
          <button onClick={handleBack} className="p-1 hover:bg-[#F5F3FF] rounded">
            <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <span className="text-sm font-medium text-[#111827]">Leads</span>
        </div>
        {selectedId ? (
          <LeadDetail
            detail={detail}
            loading={loadingDetail}
            onBack={handleBack}
            onLeadUpdated={handleLeadUpdated}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[#6B7280] text-sm">Select a lead to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
