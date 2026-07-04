-- SQLite rollback archive for QRCODE two-step payment support.
CREATE TABLE "PlatformPaymentQrCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "updatedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PlatformPaymentQrCode_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PlatformPaymentQrCode_type_key"
  ON "PlatformPaymentQrCode"("type");

CREATE UNIQUE INDEX "PlatformPaymentQrCode_storageKey_key"
  ON "PlatformPaymentQrCode"("storageKey");

CREATE INDEX "PlatformPaymentQrCode_updatedById_idx"
  ON "PlatformPaymentQrCode"("updatedById");

CREATE TABLE "TutorPaymentQrCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tutorProfileId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TutorPaymentQrCode_tutorProfileId_fkey"
    FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TutorPaymentQrCode_storageKey_key"
  ON "TutorPaymentQrCode"("storageKey");

CREATE UNIQUE INDEX "TutorPaymentQrCode_tutorProfileId_type_key"
  ON "TutorPaymentQrCode"("tutorProfileId", "type");

CREATE INDEX "TutorPaymentQrCode_tutorProfileId_idx"
  ON "TutorPaymentQrCode"("tutorProfileId");

CREATE INDEX "TutorPaymentQrCode_type_idx"
  ON "TutorPaymentQrCode"("type");

ALTER TABLE "Payment" ADD COLUMN "platformAmountFen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "tutorAmountFen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "platformConfirmedAt" DATETIME;
ALTER TABLE "Payment" ADD COLUMN "platformConfirmedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN "tutorPaymentMarkedAt" DATETIME;
ALTER TABLE "Payment" ADD COLUMN "tutorConfirmedAt" DATETIME;
