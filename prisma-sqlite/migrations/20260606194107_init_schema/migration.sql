/*
  Warnings:

  - You are about to drop the `RefundRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TutorOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TutorRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `summary` on the `LessonFeedback` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `ParentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `ParentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `revieweeId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `reviewerId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `TutorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRateMax` on the `TutorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRateMin` on the `TutorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `serviceDistricts` on the `TutorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `teachableSubjects` on the `TutorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `university` on the `TutorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `TutorProfile` table. All the data in the column will be lost.
  - Added the required column `content` to the `LessonFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextSuggestion` to the `LessonFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `problems` to the `LessonFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentPerformance` to the `LessonFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tutorId` to the `LessonFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressDetail` to the `ParentProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `area` to the `ParentProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `childInfo` to the `ParentProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comment` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overallScore` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreAcceptance` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreClarity` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreCommunication` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scorePunctuality` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tutorId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `areas` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `availableTimes` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `experience` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introduction` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceMax` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceMin` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `school` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjects` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teachLevels` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teachMode` to the `TutorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RefundRequest_orderId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RefundRequest";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TutorOrder";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TutorRequest";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "childGrade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "teachMode" TEXT NOT NULL,
    "expectedTime" TEXT NOT NULL,
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Demand_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
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
    "status" TEXT NOT NULL DEFAULT 'PENDING_TUTOR_CONFIRM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "transactionNo" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "refundAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Refund_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LessonFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "studentPerformance" TEXT NOT NULL,
    "problems" TEXT NOT NULL,
    "nextSuggestion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonFeedback_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LessonFeedback" ("createdAt", "id", "orderId", "updatedAt") SELECT "createdAt", "id", "orderId", "updatedAt" FROM "LessonFeedback";
DROP TABLE "LessonFeedback";
ALTER TABLE "new_LessonFeedback" RENAME TO "LessonFeedback";
CREATE UNIQUE INDEX "LessonFeedback_orderId_key" ON "LessonFeedback"("orderId");
CREATE INDEX "LessonFeedback_tutorId_idx" ON "LessonFeedback"("tutorId");
CREATE TABLE "new_ParentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "addressDetail" TEXT NOT NULL,
    "childInfo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParentProfile" ("createdAt", "id", "updatedAt", "userId") SELECT "createdAt", "id", "updatedAt", "userId" FROM "ParentProfile";
DROP TABLE "ParentProfile";
ALTER TABLE "new_ParentProfile" RENAME TO "ParentProfile";
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "scorePunctuality" INTEGER NOT NULL,
    "scoreClarity" INTEGER NOT NULL,
    "scoreCommunication" INTEGER NOT NULL,
    "scoreAcceptance" INTEGER NOT NULL,
    "overallScore" REAL NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("createdAt", "id", "orderId") SELECT "createdAt", "id", "orderId" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX "Review_parentId_idx" ON "Review"("parentId");
CREATE INDEX "Review_tutorId_idx" ON "Review"("tutorId");
CREATE TABLE "new_TutorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "subjects" TEXT NOT NULL,
    "teachLevels" TEXT NOT NULL,
    "areas" TEXT NOT NULL,
    "teachMode" TEXT NOT NULL,
    "availableTimes" TEXT NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "introduction" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "certificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "certificationNote" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TutorProfile" ("createdAt", "grade", "id", "major", "updatedAt", "userId") SELECT "createdAt", "grade", "id", "major", "updatedAt", "userId" FROM "TutorProfile";
DROP TABLE "TutorProfile";
ALTER TABLE "new_TutorProfile" RENAME TO "TutorProfile";
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "id", "name", "passwordHash", "phone", "role", "status", "updatedAt") SELECT "createdAt", "id", "name", "passwordHash", "phone", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Demand_parentId_idx" ON "Demand"("parentId");

-- CreateIndex
CREATE INDEX "Demand_status_idx" ON "Demand"("status");

-- CreateIndex
CREATE INDEX "Order_parentId_idx" ON "Order"("parentId");

-- CreateIndex
CREATE INDEX "Order_tutorId_idx" ON "Order"("tutorId");

-- CreateIndex
CREATE INDEX "Order_demandId_idx" ON "Order"("demandId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_applicantId_idx" ON "Refund"("applicantId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");
