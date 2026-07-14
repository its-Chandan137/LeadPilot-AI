import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default function ProjectAnalyticsPage({ params }: { params: { id: string } }) {
  return <AnalyticsDashboard projectId={params.id} />;
}
