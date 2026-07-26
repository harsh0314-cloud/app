-- ============================================================
-- Returns & Exchanges Module (per-item, images, timeline, wallet)
-- ============================================================

-- AlterTable: users — wallet balance
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "walletBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: products — return/exchange policy fields
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isReturnable"     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isExchangeable"   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "returnWindowDays" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "returnPolicy"     TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "exchangePolicy"   TEXT;

-- AlterTable: return_requests — enrich for Myntra/AJIO-grade workflow
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "subReason"             TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "comments"              TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "refundMethod"          TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "refundStatus"          TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "refundedAt"            TIMESTAMP(3);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "refundTransactionId"   TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "storeCreditCouponCode" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "pickupScheduledAt"     TIMESTAMP(3);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "pickedUpAt"            TIMESTAMP(3);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "exchangeShippedAt"     TIMESTAMP(3);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "exchangeTrackingNumber" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "replacementOrderId"    TEXT;

-- Change the default status label so new requests use "PENDING"; migrate legacy rows.
ALTER TABLE "return_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
UPDATE "return_requests" SET "status" = 'PENDING' WHERE "status" = 'REQUESTED';

-- Add FK from return_requests.userId → users(id)
-- (previously untracked; index existed but no FK constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'return_requests'
      AND constraint_name = 'return_requests_userId_fkey'
  ) THEN
    ALTER TABLE "return_requests"
      ADD CONSTRAINT "return_requests_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: return_request_items (per-item returns)
CREATE TABLE IF NOT EXISTS "return_request_items" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "subReason" TEXT,
    "exchangeSize" TEXT,
    "exchangeVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_request_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "return_request_items_returnRequestId_idx" ON "return_request_items"("returnRequestId");
CREATE INDEX IF NOT EXISTS "return_request_items_orderItemId_idx"     ON "return_request_items"("orderItemId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='return_request_items_returnRequestId_fkey') THEN
    ALTER TABLE "return_request_items"
      ADD CONSTRAINT "return_request_items_returnRequestId_fkey"
      FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='return_request_items_orderItemId_fkey') THEN
    ALTER TABLE "return_request_items"
      ADD CONSTRAINT "return_request_items_orderItemId_fkey"
      FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: return_request_images (Cloudinary proof URLs)
CREATE TABLE IF NOT EXISTS "return_request_images" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_request_images_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "return_request_images_returnRequestId_idx" ON "return_request_images"("returnRequestId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='return_request_images_returnRequestId_fkey') THEN
    ALTER TABLE "return_request_images"
      ADD CONSTRAINT "return_request_images_returnRequestId_fkey"
      FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: return_status_history (timeline)
CREATE TABLE IF NOT EXISTS "return_status_history" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "changedByRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "return_status_history_returnRequestId_idx" ON "return_status_history"("returnRequestId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='return_status_history_returnRequestId_fkey') THEN
    ALTER TABLE "return_status_history"
      ADD CONSTRAINT "return_status_history_returnRequestId_fkey"
      FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: wallet_transactions
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "wallet_transactions_userId_idx" ON "wallet_transactions"("userId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='wallet_transactions_userId_fkey') THEN
    ALTER TABLE "wallet_transactions"
      ADD CONSTRAINT "wallet_transactions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
