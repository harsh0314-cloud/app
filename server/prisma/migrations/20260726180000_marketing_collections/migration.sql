-- ────────────────────────────────────────────────────────────
-- Marketing / Client-Care collections
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    "source" TEXT NOT NULL DEFAULT 'Footer',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_status_idx" ON "newsletter_subscribers"("status");
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_subscribedAt_idx" ON "newsletter_subscribers"("subscribedAt");

CREATE TABLE IF NOT EXISTS "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "contact_messages_status_idx"    ON "contact_messages"("status");
CREATE INDEX IF NOT EXISTS "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

CREATE TABLE IF NOT EXISTS "job_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "coverLetter" TEXT,
    "resumeUrl" TEXT,
    "resumePublicId" TEXT,
    "linkedin" TEXT,
    "portfolio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "job_applications_status_idx"    ON "job_applications"("status");
CREATE INDEX IF NOT EXISTS "job_applications_position_idx"  ON "job_applications"("position");
CREATE INDEX IF NOT EXISTS "job_applications_createdAt_idx" ON "job_applications"("createdAt");
