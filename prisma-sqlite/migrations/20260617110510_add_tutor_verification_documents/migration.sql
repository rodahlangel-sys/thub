-- CreateTable
CREATE TABLE "TutorVerificationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tutorProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorVerificationDocument_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TutorVerificationDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorVerificationDocument_storageKey_key" ON "TutorVerificationDocument"("storageKey");

-- CreateIndex
CREATE INDEX "TutorVerificationDocument_tutorProfileId_idx" ON "TutorVerificationDocument"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorVerificationDocument_type_idx" ON "TutorVerificationDocument"("type");

-- CreateIndex
CREATE INDEX "TutorVerificationDocument_status_idx" ON "TutorVerificationDocument"("status");

-- CreateIndex
CREATE INDEX "TutorVerificationDocument_reviewedById_idx" ON "TutorVerificationDocument"("reviewedById");
