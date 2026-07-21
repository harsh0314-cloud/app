-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "savedForLater" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

