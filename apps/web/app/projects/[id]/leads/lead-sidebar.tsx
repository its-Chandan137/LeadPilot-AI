import { formatDistanceToNow } from "date-fns";

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

type Props = {
  leads: LeadSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

const scoreColors: Record<string, string> = {
  HOT: "bg-red-100 text-red-700",
  WARM: "bg-orange-100 text-orange-700",
  COLD: "bg-slate-100 text-slate-600",
};

export function LeadSidebar({ leads, selectedId, onSelect, loading, page, totalPages, onPageChange }: Props) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-[#F3F4F6] rounded w-3/4" />
            <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
            <div className="h-3 bg-[#F3F4F6] rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-[#6B7280] text-sm">No leads found</p>
          <p className="text-[#9CA3AF] text-xs mt-1">Leads will appear here once visitors interact with the widget.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {leads.map((lead) => {
        const timeAgo = formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true });
        return (
          <button
            key={lead.id}
            onClick={() => onSelect(lead.id)}
            className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] transition-colors ${
              selectedId === lead.id
                ? "bg-[#EDE9FE]"
                : "hover:bg-[#F5F3FF]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[#111827] truncate">
                {lead.name ?? "Unnamed"}
              </p>
              <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap mt-0.5">
                {timeAgo}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] truncate mt-0.5">{lead.email ?? "No email"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[lead.status] ?? "bg-slate-100 text-slate-600"}`}>
                {lead.status}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${scoreColors[lead.score] ?? "bg-slate-100 text-slate-600"}`}>
                {lead.score}
              </span>
              <p className="text-[10px] text-[#7C3AED] truncate ml-auto">{lead.project.name}</p>
            </div>
          </button>
        );
      })}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-[#6B7280] disabled:opacity-40 hover:bg-[#F5F3FF] transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-[#6B7280]">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-[#6B7280] disabled:opacity-40 hover:bg-[#F5F3FF] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
