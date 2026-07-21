-- DropIndex
DROP INDEX "payments_razorpayPaymentId_key";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH_ON_DELIVERY';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "razorpayPaymentId",
ADD COLUMN     "stripePaymentIntentId" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'inr';

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

