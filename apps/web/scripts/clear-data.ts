import "dotenv/config";
import { createPrismaClient } from "@/lib/prisma";

async function clear() {
  const prisma = createPrismaClient();

  const leadCount = await prisma.lead.count();
  const convCount = await prisma.conversation.count();
  const msgCount = await prisma.message.count();

  if (leadCount === 0 && convCount === 0) {
    console.log("DB is already clean.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$executeRaw`DELETE FROM "Lead"`;
  await prisma.$executeRaw`DELETE FROM "Conversation"`;

  console.log(`Cleared ${leadCount} leads, ${convCount} conversations (${msgCount} messages)`);
  await prisma.$disconnect();
}

clear();
