-- AlterTable
ALTER TABLE "price_history" ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "priceType" INTEGER,
ADD COLUMN     "visibilityType" INTEGER,
ADD COLUMN     "visibleOrgs" TEXT;

-- AlterTable
ALTER TABLE "prices" ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "priceType" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "visibilityType" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "visibleOrgs" TEXT;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
