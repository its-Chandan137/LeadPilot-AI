import { Info, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { type Insight } from "@/lib/analytics/types";

const STYLES: Record<Insight["severity"], { icon: React.ReactNode; ring: string; bg: string; text: string }> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    ring: "border-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-700"
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    ring: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800"
  },
  positive: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    ring: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-800"
  }
};

export function Insights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <Lightbulb className="w-4 h-4 text-slate-400" />
        No insights yet — insights appear once enough conversations are analysed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => {
        const s = STYLES[insight.severity];
        return (
          <div key={insight.id} className={`flex gap-3 rounded-lg border ${s.ring} ${s.bg} p-4`}>
            <div className={`mt-0.5 ${s.text}`}>{s.icon}</div>
            <div>
              <div className={`text-sm font-semibold ${s.text}`}>{insight.title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{insight.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
