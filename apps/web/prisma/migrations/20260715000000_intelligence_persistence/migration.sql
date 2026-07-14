-- CreateTable
CREATE TABLE "ConversationIntelligence" (
    "conversationId" TEXT NOT NULL,
    "projectId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationIntelligence_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "LeadProfile" (
    "conversationId" TEXT NOT NULL,
    "projectId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadProfile_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "conversationId" TEXT NOT NULL,
    "projectId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "conversationId" TEXT NOT NULL,
    "projectId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "projectId" TEXT,
    "event" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationIntelligence_projectId_idx" ON "ConversationIntelligence"("projectId");

-- CreateIndex
CREATE INDEX "LeadProfile_projectId_idx" ON "LeadProfile"("projectId");

-- CreateIndex
CREATE INDEX "BusinessProfile_projectId_idx" ON "BusinessProfile"("projectId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_projectId_idx" ON "AnalyticsSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "TimelineEvent_conversationId_idx" ON "TimelineEvent"("conversationId");

-- CreateIndex
CREATE INDEX "TimelineEvent_projectId_idx" ON "TimelineEvent"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEvent_conversationId_event_description_key" ON "TimelineEvent"("conversationId", "event", "description");
