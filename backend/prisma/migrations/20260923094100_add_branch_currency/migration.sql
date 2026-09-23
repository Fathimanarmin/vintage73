-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "currencyCode" TEXT DEFAULT 'INR',
ADD COLUMN     "currencySymbol" TEXT DEFAULT '₹';
