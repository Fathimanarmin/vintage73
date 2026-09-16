-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultLabelDesignId" INTEGER;

-- CreateTable
CREATE TABLE "BarcodeTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rawZpl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeTemplate_name_key" ON "BarcodeTemplate"("name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultLabelDesignId_fkey" FOREIGN KEY ("defaultLabelDesignId") REFERENCES "BarcodeTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
