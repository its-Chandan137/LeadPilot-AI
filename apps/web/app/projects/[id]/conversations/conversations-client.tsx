"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MessageSquare, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConversationSidebar } from "./conversation-sidebar";
import { ConversationChat } from "./conversation-chat";
import type { PersistedIntelligence } from "@/lib/crm";

type LeadInfo = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

type ConversationSummary = {
  id: string;
  visitorId: string;
  createdAt: string;
  project: { id: string; name: string };
  lead: LeadInfo | null;
  latestMessage: string | null;
  latestMessageAt: string | null;
  messageCount: number;
};

type MessageDetail = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

type ConversationDetail = {
  conversation: {
    id: string;
    visitorId: string;
    createdAt: string;
    projectId: string;
  };
  project: { id: string; name: string };
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source: string;
    createdAt: string;
  } | null;
  messages: MessageDetail[];
  intelligence: PersistedIntelligence;
};

export function ConversationsClient({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loadingList, setLoadingList] = useState(true);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      params.set("projectId", projectId);
      if (search) params.set("search", search);
      if (dateRange !== "all") params.set("dateRange", dateRange);

      const res = await fetch(`/api/conversations?${params}`);
      const json = await res.json();
      if (json.success) {
        setConversations(json.data.conversations);
        setPagination(json.data.pagination);
      }
    } finally {
      setLoadingList(false);
    }
  }, [page, search, dateRange, projectId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/conversations/${selectedId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setDetail(json.data);
        }
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileView("chat");
  }

  function handleBack() {
    setMobileView("list");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDateRangeChange(value: string) {
    setDateRange(value);
    setPage(1);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-6">
      <div className={`${
        mobileView === "chat" ? "hidden" : "flex"
      } md:flex w-full md:w-[350px] flex-col border-r border-[#E5E7EB] bg-white shrink-0`}>
        <div className="p-4 border-b border-[#E5E7EB] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7days">7 days</option>
              <option value="30days">30 days</option>
            </select>
          </div>
        </div>
        <ConversationSidebar
          conversations={conversations}
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
          <span className="text-sm font-medium text-[#111827]">Conversations</span>
        </div>
        {selectedId ? (
          <ConversationChat
            detail={detail}
            loading={loadingDetail}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[#6B7280] text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
