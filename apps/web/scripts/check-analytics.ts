import "dotenv/config";
import { getAnalytics } from "../lib/analytics";

(async () => {
  const projectId = "cmra8y7dt00004cvh18gelgyo";
  for (const scope of [{ label: "GLOBAL", opts: {} as any }, { label: "PROJECT", opts: { projectId } as any }]) {
    const report = await getAnalytics(scope.opts);
    const o = report.overview;
    console.log(`\n=== ${scope.label} (range=${report.range}) ===`);
    console.log({
      totalConversations: o.totalConversations,
      totalLeads: o.totalLeads,
      qualifiedLeads: o.qualifiedLeads,
      avgLeadScore: o.avgLeadScore,
      avgEngagement: o.avgEngagement,
      avgQualityScore: o.avgQualityScore,
      avgConversationDurationMin: o.avgConversationDurationMin,
      avgMessages: o.avgMessages,
      avgResponseLength: o.avgResponseLength
    });
  }
  process.exit(0);
})();
