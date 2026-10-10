-- CreateTable
CREATE TABLE "DayClose" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "businessDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "salesSummary" JSONB,
    "physicalCash" DECIMAL(10,2),
    "cashDifference" DECIMAL(10,2),
    "notes" TEXT,
    "finalizedById" INTEGER,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffDayClose" (
    "id" SERIAL NOT NULL,
    "dayCloseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "salesSummary" JSONB NOT NULL,
    "physicalCash" DECIMAL(10,2) NOT NULL,
    "cashDifference" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "denomination" JSONB,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDayClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayClose_branchId_businessDate_key" ON "DayClose"("branchId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "StaffDayClose_dayCloseId_userId_key" ON "StaffDayClose"("dayCloseId", "userId");

-- AddForeignKey
ALTER TABLE "DayClose" ADD CONSTRAINT "DayClose_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayClose" ADD CONSTRAINT "DayClose_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDayClose" ADD CONSTRAINT "StaffDayClose_dayCloseId_fkey" FOREIGN KEY ("dayCloseId") REFERENCES "DayClose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDayClose" ADD CONSTRAINT "StaffDayClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
