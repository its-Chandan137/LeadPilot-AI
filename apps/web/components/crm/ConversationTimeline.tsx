import { format } from "date-fns";
import type { ConversationEvent } from "@/lib/timeline-engine";

const CATEGORY_META: Record<string, { color: string; dot: string; label: string }> = {
  journey: { color: "border-slate-300", dot: "bg-slate-400", label: "Journey" },
  information: { color: "border-sky-300", dot: "bg-sky-500", label: "Info" },
  intent: { color: "border-violet-300", dot: "bg-violet-500", label: "Intent" },
  qualification: { color: "border-emerald-300", dot: "bg-emerald-500", label: "Qualification" },
  action: { color: "border-amber-300", dot: "bg-amber-500", label: "Action" }
};

export function ConversationTimeline({ events }: { events: ConversationEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-xs text-slate-400 italic">No timeline events captured yet.</p>;
  }

  const ordered = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-5">
      {ordered.map((e, i) => {
        const meta = CATEGORY_META[e.category] ?? CATEGORY_META.journey;
        return (
          <li key={`${e.event}-${e.timestamp}-${i}`} className="ml-4">
            <span
              className={`absolute -left-[7px] flex w-3.5 h-3.5 rounded-full ${meta.dot} ring-4 ring-white`}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">{e.event}</p>
              <span className="text-[10px] text-slate-400">
                {format(new Date(e.timestamp), "MMM d, h:mm a")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>
            <span className={`inline-flex mt-1 text-[10px] uppercase tracking-wide ${meta.dot} text-slate-500`}>
              {meta.label}
              {e.importance >= 3 && " · high importance"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
