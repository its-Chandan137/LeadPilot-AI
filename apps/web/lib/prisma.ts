import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL;
}

function isNeonConnection(url: string) {
  return url.includes("neon") || url.includes("pooler.neon");
}

export function createPrismaClient() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("Set DATABASE_URL or DIRECT_URL before creating PrismaClient.");
  }

  if (isNeonConnection(connectionString)) {
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString, max: 3 }) });
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 3 })
  });
}

export function getSharedPrismaClient() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
