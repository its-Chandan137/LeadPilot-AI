-- CreateTable
CREATE TABLE "WidgetTraffic" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "visitorId" TEXT,
    "referrer" TEXT,
    "referrerDomain" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetTraffic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WidgetTraffic_projectId_createdAt_idx" ON "WidgetTraffic"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "WidgetTraffic_projectId_referrerDomain_idx" ON "WidgetTraffic"("projectId", "referrerDomain");

-- AddForeignKey
ALTER TABLE "WidgetTraffic" ADD CONSTRAINT "WidgetTraffic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
