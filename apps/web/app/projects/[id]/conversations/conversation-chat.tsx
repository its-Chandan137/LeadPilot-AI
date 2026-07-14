import { useState } from "react";
import { format } from "date-fns";
import { ConversationAnalysis } from "@/components/crm/ConversationAnalysis";
import type { PersistedIntelligence } from "@/lib/crm";

type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  createdAt: string;
} | null;

type Props = {
  detail: {
    conversation: { id: string; visitorId: string; createdAt: string };
    project: { id: string; name: string };
    lead: Lead;
    messages: Message[];
    intelligence: PersistedIntelligence;
  } | null;
  loading: boolean;
};

export function ConversationChat({ detail, loading }: Props) {
  const [view, setView] = useState<"chat" | "analysis">("chat");
  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="bg-white rounded-lg border p-4 animate-pulse space-y-2">
          <div className="h-4 bg-[#F3F4F6] rounded w-1/3" />
          <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className={`animate-pulse ${i % 2 === 0 ? "w-2/3" : "w-1/2"} h-10 bg-[#F3F4F6] rounded-xl`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { conversation, project, lead, messages, intelligence } = detail;
  const leadName = lead?.name ?? `Visitor ${conversation.visitorId.slice(-6).toUpperCase()}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#111827]">{leadName}</p>
          <p className="text-xs text-[#7C3AED]">{project.name}</p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 p-0.5">
          <button
            onClick={() => setView("chat")}
            className={`px-3 py-1 text-xs rounded ${view === "chat" ? "bg-[#7C3AED] text-white" : "text-slate-600"}`}
          >
            Chat
          </button>
          <button
            onClick={() => setView("analysis")}
            className={`px-3 py-1 text-xs rounded ${view === "analysis" ? "bg-[#7C3AED] text-white" : "text-slate-600"}`}
          >
            AI Analysis
          </button>
        </div>
      </div>

      {view === "analysis" ? (
        <div className="overflow-y-auto flex-1 p-5 bg-white">
          <ConversationAnalysis intelligence={intelligence} />
        </div>
      ) : (
        <>
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-[#9CA3AF] text-sm mt-8">
                No messages in this conversation.
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "USER"
                          ? "bg-[#7C3AED] text-white rounded-br-md"
                          : "bg-white border border-[#E5E7EB] text-[#111827] rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className={`text-[10px] text-[#9CA3AF] mt-1 ${msg.role === "USER" ? "text-right" : "text-left"}`}>
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {lead && (
            <div className="border-t bg-white p-4 space-y-2">
              <p className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase">Lead</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {lead.name && <><span className="text-[#6B7280]">Name</span><span className="text-[#111827]">{lead.name}</span></>}
                {lead.email && <><span className="text-[#6B7280]">Email</span><span className="text-[#111827]">{lead.email}</span></>}
                {lead.phone && <><span className="text-[#6B7280]">Phone</span><span className="text-[#111827]">{lead.phone}</span></>}
                <span className="text-[#6B7280]">Status</span>
                <span className="text-[#111827]">{lead.status}</span>
                <span className="text-[#6B7280]">Source</span>
                <span className="text-[#111827]">{lead.source}</span>
              </div>
              <div className="text-[10px] text-[#9CA3AF]">
                {format(new Date(conversation.createdAt), "MMM d, yyyy")} &middot; {lead.email && <span>{lead.email}</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
