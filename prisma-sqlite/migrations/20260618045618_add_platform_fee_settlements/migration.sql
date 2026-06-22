-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "grossAmountFen" INTEGER NOT NULL,
    "platformFeeRateBps" INTEGER NOT NULL,
    "platformFeeAmountFen" INTEGER NOT NULL,
    "tutorNetAmountFen" INTEGER NOT NULL,
    "transactionNo" TEXT,
    "settledAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Settlement_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- A small number of orders created after the server-price hardening stored yuan
-- while the established order/payment fields store fen. Normalize those rows
-- before rebuilding Order so all historical snapshots use one unit.
UPDATE "Payment"
SET "amount" = "amount" * 100
WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "hourlyPrice" < 1000);

UPDATE "Refund"
SET "refundAmount" = "refundAmount" * 100
WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "hourlyPrice" < 1000);

CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "demandId" TEXT,
    "subject" TEXT NOT NULL,
    "scheduledTime" DATETIME NOT NULL,
    "teachMode" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "hourlyPrice" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "serviceFee" INTEGER NOT NULL,
    "platformFeeRateBps" INTEGER NOT NULL DEFAULT 500,
    "platformFeeAmountFen" INTEGER NOT NULL DEFAULT 0,
    "tutorNetAmountFen" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING_TUTOR_CONFIRM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" (
    "createdAt",
    "demandId",
    "hourlyPrice",
    "hours",
    "id",
    "location",
    "parentId",
    "scheduledTime",
    "serviceFee",
    "platformFeeRateBps",
    "platformFeeAmountFen",
    "tutorNetAmountFen",
    "status",
    "subject",
    "teachMode",
    "totalAmount",
    "tutorId",
    "updatedAt"
)
SELECT
    "createdAt",
    "demandId",
    CASE WHEN "hourlyPrice" < 1000 THEN "hourlyPrice" * 100 ELSE "hourlyPrice" END,
    "hours",
    "id",
    "location",
    "parentId",
    "scheduledTime",
    CASE WHEN "hourlyPrice" < 1000 THEN "serviceFee" * 100 ELSE "serviceFee" END,
    500,
    CAST(((CASE WHEN "hourlyPrice" < 1000 THEN "totalAmount" * 100 ELSE "totalAmount" END) * 500 + 5000) / 10000 AS INTEGER),
    (CASE WHEN "hourlyPrice" < 1000 THEN "totalAmount" * 100 ELSE "totalAmount" END) -
      CAST(((CASE WHEN "hourlyPrice" < 1000 THEN "totalAmount" * 100 ELSE "totalAmount" END) * 500 + 5000) / 10000 AS INTEGER),
    "status",
    "subject",
    "teachMode",
    CASE WHEN "hourlyPrice" < 1000 THEN "totalAmount" * 100 ELSE "totalAmount" END,
    "tutorId",
    "updatedAt"
FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_parentId_idx" ON "Order"("parentId");
CREATE INDEX "Order_tutorId_idx" ON "Order"("tutorId");
CREATE INDEX "Order_demandId_idx" ON "Order"("demandId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE UNIQUE INDEX "Order_demandId_tutorId_key" ON "Order"("demandId", "tutorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_orderId_key" ON "Settlement"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_transactionNo_key" ON "Settlement"("transactionNo");

-- CreateIndex
CREATE INDEX "Settlement_tutorId_idx" ON "Settlement"("tutorId");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- CreateIndex
CREATE INDEX "Settlement_settledAt_idx" ON "Settlement"("settledAt");
