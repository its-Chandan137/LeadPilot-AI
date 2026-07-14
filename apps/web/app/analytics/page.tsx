import { HomeLayout } from "@/components/layout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <HomeLayout>
      <AnalyticsDashboard />
    </HomeLayout>
  );
}
