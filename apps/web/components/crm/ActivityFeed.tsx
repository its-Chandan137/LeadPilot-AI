import { formatDistanceToNow } from "date-fns";
import type { ActivityEvent } from "@/lib/crm";

const CATEGORY_COLOR: Record<string, string> = {
  journey: "bg-slate-400",
  information: "bg-sky-500",
  intent: "bg-violet-500",
  qualification: "bg-emerald-500",
  action: "bg-amber-500"
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No live activity yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Events appear automatically as visitors chat with your widget.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span
            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLOR[e.category] ?? "bg-slate-400"}`}
          />
          <div className="min-w-0">
            <p className="text-sm text-slate-800">{e.title}</p>
            {e.description && e.description !== e.title && (
              <p className="text-xs text-slate-400 truncate">{e.description}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">
              {e.projectName ? `${e.projectName} · ` : ""}
              {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
