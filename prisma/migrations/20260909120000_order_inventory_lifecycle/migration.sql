-- CreateEnum
CREATE TYPE "InventoryAllocationStatus" AS ENUM ('UNRESERVED', 'RESERVED', 'SOLD', 'RELEASED', 'RESTOCKED');

-- Replace the nullable compound unique constraint with PostgreSQL partial
-- indexes so simple products (variantId IS NULL) cannot be duplicated.
DROP INDEX "CartItem_cartId_productId_variantId_key";

WITH totals AS (
	SELECT
		MIN("id") AS "keepId",
		SUM("quantity")::INTEGER AS "totalQuantity"
	FROM "CartItem"
	GROUP BY "cartId", "productId", "variantId"
)
UPDATE "CartItem" AS item
SET "quantity" = totals."totalQuantity"
FROM totals
WHERE item."id" = totals."keepId";

WITH keepers AS (
	SELECT
		MIN("id") AS "keepId",
		"cartId",
		"productId",
		"variantId"
	FROM "CartItem"
	GROUP BY "cartId", "productId", "variantId"
)
DELETE FROM "CartItem" AS item
USING keepers
WHERE item."cartId" = keepers."cartId"
	AND item."productId" = keepers."productId"
	AND item."variantId" IS NOT DISTINCT FROM keepers."variantId"
	AND item."id" <> keepers."keepId";

CREATE UNIQUE INDEX "CartItem_cart_product_no_variant_key"
ON "CartItem"("cartId", "productId")
WHERE "variantId" IS NULL;
CREATE UNIQUE INDEX "CartItem_cart_product_variant_key"
ON "CartItem"("cartId", "productId", "variantId")
WHERE "variantId" IS NOT NULL;
CREATE INDEX "CartItem_cartId_productId_variantId_idx"
ON "CartItem"("cartId", "productId", "variantId");

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "checkoutAccessToken" TEXT,
ADD COLUMN "sourceCartId" TEXT,
ADD COLUMN "inventoryReservationExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN "variantId" TEXT,
ADD COLUMN "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "inventoryAllocationStatus" "InventoryAllocationStatus" NOT NULL DEFAULT 'UNRESERVED';

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutAccessToken_key" ON "Order"("checkoutAccessToken");
CREATE INDEX "Order_status_inventoryReservationExpiresAt_idx" ON "Order"("status", "inventoryReservationExpiresAt");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
CREATE INDEX "OrderItem_orderId_inventoryAllocationStatus_idx" ON "OrderItem"("orderId", "inventoryAllocationStatus");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;