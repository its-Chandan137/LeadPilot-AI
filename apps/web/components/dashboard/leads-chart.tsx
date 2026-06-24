"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { leadsOverTime } from "@/lib/mock-data";

export function LeadsChart() {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111827]">Leads Over Time</h2>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-1">
          <button className="rounded-md bg-[#EDE9FE] px-3 py-1.5 text-sm font-medium text-[#7C3AED]" type="button">Daily</button>
          <button className="px-3 py-1.5 text-sm font-medium text-[#6B7280]" type="button">Weekly</button>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={leadsOverTime} margin={{ left: -18, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="leadsFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
            <YAxis axisLine={false} domain={[0, 90]} tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
            <Area dataKey="leads" fill="url(#leadsFill)" stroke="#7C3AED" strokeWidth={3} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
