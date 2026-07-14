"use client";

import { RANGE_OPTIONS, type AnalyticsRange } from "@/lib/analytics/types";

export function FilterBar({
  value,
  onChange,
  loading
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  loading?: boolean;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              active
                ? "bg-[#7C3AED] text-white font-medium"
                : "text-slate-600 hover:bg-slate-100"
            } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
