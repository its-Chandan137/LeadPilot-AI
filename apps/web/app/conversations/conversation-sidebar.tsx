import { formatDistanceToNow } from "date-fns";

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

type Props = {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function ConversationSidebar({
  conversations,
  selectedId,
  onSelect,
  loading,
  page,
  totalPages,
  onPageChange
}: Props) {
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

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-[#6B7280] text-sm">No conversations found</p>
          <p className="text-[#9CA3AF] text-xs mt-1">They will appear here once visitors start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const displayName = conv.lead?.name ?? `Visitor ${conv.visitorId.slice(-6).toUpperCase()}`;
        const timeAgo = conv.latestMessageAt
          ? formatDistanceToNow(new Date(conv.latestMessageAt), { addSuffix: true })
          : formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true });

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] transition-colors ${
              selectedId === conv.id
                ? "bg-[#EDE9FE]"
                : "hover:bg-[#F5F3FF]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[#111827] truncate">
                {displayName}
              </p>
              <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap mt-0.5">
                {timeAgo}
              </span>
            </div>
            <p className="text-xs text-[#7C3AED] mt-0.5 truncate">
              {conv.project.name}
            </p>
            {conv.latestMessage && (
              <p className="text-xs text-[#6B7280] mt-1 truncate">
                {conv.latestMessage}
              </p>
            )}
            <span className="text-[10px] text-[#9CA3AF] mt-1 inline-block">
              {conv.messageCount} message{conv.messageCount !== 1 ? "s" : ""}
            </span>
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
          <span className="text-xs text-[#6B7280]">
            {page} / {totalPages}
          </span>
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
