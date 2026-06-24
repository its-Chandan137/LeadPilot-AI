import Link from "next/link";
import { recentLeads } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusClass: Record<string, string> = {
  New: "bg-blue-50 text-blue-700",
  Contacted: "bg-gray-100 text-gray-700",
  Qualified: "bg-emerald-50 text-[#10B981]"
};

export function RecentLeads() {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <h2 className="text-lg font-semibold text-[#111827]">Recent Leads</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-xs text-[#6B7280]">
            <tr className="border-b border-[#E5E7EB]">
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Email</th>
              <th className="py-3 font-medium">Source</th>
              <th className="py-3 font-medium">Contacted</th>
              <th className="py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentLeads.map((lead) => (
              <tr className="border-b border-[#E5E7EB] last:border-b-0" key={lead.email}>
                <td className="py-4 font-medium text-[#111827]">{lead.name}</td>
                <td className="py-4 text-[#6B7280]">{lead.email}</td>
                <td className="py-4 text-[#374151]">{lead.source}</td>
                <td className="py-4 text-[#6B7280]">{lead.time}</td>
                <td className="py-4">
                  <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", statusClass[lead.status])}>{lead.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link className="mt-5 inline-flex text-sm font-semibold text-[#7C3AED]" href="/leads">
        View all leads →
      </Link>
    </section>
  );
}
