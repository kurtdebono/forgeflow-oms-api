-- CreateEnum
CREATE TYPE "OrderAnalysisPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "OrderAnalysis" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "priority" "OrderAnalysisPriority" NOT NULL,
    "riskFlags" JSONB NOT NULL,
    "missingInformation" JSONB NOT NULL,
    "recommendedActions" JSONB NOT NULL,
    "customerExplanation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAnalysis_orderId_idx" ON "OrderAnalysis"("orderId");

-- CreateIndex
CREATE INDEX "OrderAnalysis_priority_idx" ON "OrderAnalysis"("priority");

-- AddForeignKey
ALTER TABLE "OrderAnalysis" ADD CONSTRAINT "OrderAnalysis_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
