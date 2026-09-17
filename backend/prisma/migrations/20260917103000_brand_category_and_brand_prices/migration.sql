-- AlterTable
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "categoryId" INTEGER;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "categoryName" TEXT;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "categoryIds" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brandPrices" JSONB;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Brand_categoryId_fkey'
  ) THEN
    ALTER TABLE "Brand" ADD CONSTRAINT "Brand_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
