import { SectionTitle, ChipList, QualificationBadge, ScoreBadge, Badge } from "./badges";
import { ConversationTimeline } from "./ConversationTimeline";
import type { EnrichedLead } from "@/lib/crm";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  );
}

export function LeadProfile({ lead }: { lead: EnrichedLead }) {
  const i = lead.intelligence;
  const hasIntel = i.lead || i.business || i.conversation || (i.timeline && i.timeline.length > 0);

  if (!hasIntel) {
    return (
      <p className="text-xs text-slate-400 italic">
        No AI intelligence captured for this lead yet. It will appear automatically as the visitor talks with your widget.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <SectionTitle>Qualification</SectionTitle>
          <div className="mt-1"><QualificationBadge value={i.lead?.qualification} /></div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <SectionTitle>Lead Score</SectionTitle>
          <div className="mt-1"><ScoreBadge value={String(i.lead?.leadScore ?? "—")} /></div>
        </div>
      </div>

      <div>
        <SectionTitle>Overview</SectionTitle>
        <div className="mt-1">
          <Field label="Visitor Stage" value={i.lead?.visitorStage ?? "—"} />
          <Field label="Current Goal" value={i.lead?.currentGoal ?? "—"} />
          <Field label="Current Strategy" value={i.lead?.currentStrategy ?? "—"} />
          <Field label="Current Mission" value={i.lead?.currentMission ?? "—"} />
          <Field label="Recommended Action" value={i.lead?.recommendedAction ?? "—"} />
          <Field label="Confidence" value={i.lead ? `${Math.round((i.lead.confidence ?? 0) * 100)}%` : "—"} />
        </div>
      </div>

      <div>
        <SectionTitle>AI Recommendation</SectionTitle>
        <p className="text-sm text-slate-700 mt-1">{i.lead?.recommendedAction ?? "—"}</p>
      </div>

      <div>
        <SectionTitle>Conversation Summary</SectionTitle>
        <p className="text-sm text-slate-700 mt-1">{i.conversation?.summary ?? "—"}</p>
      </div>

      <div>
        <SectionTitle>Business Profile</SectionTitle>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-400">Company</span><span className="text-slate-700">{i.business?.company ?? "—"}</span>
          <span className="text-slate-400">Industry</span><span className="text-slate-700">{i.business?.industry ?? "—"}</span>
          <span className="text-slate-400">Business Type</span><span className="text-slate-700">{i.business?.businessType ?? "—"}</span>
          <span className="text-slate-400">Location</span><span className="text-slate-700">{i.business?.location ?? "—"}</span>
        </div>
      </div>

      <div>
        <SectionTitle>Goals</SectionTitle>
        <div className="mt-1"><ChipList items={i.conversation?.goals ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Pain Points</SectionTitle>
        <div className="mt-1"><ChipList items={i.conversation?.painPoints ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Interests</SectionTitle>
        <div className="mt-1"><ChipList items={i.conversation?.interests ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Products</SectionTitle>
        <div className="mt-1"><ChipList items={[...(i.conversation?.productsDiscussed ?? []), ...(i.business?.products ?? [])]} /></div>
      </div>

      <div>
        <SectionTitle>Score Reasons</SectionTitle>
        <div className="mt-1"><ChipList items={i.lead?.scoreReasons ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Positive Signals</SectionTitle>
        <div className="mt-1"><ChipList items={i.conversation?.positiveSignals ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Negative Signals</SectionTitle>
        <div className="mt-1"><ChipList items={i.conversation?.negativeSignals ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Completed Objectives</SectionTitle>
        <div className="mt-1"><ChipList items={i.lead?.completedObjectives ?? []} /></div>
      </div>
      <div>
        <SectionTitle>Pending Objectives</SectionTitle>
        <div className="mt-1"><ChipList items={i.lead?.pendingObjectives ?? []} /></div>
      </div>

      <div>
        <SectionTitle>Timeline</SectionTitle>
        <div className="mt-2"><ConversationTimeline events={i.timeline} /></div>
      </div>
    </div>
  );
}
