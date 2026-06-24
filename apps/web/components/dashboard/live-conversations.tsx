import Link from "next/link";
import { liveConversations } from "@/lib/mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function LiveConversations() {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111827]">Live Conversations</h2>
        <Link className="text-sm font-semibold text-[#7C3AED]" href="/conversations">
          View all →
        </Link>
      </div>
      <div className="mt-5 divide-y divide-[#E5E7EB]">
        {liveConversations.map((conversation, index) => (
          <div className="flex gap-3 py-4 first:pt-0 last:pb-0" key={`${conversation.visitor}-${index}`}>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#EDE9FE] text-xs font-bold text-[#7C3AED]">
              {initials(conversation.visitor)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-semibold text-[#111827]">{conversation.visitor}</p>
                <span className="flex items-center gap-2 whitespace-nowrap text-xs text-[#6B7280]">
                  {conversation.time}
                  {conversation.online ? <span className="h-2 w-2 rounded-full bg-[#10B981]" /> : null}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6B7280]">{conversation.message}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
