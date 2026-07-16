"use client";

import { Globe } from "lucide-react";
import { TrafficPanel } from "./traffic-panel";
import type { AnalyticsData, TrafficConfig } from "./lib/mock-analytics";

export function TrafficTab({
  projectId,
  apiUrl,
  analytics,
  trafficConfig,
}: {
  projectId: string;
  apiUrl: string;
  analytics: AnalyticsData | null;
  trafficConfig: TrafficConfig;
}) {
  if (!analytics) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-4">
            <Globe className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <p className="text-sm font-medium text-[#111827] mb-1">No traffic data yet</p>
          <p className="text-xs text-[#6B7280] max-w-xs">
            Referring sites will appear here once the widget is live and receiving visitors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <TrafficPanel data={analytics} projectId={projectId} apiUrl={apiUrl} trafficConfig={trafficConfig} />
    </div>
  );
}
