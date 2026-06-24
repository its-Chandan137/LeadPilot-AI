import { DashboardLayout } from "./dashboard-layout";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <DashboardLayout>
      <section className="grid min-h-[70vh] place-items-center">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E5E7EB]">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#7C3AED]">Coming soon</p>
          <h1 className="mt-3 text-3xl font-bold text-[#111827]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">This workspace area is ready in the navigation and will be connected to real data in a later phase.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}
