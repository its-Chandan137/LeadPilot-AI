import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL;
}

export function createPrismaClient() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("Set DATABASE_URL or DIRECT_URL before creating PrismaClient.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 3 })
  });
}

export function getSharedPrismaClient() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
