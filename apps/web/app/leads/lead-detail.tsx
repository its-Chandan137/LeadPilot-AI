import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

type Toast = { message: string; type: "success" | "error" } | null;

type Props = {
  detail: LeadDetailData | null;
  loading: boolean;
  onBack: () => void;
  onLeadUpdated: (id: string, updates: { status?: string; score?: string }) => void;
};

export function LeadDetail({ detail, loading, onBack, onLeadUpdated }: Props) {
  const [editableStatus, setEditableStatus] = useState(detail?.status ?? "NEW");
  const [editableScore, setEditableScore] = useState(detail?.score ?? "COLD");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (detail) {
      setEditableStatus(detail.status);
      setEditableScore(detail.score);
    }
  }, [detail?.id]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUpdate(field: "status" | "score", value: string) {
    if (!detail) return;
    setSaving(prev => ({ ...prev, [field]: true }));
    try {
      const res = await fetch(`/api/leads/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        if (field === "status") setEditableStatus(value);
        if (field === "score") setEditableScore(value);
        onLeadUpdated(detail.id, { [field]: value });
        showToast("Lead updated successfully", "success");
      } else {
        showToast(json.error ?? "Failed to update", "error");
      }
    } catch {
      showToast("Failed to update", "error");
    } finally {
      setSaving(prev => ({ ...prev, [field]: false }));
    }
  }

  function isSaving(field: string) {
    return saving[field] ?? false;
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-white rounded-lg border p-5 animate-pulse space-y-3">
          <div className="h-5 bg-[#F3F4F6] rounded w-1/3" />
          <div className="h-4 bg-[#F3F4F6] rounded w-1/2" />
          <div className="h-4 bg-[#F3F4F6] rounded w-2/3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-8 bg-[#F3F4F6] rounded" />
            <div className="h-8 bg-[#F3F4F6] rounded" />
            <div className="h-8 bg-[#F3F4F6] rounded" />
            <div className="h-8 bg-[#F3F4F6] rounded" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className={`animate-pulse ${i % 2 === 0 ? "w-2/3" : "w-1/2"} h-10 bg-[#F3F4F6] rounded-xl`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { conversation } = detail;
  const displayName = detail.name ?? `Visitor ${detail.visitorId.slice(-6).toUpperCase()}`;
  const messages = conversation?.messages ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="md:hidden flex items-center gap-2 p-3 border-b bg-white shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-[#F5F3FF] rounded">
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <span className="text-sm font-medium text-[#111827]">{displayName}</span>
      </div>

      {toast && (
        <div className={`px-4 py-2 text-xs font-medium text-center shrink-0 ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="overflow-y-auto flex-1">
        <div className="p-5 space-y-5">
          <div className="bg-white rounded-lg border p-5 space-y-3">
            <p className="text-sm font-semibold text-[#6B7280] tracking-wider uppercase">Lead Profile</p>
            <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-[#6B7280]">Name</span>
              <span className="text-[#111827] font-medium">{displayName}</span>

              {detail.email && (
                <><span className="text-[#6B7280]">Email</span><span className="text-[#111827]">{detail.email}</span></>
              )}
              {detail.phone && (
                <><span className="text-[#6B7280]">Phone</span><span className="text-[#111827]">{detail.phone}</span></>
              )}

              <span className="text-[#6B7280]">Status</span>
              <div className="flex items-center gap-2">
                <select
                  value={editableStatus}
                  onChange={(e) => handleUpdate("status", e.target.value)}
                  disabled={isSaving("status")}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#7C3AED] disabled:opacity-50"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="LOST">LOST</option>
                </select>
                {isSaving("status") && (
                  <div className="w-3 h-3 rounded-full border-2 border-[#EDE9FE] border-t-[#7C3AED] animate-spin" />
                )}
              </div>

              <span className="text-[#6B7280]">Score</span>
              <div className="flex items-center gap-2">
                <select
                  value={editableScore}
                  onChange={(e) => handleUpdate("score", e.target.value)}
                  disabled={isSaving("score")}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#7C3AED] disabled:opacity-50"
                >
                  <option value="COLD">COLD</option>
                  <option value="WARM">WARM</option>
                  <option value="HOT">HOT</option>
                </select>
                {isSaving("score") && (
                  <div className="w-3 h-3 rounded-full border-2 border-[#EDE9FE] border-t-[#7C3AED] animate-spin" />
                )}
              </div>

              <span className="text-[#6B7280]">Source</span>
              <span className="text-[#111827]">{detail.source}</span>

              <span className="text-[#6B7280]">Project</span>
              <span className="text-[#7C3AED]">{detail.project.name}</span>

              <span className="text-[#6B7280]">Created</span>
              <span className="text-[#111827]">{format(new Date(detail.createdAt), "MMM d, yyyy h:mm a")}</span>

              <span className="text-[#6B7280]">Updated</span>
              <span className="text-[#111827]">{formatDistanceToNow(new Date(detail.updatedAt), { addSuffix: true })}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-5 space-y-3">
            <p className="text-sm font-semibold text-[#6B7280] tracking-wider uppercase">Conversation History</p>
            {messages.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-6">No messages in this conversation.</p>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
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
                ))}
              </div>
            )}
            {conversation && (
              <p className="text-[10px] text-[#9CA3AF] pt-2 border-t border-[#F3F4F6]">
                Conversation opened {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
