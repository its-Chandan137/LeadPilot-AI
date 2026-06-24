"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { topSources } from "@/lib/mock-data";

export function SourcesChart() {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <h2 className="text-lg font-semibold text-[#111827]">Top Sources</h2>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie data={topSources} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={2}>
              {topSources.map((entry) => (
                <Cell fill={entry.color} key={entry.name} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-3">
        {topSources.map((source) => (
          <div className="flex items-center justify-between text-sm" key={source.name}>
            <span className="flex items-center gap-2 text-[#374151]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
              {source.name}
            </span>
            <span className="font-medium text-[#111827]">{source.value}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
