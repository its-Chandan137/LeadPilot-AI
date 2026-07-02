export default function ConversationsLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-6">
      <div className="w-[350px] border-r border-[#E5E7EB] bg-white">
        <div className="p-4 border-b space-y-3">
          <div className="h-9 bg-[#F3F4F6] rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="flex-1 h-9 bg-[#F3F4F6] rounded animate-pulse" />
            <div className="flex-1 h-9 bg-[#F3F4F6] rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-[#F3F4F6] rounded w-3/4" />
              <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
              <div className="h-3 bg-[#F3F4F6] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-[#F5F3FF] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#EDE9FE] border-t-[#7C3AED] animate-spin" />
      </div>
    </div>
  );
}
