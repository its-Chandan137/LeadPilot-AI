import { type ReactNode } from "react";

const ICON_BG = "bg-[#EDE9FE]";
const ICON_COLOR = "text-[#7C3AED]";

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {icon && (
          <span className={`w-9 h-9 rounded-lg ${ICON_BG} flex items-center justify-center ${ICON_COLOR}`}>
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-3 text-3xl font-bold tracking-tight ${accent ?? "text-slate-900"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
