import "dotenv/config";
import { getSharedPrismaClient } from "../lib/prisma";
import { runAIOS } from "../lib/ai-os";
import { persistConversation } from "../lib/intelligence-store";

type Turn = { role: "user" | "assistant"; content: string };

interface Scenario {
  visitor: string;
  memory: Record<string, unknown>;
  analysis: { intent: string; confidence: number; visitorStage: string; sentiment: string };
  recommendation: { action: string };
  history: Turn[];
}

const scenarios: Scenario[] = [
  {
    visitor: "emma-dental",
    memory: {
      name: "Emma Roberts", company: "Bright Smile Dental", industry: "Dental",
      location: "Austin, TX", businessType: "Local Clinic",
      goals: ["Reduce missed appointments", "Automate reminders"],
      painPoints: ["Patients miss appointments", "After-hours calls"],
      productsInterested: ["Appointment Bot", "SMS Reminders"]
    },
    analysis: { intent: "booking", confidence: 88, visitorStage: "evaluating", sentiment: "positive" },
    recommendation: { action: "offer_demo" },
    history: [
      { role: "user", content: "Hi, I run a dental clinic." },
      { role: "assistant", content: "Great! What challenges are you facing with patient communication?" },
      { role: "user", content: "We miss lots of appointments and get calls after hours." },
      { role: "assistant", content: "Our Appointment Bot can automate reminders and capture bookings 24/7. Want a demo?" },
      { role: "user", content: "How much does it cost?" },
      { role: "assistant", content: "Plans start at $49/mo per location. I can schedule a demo with our team." },
      { role: "user", content: "Sure, my email is emma@brightsmile.com and phone 512-555-0142." },
      { role: "assistant", content: "Perfect — I've noted your details and booked a demo for tomorrow at 10am." }
    ]
  },
  {
    visitor: "leo-saas",
    memory: {
      name: "Leo Park", company: "Nimbus Analytics", industry: "SaaS", location: "Remote",
      goals: ["Cut support tickets", "Scale onboarding"],
      painPoints: ["High support volume", "Slow onboarding"],
      productsInterested: ["AI Chat", "Knowledge Base"]
    },
    analysis: { intent: "sales", confidence: 74, visitorStage: "considering_purchase", sentiment: "positive" },
    recommendation: { action: "offer_contact" },
    history: [
      { role: "user", content: "We're a B2B SaaS and support volume is killing us." },
      { role: "assistant", content: "An AI chat trained on your docs can deflect up to 40% of tickets. What's your stack?" },
      { role: "user", content: "Mostly Zendesk and Intercom." },
      { role: "assistant", content: "We integrate with both. How many seats do you support?" },
      { role: "user", content: "Around 12 agents." },
      { role: "assistant", content: "Got it — I'll connect you with our solutions team to scope a pilot." }
    ]
  },
  {
    visitor: "priya-ecom",
    memory: {
      name: "Priya Shah", company: "Urban Thread", industry: "Ecommerce", location: "Mumbai",
      goals: ["Increase conversion", "Reduce returns"],
      painPoints: ["Low conversion", "High return rate"],
      productsInterested: ["Product Recommendations", "Size Guide Bot"]
    },
    analysis: { intent: "product_information", confidence: 66, visitorStage: "researching", sentiment: "neutral" },
    recommendation: { action: "continue_conversation" },
    history: [
      { role: "user", content: "Do you support ecommerce stores?" },
      { role: "assistant", content: "Yes! We help fashion stores with size guides and recommendations. What platform?" },
      { role: "user", content: "Shopify." },
      { role: "assistant", content: "We have a native Shopify app. Want to see example results?" },
      { role: "user", content: "Maybe later." }
    ]
  },
  {
    visitor: "tom-law",
    memory: {
      name: "Tom Becker", company: "Becker Law", industry: "Legal", location: "Chicago",
      goals: ["Capture leads", "Qualify intakes"],
      painPoints: ["Missed intake calls", "Low qualification"],
      productsInterested: ["Intake Bot"]
    },
    analysis: { intent: "booking", confidence: 81, visitorStage: "qualified", sentiment: "positive" },
    recommendation: { action: "offer_contact" },
    history: [
      { role: "user", content: "We're a personal injury firm and miss intake calls." },
      { role: "assistant", content: "Our Intake Bot captures every lead and qualifies them instantly. How many cases/mo?" },
      { role: "user", content: "About 200 inquiries." },
      { role: "assistant", content: "That's a strong fit. I'll route you to our legal specialist." },
      { role: "user", content: "Great, call me at 312-555-0199." }
    ]
  },
  {
    visitor: "anya-fitness",
    memory: {
      name: "Anya Volkova", company: "FitLife Studio", industry: "Fitness", location: "Berlin",
      goals: ["Boost membership", "Class bookings"],
      painPoints: ["No-shows", "Manual scheduling"],
      productsInterested: ["Booking Bot"]
    },
    analysis: { intent: "booking", confidence: 70, visitorStage: "evaluating", sentiment: "neutral" },
    recommendation: { action: "offer_demo" },
    history: [
      { role: "user", content: "Can your bot handle class bookings for a gym?" },
      { role: "assistant", content: "Absolutely — members book and cancel via chat 24/7. How many locations?" },
      { role: "user", content: "Two studios." },
      { role: "assistant", content: "Perfect. I can set up a demo for both locations." }
    ]
  }
];

