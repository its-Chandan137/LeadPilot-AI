import { SectionTitle, ChipList, QualificationBadge, ScoreBadge, Empty } from "./badges";
import { ConversationTimeline } from "./ConversationTimeline";
import type { PersistedIntelligence } from "@/lib/crm";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  );
}

function LeadProgression({ history }: { history?: string[] }) {
  if (!history || history.length === 0) return <Empty label="No progression recorded" />;
  const order = ["Cold", "Warm", "Hot"];
  const last = history[history.length - 1];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {order.map((stage, i) => {
        const reached = order.indexOf(last) >= i;
        return (
          <span key={stage} className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                reached ? "bg-[#EDE9FE] text-[#7C3AED]" : "bg-slate-100 text-slate-400"
              }`}
            >
              {stage}
            </span>
            {i < order.length - 1 && <span className="text-slate-300">→</span>}
          </span>
        );
      })}
    </div>
  );
}

export function ConversationAnalysis({ intelligence }: { intelligence: PersistedIntelligence }) {
  const conv = intelligence.conversation;
  const lead = intelligence.lead;
  const biz = intelligence.business;

  if (!conv && !lead && !biz) {
    return <Empty label="No AI intelligence has been captured for this conversation yet." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <SectionTitle>Qualification</SectionTitle>
          <div className="mt-1"><QualificationBadge value={lead?.qualification} /></div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <SectionTitle>Lead Score</SectionTitle>
          <div className="mt-1"><ScoreBadge value={String(lead?.leadScore ?? "—")} /></div>
        </div>
      </div>

      <Row label="Engagement Score" value={conv ? `${conv.engagementScore}/100` : "—"} />
      <Row label="Conversation Quality" value={conv?.conversationQuality ?? "—"} />
      <Row label="Current Goal" value={lead?.currentGoal ?? "—"} />
      <Row label="Current Strategy" value={lead?.currentStrategy ?? "—"} />
      <Row label="Current Mission" value={lead?.currentMission ?? "—"} />
      <Row label="Recommended Action" value={lead?.recommendedAction ?? "—"} />

      {conv?.summary && (
        <div>
          <SectionTitle>Conversation Summary</SectionTitle>
          <p className="text-sm text-slate-700 mt-1">{conv.summary}</p>
        </div>
      )}
      {conv?.visitorSummary && (
        <div>
          <SectionTitle>Visitor Summary</SectionTitle>
          <p className="text-sm text-slate-700 mt-1">{conv.visitorSummary}</p>
        </div>
      )}
      {conv?.businessSummary && (
        <div>
          <SectionTitle>Business Summary</SectionTitle>
          <p className="text-sm text-slate-700 mt-1">{conv.businessSummary}</p>
        </div>
      )}

      <div>
        <SectionTitle>Pain Points</SectionTitle>
        <div className="mt-1"><ChipList items={conv?.painPoints ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Goals</SectionTitle>
        <div className="mt-1"><ChipList items={conv?.goals ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Products Discussed</SectionTitle>
        <div className="mt-1"><ChipList items={conv?.productsDiscussed ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Objections</SectionTitle>
        <div className="mt-1"><ChipList items={conv?.objections ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Positive Signals</SectionTitle>
        <div className="mt-1"><ChipList items={conv?.positiveSignals ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Negative Signals</SectionTitle>
        <div className="mt-1"><ChipList items={conv?.negativeSignals ?? []} /></div>
      </div>

      <div>
        <SectionTitle>Business Profile</SectionTitle>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-400">Company</span><span className="text-slate-700">{biz?.company ?? "—"}</span>
          <span className="text-slate-400">Industry</span><span className="text-slate-700">{biz?.industry ?? "—"}</span>
          <span className="text-slate-400">Business Type</span><span className="text-slate-700">{biz?.businessType ?? "—"}</span>
          <span className="text-slate-400">Location</span><span className="text-slate-700">{biz?.location ?? "—"}</span>
        </div>
      </div>

      <div>
        <SectionTitle>Lead Progression</SectionTitle>
        <div className="mt-1"><LeadProgression history={intelligence.analytics?.qualificationHistory} /></div>
      </div>

      <div>
        <SectionTitle>Timeline of Events</SectionTitle>
        <div className="mt-2"><ConversationTimeline events={intelligence.timeline} /></div>
      </div>
    </div>
  );
}
