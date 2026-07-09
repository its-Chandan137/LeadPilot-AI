import "dotenv/config";
import { defineConfig } from "prisma/config";

// Fallback ensures `prisma generate` always produces complete types on CI/Vercel
// even when DATABASE_URL is not set at build time. This URL is never connected to.
const databaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://build:build@localhost:5432/build";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: databaseUrl
  },

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