function buildGoalsStage(analysis: Scenario["analysis"]): string {
  // Map visitorStage into a realistic goal/strategy narrative.
  switch (analysis.visitorStage) {
    case "evaluating": return "Offer Demo";
    case "considering_purchase": return "Offer Contact";
    case "qualified": return "Schedule Call";
    case "researching": return "Educate";
    default: return "Greeting";
  }
}

async function main() {
  const prisma = getSharedPrismaClient();
  const envProjectId = process.env.PROJECT_ID;
  const project = envProjectId
    ? await prisma.project.findUnique({ where: { id: envProjectId } })
    : await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) { console.log("NO project found — create one first."); return; }
  console.log("Seeding into project:", project.id, project.name ?? "(unnamed)");

  const COUNT = Number(process.env.SEED_COUNT ?? 18);
  const now = Date.now();

  for (let i = 0; i < COUNT; i++) {
    const scenario = scenarios[i % scenarios.length];
    const conversationId = `seed_${i}_${Date.now()}`;
    const visitorId = `${scenario.visitor}_${i}`;

    // Spread conversations across the last 30 days; messages span a few minutes.
    const convOffsetMs = (i / COUNT) * 30 * 24 * 60 * 60 * 1000;
    const convStart = new Date(now - convOffsetMs - Math.random() * 60 * 60 * 1000);

    const messages = scenario.history.map((t, idx) => ({
      role: t.role === "user" ? ("USER" as const) : ("ASSISTANT" as const),
      content: t.content,
      createdAt: new Date(convStart.getTime() + idx * (60_000 + Math.floor(Math.random() * 120_000)))
    }));

    const memory: any = { ...scenario.memory };
    const analysis: any = scenario.analysis;
    const recommendation: any = scenario.recommendation;
    const history: any[] = scenario.history.map((t) => ({ role: t.role, content: t.content }));
    const goalText = buildGoalsStage(analysis);

    const aiOS = runAIOS({
      conversationId,
      history,
      memory,
      analysis,
      recommendation,
      configuredObjectives: []
    });

    // Ensure goal/strategy reflect the scenario for richer analytics.
    aiOS.goal = { ...aiOS.goal, goal: goalText } as any;
    aiOS.strategy = { ...aiOS.strategy, strategy: analysis.visitorStage === "researching" ? "Consultative" : "Direct" } as any;

    await prisma.conversation.create({
      data: {
        id: conversationId,
        projectId: project.id,
        visitorId,
        createdAt: convStart,
        messages: { create: messages }
      }
    });

    await persistConversation(conversationId, aiOS, project.id);
    console.log(`seeded #${i + 1} ${scenario.visitor} (${messages.length} msgs) -> goal="${aiOS.goal.goal}" score=${aiOS.lead.score}`);
  }

  const counts = {
    conv: await prisma.conversation.count(),
    ci: await prisma.conversationIntelligence.count(),
    lp: await prisma.leadProfile.count(),
    bp: await prisma.businessProfile.count(),
    an: await prisma.analyticsSnapshot.count(),
    te: await prisma.timelineEvent.count(),
    msg: await prisma.message.count()
  };
  console.log("DB counts after seed:", counts);
  await prisma.$disconnect();
}

main().catch((e) => { console.error("SEED FATAL:", e); process.exit(1); });
