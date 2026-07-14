import { type ReactNode } from "react";

export function QualificationBadge({ value }: { value?: string | null }) {
  const v = (value ?? "").toLowerCase();
  const cls =
    v === "hot"
      ? "bg-red-100 text-red-700"
      : v === "warm"
      ? "bg-amber-100 text-amber-700"
      : v === "cold"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";
  return <Badge className={cls}>{value || "Unknown"}</Badge>;
}

export function ScoreBadge({ value }: { value?: string | null }) {
  const v = (value ?? "").toLowerCase();
  const cls =
    v === "hot"
      ? "bg-red-100 text-red-700"
      : v === "warm"
      ? "bg-amber-100 text-amber-700"
      : v === "cold"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";
  return <Badge className={cls}>{value || "—"}</Badge>;
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[#F5F3FF] text-[#6D28D9] px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

export function ChipList({ items, emptyLabel }: { items: string[]; emptyLabel?: string }) {
  if (!items || items.length === 0) {
    return <span className="text-xs text-slate-400">{emptyLabel ?? "None captured"}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Chip key={i}>{item}</Chip>
      ))}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</p>;
}

export function Empty({ label = "No intelligence captured yet" }: { label?: string }) {
  return <p className="text-xs text-slate-400 italic">{label}</p>;
}
