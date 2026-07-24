-- Product-specific dynamic Key Highlights and Size Guide (JSONB, nullable)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "keyHighlights" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sizeGuide" JSONB;