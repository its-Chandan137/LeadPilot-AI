import type {
  LeadProfileRecord,
  BusinessProfileRecord,
  ConversationIntelligenceRecord,
  AnalyticsRecord
} from "@/lib/intelligence-store";
import type { ConversationEvent } from "@/lib/timeline-engine";

/** All intelligence persisted for a single conversation, joined by conversationId. */
export interface PersistedIntelligence {
  lead: LeadProfileRecord | null;
  business: BusinessProfileRecord | null;
  conversation: ConversationIntelligenceRecord | null;
  analytics: AnalyticsRecord | null;
  timeline: ConversationEvent[];
}

export interface ProjectRef {
  id: string;
  name: string;
}

export interface EnrichedLead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visitorId: string;
  /** Prisma score enum (COLD / WARM / HOT). */
  score: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectRef;
  conversationId: string | null;
  intelligence: PersistedIntelligence;
}

export interface MessageDetail {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface LeadLite {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  createdAt: string;
}

export interface EnrichedConversation {
  id: string;
  visitorId: string;
  createdAt: string;
  projectId: string;
  project: ProjectRef;
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source: string;
    createdAt: string;
  } | null;
  messages: MessageDetail[];
  intelligence: PersistedIntelligence;
}

export interface ActivityEvent {
  id: string;
  conversationId: string;
  visitorId: string;
  projectId: string | null;
  projectName: string | null;
  leadName: string | null;
  title: string;
  description: string;
  category: string;
  timestamp: string;
  importance: string;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface FunnelStage {
  label: string;
  value: number;
  conversion: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface RecentRecommendation {
  conversationId: string;
  visitorId: string;
  projectName: string | null;
  leadName: string | null;
  recommendedAction: string;
  score: string;
  createdAt: string;
}

export interface DashboardData {
  scope: "global" | "project";
  today: {
    conversations: number;
    leads: number;
    warm: number;
    hot: number;
    avgEngagement: number;
    avgLeadScore: number;
  };
  topIndustries: NamedValue[];
  topBusinessTypes: NamedValue[];
  topProducts: NamedValue[];
  topPainPoints: NamedValue[];
  topGoals: NamedValue[];
  topRecommendedActions: NamedValue[];
  qualificationFunnel: FunnelStage[];
  leadTrend: TrendPoint[];
  conversationTrend: TrendPoint[];
  recentHighValueLeads: EnrichedLead[];
  recentRecommendations: RecentRecommendation[];
  activity: ActivityEvent[];
}

export interface SearchResult {
  leads: EnrichedLead[];
  conversations: EnrichedConversation[];
}

export interface LeadFilters {
  qualification?: string;
  industry?: string;
  businessType?: string;
  visitorStage?: string;
  goal?: string;
  strategy?: string;
  mission?: string;
  recommendedAction?: string;
  engagementMin?: number;
  conversationQuality?: string;
  product?: string;
  painPoint?: string;
  hasTimeline?: boolean;
}

export interface LeadQuery {
  workspaceId: string;
  projectId?: string;
  search?: string;
  status?: string;
  score?: string;
  dateRange?: "today" | "7days" | "30days" | "all";
  page?: number;
  limit?: number;
  filters?: LeadFilters;
}
