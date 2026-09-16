-- DropIndex
DROP INDEX IF EXISTS "Product_barcode_key";

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_barcode_key" ON "Brand"("barcode");
