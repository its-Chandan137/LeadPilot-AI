"use client";

import { type ReactNode } from "react";

const PALETTE = [
  "#7C3AED",
  "#A78BFA",
  "#C4B5FD",
  "#6D28D9",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9"
];

export function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function ChartEmpty({ label = "No data yet" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-[180px] text-sm text-slate-400">
      {label}
    </div>
  );
}

interface LineChartProps {
  data: { date: string; value: number }[];
  height?: number;
  suffix?: string;
}

export function LineChart({ data, height = 200, suffix = "" }: LineChartProps) {
  if (data.length === 0) return <ChartEmpty />;

  const W = 640;
  const H = height;
  const padX = 28;
  const padY = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const span = max - min || 1;
  const xStep = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padX + i * xStep;
    const y = H - padY - ((d.value - min) / span) * (H - padY * 2);
    return [x, y] as [number, number];
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const areaPath =
    `${linePath} L${points[points.length - 1][0].toFixed(1)},${H - padY} ` +
    `L${points[0][0].toFixed(1)},${H - padY} Z`;

  const ticks = 3;
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const y = padY + (i * (H - padY * 2)) / ticks;
    const val = Math.round(max - (i * span) / ticks);
    return { y, val };
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padX} y1={g.y} x2={W - padX} y2={g.y} stroke="#EEF2F7" />
            <text x={4} y={g.y + 4} fontSize="10" fill="#94A3B8">
              {g.val}
              {suffix}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="url(#lineFill)" />
        <path d={linePath} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#fff" stroke="#7C3AED" strokeWidth={2} />
        ))}
      </svg>
      {data.length > 1 && (
        <div className="flex justify-between px-6 text-[10px] text-slate-400">
          <span>{formatTick(data[0].date)}</span>
          <span>{formatTick(data[data.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}

function formatTick(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function DonutChart({ data, height = 200 }: DonutChartProps) {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <ChartEmpty />;

  const radius = 62;
  const cx = 90;
  const cy = 90;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  const segments = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const frac = d.value / total;
      const dash = frac * circ;
      const el = (
        <circle
          key={d.name}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={colorFor(i)}
          strokeWidth={22}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
      offset += dash;
      return el;
    });

  const legend = data.map((d, i) => (
    <div key={d.name} className="flex items-center gap-2 text-sm text-slate-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorFor(i) }} />
      <span className="flex-1 truncate">{d.name}</span>
      <span className="font-medium text-slate-900">{d.value}</span>
    </div>
  ));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div style={{ width: height, height }}>
        <svg viewBox={`0 0 180 180`} className="w-full h-full">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={22} />
          {segments}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#0F172A">
            {total}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#94A3B8">
            total
          </text>
        </svg>
      </div>
      <div className="flex-1 w-full space-y-2">{legend}</div>
    </div>
  );
}

interface BarListProps {
  data: { name: string; value: number }[];
  emptyLabel?: string;
}

export function BarList({ data, emptyLabel = "No data yet" }: BarListProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <ChartEmpty label={emptyLabel} />;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-slate-600 max-w-[70%]">{d.name}</span>
            <span className="font-medium text-slate-900">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, background: colorFor(i) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface FunnelProps {
  stages: { label: string; value: number; conversion: number }[];
}

export function Funnel({ stages }: FunnelProps) {
  const top = stages[0]?.value ?? 0;
  if (top === 0) return <ChartEmpty />;
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const width = top > 0 ? Math.max((s.value / top) * 100, s.value > 0 ? 8 : 0) : 0;
        return (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{s.label}</span>
              <span className="text-slate-900 font-semibold">
                {s.value}
                {i > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">{s.conversion}%</span>
                )}
              </span>
            </div>
            <div className="h-7 rounded-md bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-md flex items-center justify-end pr-2 text-[11px] font-medium text-white"
                style={{ width: `${width}%`, background: colorFor(i) }}
              >
                {width > 18 ? `${s.conversion}%` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MiniStat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
