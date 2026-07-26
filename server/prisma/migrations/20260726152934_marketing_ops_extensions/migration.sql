-- AlterTable
ALTER TABLE "contact_messages" ADD COLUMN     "adminReply" TEXT,
ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "repliedById" TEXT,
ADD COLUMN     "repliedByName" TEXT,
ADD COLUMN     "replySubject" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "interviewScheduledAt" TIMESTAMP(3),
ADD COLUMN     "rating" INTEGER,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "newsletter_subscribers" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "contact_replies" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "repliedById" TEXT,
    "repliedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "recipientEmails" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "newsletter_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_replies_messageId_idx" ON "contact_replies"("messageId");

-- CreateIndex
CREATE INDEX "newsletter_campaigns_status_idx" ON "newsletter_campaigns"("status");

-- CreateIndex
CREATE INDEX "newsletter_campaigns_createdAt_idx" ON "newsletter_campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "newsletter_campaign_recipients_campaignId_idx" ON "newsletter_campaign_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "newsletter_campaign_recipients_status_idx" ON "newsletter_campaign_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_campaign_recipients_campaignId_email_key" ON "newsletter_campaign_recipients"("campaignId", "email");

-- AddForeignKey
ALTER TABLE "contact_replies" ADD CONSTRAINT "contact_replies_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "contact_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_campaign_recipients" ADD CONSTRAINT "newsletter_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "newsletter_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
