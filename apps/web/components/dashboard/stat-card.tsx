export function StatCard({
  label,
  value,
  change,
  period
}: {
  label: string;
  value: number | string;
  change: number;
  period: string;
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <p className="text-sm font-medium text-[#6B7280]">{label}</p>
      <div className="mt-4 flex items-center gap-3">
        <p className="text-3xl font-bold tracking-tight text-[#111827]">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-[#10B981]">↑ {change}%</span>
      </div>
      <p className="mt-3 text-sm text-[#6B7280]">{period}</p>
    </section>
  );
}
