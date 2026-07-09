export function SidebarSkeleton() {
  return (
    <aside className="fixed w-64 h-screen bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden z-30">
      {/* Logo skeleton */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] animate-pulse" />
          <div className="h-5 w-28 bg-[#F3F4F6] rounded animate-pulse" />
        </div>
        <div className="mt-4 border-b border-[#E5E7EB]" />
      </div>

      {/* Workspace card skeleton */}
      <div className="mx-3 my-3 p-3 rounded-xl bg-[#F3F4F6] animate-pulse">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 rounded bg-[#E5E7EB]" />
          <div className="h-4 w-20 bg-[#E5E7EB] rounded" />
        </div>
        <div className="h-4 w-16 bg-[#E5E7EB] rounded-full" />
      </div>

      {/* Menu label skeleton */}
      <div className="px-5 mt-4 mb-1">
        <div className="h-3 w-8 bg-[#F3F4F6] rounded animate-pulse" />
      </div>

      {/* Nav items skeleton */}
      <div className="px-3 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-4 h-4 bg-[#F3F4F6] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[#F3F4F6] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Bottom skeleton */}
      <div className="mt-auto">
        <div className="mx-3 mb-3 p-3 rounded-xl bg-[#F3F4F6] animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#E5E7EB]" />
            <div className="h-4 w-12 bg-[#E5E7EB] rounded" />
          </div>
          <div className="h-3 w-20 bg-[#E5E7EB] rounded mb-2" />
          <div className="h-3 w-24 bg-[#E5E7EB] rounded" />
        </div>
        <div className="mx-3 mb-4 p-3 rounded-xl bg-[#F3F4F6] animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E5E7EB]" />
          <div>
            <div className="h-4 w-16 bg-[#E5E7EB] rounded mb-1" />
            <div className="h-3 w-10 bg-[#E5E7EB] rounded" />
          </div>
        </div>
      </div>
    </aside>
  );
}
