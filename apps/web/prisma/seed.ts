import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";

config({ path: path.resolve(process.cwd(), "../../.env.local") });
config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL or DIRECT_URL before running npm run db:seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "founder@leadpilot.local" },
    update: { name: "LeadPilot Founder" },
    create: {
      email: "founder@leadpilot.local",
      name: "LeadPilot Founder"
    }
  });

  let workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: {
          userId: user.id,
          role: "OWNER"
        }
      }
    }
  });

  workspace ??= await prisma.workspace.create({
    data: {
      name: "LeadPilot Demo Workspace",
      members: {
        create: {
          userId: user.id,
          role: "OWNER"
        }
      }
    }
  });

  await prisma.project.upsert({
    where: { clientId: "demo-client-id" },
    update: {
      workspaceId: workspace.id,
      name: "Acme Services",
      siteUrl: "https://example.com",
      widgetConfig: {
        color: "#2563eb",
        botName: "Ava",
        welcomeMessage: "Hi! I can help you choose the right service."
      }
    },
    create: {
      workspaceId: workspace.id,
      name: "Acme Services",
      siteUrl: "https://example.com",
      clientId: "demo-client-id",
      widgetConfig: {
        color: "#2563eb",
        botName: "Ava",
        welcomeMessage: "Hi! I can help you choose the right service."
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
