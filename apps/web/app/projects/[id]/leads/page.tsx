import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function ProjectLeadsPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#111827]">Leads</h1>
      <LeadsClient projectId={params.id} />
    </div>
  );
}
