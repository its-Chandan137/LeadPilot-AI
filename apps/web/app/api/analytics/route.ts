import { NextResponse } from "next/server";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getAnalytics, type AnalyticsRange } from "@/lib/analytics";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VALID_RANGES: AnalyticsRange[] = ["today", "yesterday", "7d", "30d", "90d", "all"];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return fail("You must be signed in.", 401);
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const rangeParam = url.searchParams.get("range") as AnalyticsRange | null;
    const range: AnalyticsRange =
      rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "all";

    const report = await getAnalytics({ projectId, range });
    return ok(report);
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch analytics", 500);
  }
}
