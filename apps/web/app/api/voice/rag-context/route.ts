import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, ok, fail } from "@/lib/api-response";
import { retrieveRelevantChunks } from "@/lib/retrieval";

const bodySchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid payload");
    }

    const { projectId, query } = parsed.data;
    const chunks = await retrieveRelevantChunks(projectId, query, 5);
    const context = chunks.join("\n\n");

    return ok({ context });
  } catch (error) {
    console.error(error);
    return ok({ context: "" });
  }
}
