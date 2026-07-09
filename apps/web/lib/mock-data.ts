export type ConversationItem = {
  id: string;
  visitor: string;
  type: "Chat" | "Voice";
  date: string;
  intent: string;
  score: "Hot" | "Warm" | "Cold";
  status: "Open" | "Closed";
};

export type LeadItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  score: "Hot" | "Warm" | "Cold";
  status: "New" | "Contacted" | "Qualified" | "Won";
  date: string;
};

export const mockConversations: ConversationItem[] = [
  { id: "conv-1", visitor: "visitor_a8f3", type: "Chat", date: "2026-06-28", intent: "Pricing inquiry", score: "Hot", status: "Open" },
  { id: "conv-2", visitor: "visitor_b2c1", type: "Chat", date: "2026-06-27", intent: "Support request", score: "Warm", status: "Closed" },
  { id: "conv-3", visitor: "visitor_d4e7", type: "Voice", date: "2026-06-27", intent: "Demo booking", score: "Hot", status: "Open" },
  { id: "conv-4", visitor: "visitor_f9a2", type: "Chat", date: "2026-06-26", intent: "General question", score: "Cold", status: "Closed" },
  { id: "conv-5", visitor: "visitor_c3b8", type: "Chat", date: "2026-06-25", intent: "Partnership", score: "Warm", status: "Open" }
];

export const mockLeads: LeadItem[] = [
  { id: "lead-1", name: "Sarah Chen", email: "sarah@acme.co", phone: "+1-555-0101", source: "Chat Widget", score: "Hot", status: "Qualified", date: "2026-06-28" },
  { id: "lead-2", name: "Marcus Rivera", email: "marcus@techstart.io", phone: "+1-555-0202", source: "Chat Widget", score: "Warm", status: "Contacted", date: "2026-06-27" },
  { id: "lead-3", name: "Emily Watson", email: "emily@global.com", phone: "+1-555-0303", source: "Voice Widget", score: "Hot", status: "New", date: "2026-06-27" },
  { id: "lead-4", name: "David Park", email: "david@smallbiz.net", phone: "+1-555-0404", source: "Chat Widget", score: "Cold", status: "New", date: "2026-06-26" },
  { id: "lead-5", name: "Lisa Thompson", email: "lisa@enterprise.org", phone: "+1-555-0505", source: "Chat Widget", score: "Warm", status: "Won", date: "2026-06-25" }
];
