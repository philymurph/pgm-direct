-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "gtin" TEXT,
ADD COLUMN "googleProductCategory" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_gtin_key" ON "Product"("gtin");
