import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, ok, fail } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { extractLeadInfo, hasLeadData } from "@/lib/lead-extractor";

const bodySchema = z.object({
  roomName: z.string().min(1),
  transcript: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  duration: z.number().int().positive(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid webhook payload");
    }

    const { roomName, transcript, duration } = parsed.data;
    const prisma = getSharedPrismaClient();

    const conversation = await prisma.voiceConversation.findUnique({
      where: { roomName },
      select: { id: true, projectId: true, visitorId: true },
    });

    if (!conversation) {
      return fail("Not found", 404);
    }

    await prisma.voiceConversation.update({
      where: { id: conversation.id },
      data: { status: "completed", duration },
    });

    await prisma.voiceMessage.createMany({
      data: transcript.map((msg) => ({
        voiceConversationId: conversation.id,
        role: msg.role,
        content: msg.content,
      })),
    });

    const leadData: { name?: string; email?: string; phone?: string } = {};

    for (const msg of transcript) {
      if (msg.role === "user") {
        const info = extractLeadInfo(msg.content);
        if (info.name)   leadData.name   = info.name;
        if (info.email)  leadData.email  = info.email;
        if (info.phone)  leadData.phone  = info.phone;
      }
    }

    if (hasLeadData(leadData)) {
      const existing = await prisma.lead.findFirst({
        where: {
          projectId: conversation.projectId,
          visitorId: conversation.visitorId,
        },
        select: { id: true, name: true, email: true, phone: true },
      });

      if (existing) {
        const updates: string[] = [];
        const values: unknown[] = [];
        if (leadData.name && !existing.name)   { updates.push(`name = $${updates.length + 1}`);  values.push(leadData.name); }
        if (leadData.email && !existing.email) { updates.push(`email = $${updates.length + 1}`); values.push(leadData.email); }
        if (leadData.phone && !existing.phone) { updates.push(`phone = $${updates.length + 1}`); values.push(leadData.phone); }
        updates.push(`"conversationId" = $${updates.length + 1}`);
        values.push(conversation.id);
        updates.push(`"updatedAt" = NOW()`);
        values.push(existing.id);
        await prisma.$executeRawUnsafe(
          `UPDATE "Lead" SET ${updates.join(", ")} WHERE id = $${values.length}`,
          ...values
        );
      } else {
        await prisma.lead.create({
          data: {
            projectId: conversation.projectId,
            visitorId: conversation.visitorId,
            conversationId: conversation.id,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
          },
        });
      }
    }

    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return fail("Webhook processing failed", 500);
  }
}
