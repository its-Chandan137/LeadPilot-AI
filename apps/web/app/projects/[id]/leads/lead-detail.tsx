import { format } from "date-fns";
import { ChevronLeft, Mail, Phone, User, MessageSquare } from "lucide-react";

type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

type Props = {
  detail: {
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
      messages: Message[];
    } | null;
  } | null;
  loading: boolean;
  onBack: () => void;
  onLeadUpdated: (id: string, updates: { status?: string; score?: string }) => void;
};

const statusOptions = ["NEW", "CONTACTED", "QUALIFIED", "LOST"];
const scoreOptions = ["COLD", "WARM", "HOT"];

export function LeadDetail({ detail, loading, onBack, onLeadUpdated }: Props) {
  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div className="h-5 bg-[#F3F4F6] rounded w-1/3" />
          <div className="h-4 bg-[#F3F4F6] rounded w-1/2" />
          <div className="h-4 bg-[#F3F4F6] rounded w-2/3" />
        </div>
        <div className="bg-white rounded-lg border p-4 h-40" />
      </div>
    );
  }

  if (!detail) return null;

  const currentDetail = detail;

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${currentDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        onLeadUpdated(currentDetail.id, { status: newStatus });
      }
    } catch {}
  }

  async function handleScoreChange(newScore: string) {
    try {
      const res = await fetch(`/api/leads/${currentDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: newScore }),
      });
      const json = await res.json();
      if (json.success) {
        onLeadUpdated(currentDetail.id, { score: newScore });
      }
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="md:hidden flex items-center gap-2 p-3 border-b bg-white">
        <button onClick={onBack} className="p-1 hover:bg-[#F5F3FF] rounded">
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <span className="text-sm font-medium text-[#111827]">Lead Details</span>
      </div>

      <div className="p-6 space-y-6">
        {/* Lead info */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-bold text-lg grid place-items-center">
              {(detail.name ?? "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">{detail.name ?? "Unnamed"}</h2>
              <p className="text-sm text-[#7C3AED]">{detail.project.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            {detail.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#9CA3AF]" />
                <span className="text-[#6B7280]">{detail.email}</span>
              </div>
            )}
            {detail.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#9CA3AF]" />
                <span className="text-[#6B7280]">{detail.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#9CA3AF]" />
              <span className="text-[#6B7280]">Visitor: {detail.visitorId.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#9CA3AF]" />
              <span className="text-[#6B7280]">Source: {detail.source}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E5E7EB] grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1 block">Status</label>
              <div className="flex gap-1.5">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      detail.status === s
                        ? "bg-[#7C3AED] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1 block">Score</label>
              <div className="flex gap-1.5">
                {scoreOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleScoreChange(s)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      detail.score === s
                        ? "bg-[#7C3AED] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="bg-white rounded-xl border border-[#E5E7EB]">
          <div className="p-4 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-[#111827]">Conversation History</h3>
          </div>
          {detail.conversation ? (
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {detail.conversation.messages.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] text-center">No messages</p>
              ) : (
                detail.conversation.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%]">
                      <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "USER"
                          ? "bg-[#7C3AED] text-white rounded-br-md"
                          : "bg-[#F5F3FF] text-[#111827] rounded-bl-md"
                      }`}>
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
          ) : (
            <div className="p-8 text-center text-sm text-[#9CA3AF]">No conversation history</div>
          )}
        </div>
      </div>
    </div>
  );
}
