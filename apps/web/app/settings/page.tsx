import { HomeLayout } from "@/components/layout";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <HomeLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-4">
          <Settings className="w-8 h-8 text-[#7C3AED]" />
        </div>
        <h2 className="text-2xl font-bold text-[#111827] mb-2">Settings</h2>
        <p className="text-[#6B7280] max-w-md">
          Global workspace settings are coming soon. For now, configure your widget settings inside each project.
        </p>
      </div>
    </HomeLayout>
  );
}
