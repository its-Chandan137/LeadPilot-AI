import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-[#7C3AED]" />
      </div>
      <h2 className="text-2xl font-bold text-[#111827] mb-2">Analytics</h2>
      <p className="text-[#6B7280] max-w-md">
        Detailed analytics are coming soon. You'll be able to track conversation trends, lead conversion rates, and widget performance.
      </p>
    </div>
  );
}
