CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cart_product_no_variant_key"
ON "CartItem"("cartId", "productId") WHERE "variantId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cart_product_variant_key"
ON "CartItem"("cartId", "productId", "variantId") WHERE "variantId" IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CableType_positive_values' AND conrelid = '"CableType"'::regclass) THEN
        ALTER TABLE "CableType" ADD CONSTRAINT "CableType_positive_values"
            CHECK ("pinsPerCable" > 0 AND "ratePerPin" > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CableWork_valid_totals' AND conrelid = '"CableWork"'::regclass) THEN
        ALTER TABLE "CableWork" ADD CONSTRAINT "CableWork_valid_totals"
            CHECK ("quantity" > 0 AND "pinsPerCable" > 0 AND "ratePerPin" > 0
                AND "totalPins" = "quantity"::BIGINT * "pinsPerCable"
                AND "earned" = "totalPins" * "ratePerPin");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CablePayment_positive_amount' AND conrelid = '"CablePayment"'::regclass) THEN
        ALTER TABLE "CablePayment" ADD CONSTRAINT "CablePayment_positive_amount" CHECK ("amount" > 0);
    END IF;
END $$;
