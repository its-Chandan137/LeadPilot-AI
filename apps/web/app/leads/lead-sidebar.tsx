import { formatDistanceToNow } from "date-fns";

type LeadSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visitorId: string;
  score: string;
  status: string;
  createdAt: string;
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
  CONTACTED: "bg-amber-100 text-amber-700",
  QUALIFIED: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
};

const scoreColors: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-700",
  WARM: "bg-amber-100 text-amber-700",
  HOT: "bg-red-100 text-red-700",
};

export function LeadSidebar({ leads, selectedId, onSelect, loading, page, totalPages, onPageChange }: Props) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
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
          <p className="text-[#9CA3AF] text-xs mt-1">Leads will appear here once visitors are captured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {leads.map(lead => {
        const displayName = lead.name ?? `Visitor ${lead.visitorId.slice(-6).toUpperCase()}`;
        const timeAgo = formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true });

        return (
          <button
            key={lead.id}
            onClick={() => onSelect(lead.id)}
            className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] transition-colors ${
              selectedId === lead.id ? "bg-[#EDE9FE]" : "hover:bg-[#F5F3FF]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[#111827] truncate">{displayName}</p>
              <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap mt-0.5">{timeAgo}</span>
            </div>
            {lead.email && (
              <p className="text-xs text-[#6B7280] truncate mt-0.5">{lead.email}</p>
            )}
            {lead.phone && (
              <p className="text-xs text-[#6B7280] truncate">{lead.phone}</p>
            )}
            <p className="text-xs text-[#7C3AED] mt-0.5 truncate">{lead.project.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[lead.status] ?? "bg-slate-100 text-slate-600"}`}>
                {lead.status}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${scoreColors[lead.score] ?? "bg-slate-100 text-slate-600"}`}>
                {lead.score}
              </span>
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
