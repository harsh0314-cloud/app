-- Add selected size to cart items and order items
ALTER TABLE "cart_items" ADD COLUMN "size" TEXT;
ALTER TABLE "order_items" ADD COLUMN "size" TEXT;
