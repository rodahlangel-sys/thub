-- Add an optional business idempotency key. Existing notifications remain intact.
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "Notification_dedupeKey_key"
ON "Notification"("dedupeKey");

-- Prisma schema cannot express a SQLite partial unique index. This guarantees
-- one current school proof while still retaining rejected historical proofs.
CREATE UNIQUE INDEX "TutorVerificationDocument_one_active_school_proof"
ON "TutorVerificationDocument"("tutorProfileId")
WHERE "type" IN ('STUDENT_CARD', 'ENROLLMENT_PROOF')
  AND "status" IN ('DRAFT', 'SUBMITTED', 'APPROVED');
