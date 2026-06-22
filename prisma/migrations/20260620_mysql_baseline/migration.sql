-- This script is only for the empty THub migration-test database.
USE `thub_test`;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('PARENT', 'TUTOR', 'ADMIN') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `termsAcceptedAt` DATETIME(3) NULL,
    `privacyAcceptedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `ParentProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `addressDetail` TEXT NOT NULL,
    `childInfo` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ParentProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `TutorProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `school` VARCHAR(191) NOT NULL,
    `major` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(64) NOT NULL,
    `gender` VARCHAR(32) NOT NULL,
    `subjects` TEXT NOT NULL,
    `teachLevels` TEXT NOT NULL,
    `areas` TEXT NOT NULL,
    `teachMode` ENUM('ONLINE', 'OFFLINE', 'BOTH') NOT NULL,
    `availableTimes` TEXT NOT NULL,
    `priceMin` INTEGER NOT NULL,
    `priceMax` INTEGER NOT NULL,
    `introduction` TEXT NOT NULL,
    `experience` TEXT NOT NULL,
    `certificationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `certificationNote` TEXT NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `orderCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TutorProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `TutorVerificationDocument` (
    `id` VARCHAR(191) NOT NULL,
    `tutorProfileId` VARCHAR(191) NOT NULL,
    `type` ENUM('STUDENT_CARD', 'ENROLLMENT_PROOF', 'CERTIFICATE', 'OTHER') NOT NULL,
    `storageKey` VARCHAR(512) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `rejectionReason` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TutorVerificationDocument_storageKey_key`(`storageKey`),
    INDEX `TutorVerificationDocument_tutorProfileId_idx`(`tutorProfileId`),
    INDEX `TutorVerificationDocument_type_idx`(`type`),
    INDEX `TutorVerificationDocument_status_idx`(`status`),
    INDEX `TutorVerificationDocument_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Demand` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NOT NULL,
    `childGrade` VARCHAR(64) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `goal` TEXT NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `teachMode` ENUM('ONLINE', 'OFFLINE', 'BOTH') NOT NULL,
    `expectedTime` TEXT NOT NULL,
    `budgetMin` INTEGER NOT NULL,
    `budgetMax` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'MATCHED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Demand_parentId_idx`(`parentId`),
    INDEX `Demand_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NOT NULL,
    `tutorId` VARCHAR(191) NOT NULL,
    `demandId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `scheduledTime` DATETIME(3) NOT NULL,
    `teachMode` ENUM('ONLINE', 'OFFLINE', 'BOTH') NOT NULL,
    `location` TEXT NOT NULL,
    `hours` DOUBLE NOT NULL,
    `hourlyPrice` INTEGER NOT NULL,
    `totalAmount` INTEGER NOT NULL,
    `serviceFee` INTEGER NOT NULL,
    `platformFeeRateBps` INTEGER NOT NULL DEFAULT 500,
    `platformFeeAmountFen` INTEGER NOT NULL DEFAULT 0,
    `tutorNetAmountFen` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING_TUTOR_CONFIRM', 'PENDING_PAYMENT', 'ESCROWED', 'IN_PROGRESS', 'PENDING_PARENT_CONFIRM', 'COMPLETED', 'REFUND_REQUESTED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_TUTOR_CONFIRM',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Order_parentId_idx`(`parentId`),
    INDEX `Order_tutorId_idx`(`tutorId`),
    INDEX `Order_demandId_idx`(`demandId`),
    INDEX `Order_status_idx`(`status`),
    UNIQUE INDEX `Order_demandId_tutorId_key`(`demandId`, `tutorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Settlement` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `tutorId` VARCHAR(191) NOT NULL,
    `provider` ENUM('MOCK') NOT NULL DEFAULT 'MOCK',
    `status` ENUM('PENDING', 'SETTLED', 'FAILED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `grossAmountFen` INTEGER NOT NULL,
    `platformFeeRateBps` INTEGER NOT NULL,
    `platformFeeAmountFen` INTEGER NOT NULL,
    `tutorNetAmountFen` INTEGER NOT NULL,
    `transactionNo` VARCHAR(255) NULL,
    `settledAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Settlement_orderId_key`(`orderId`),
    UNIQUE INDEX `Settlement_transactionNo_key`(`transactionNo`),
    INDEX `Settlement_tutorId_idx`(`tutorId`),
    INDEX `Settlement_status_idx`(`status`),
    INDEX `Settlement_settledAt_idx`(`settledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `provider` VARCHAR(64) NOT NULL DEFAULT 'MOCK',
    `status` VARCHAR(64) NOT NULL DEFAULT 'UNPAID',
    `transactionNo` VARCHAR(255) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `applicantId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `refundAmount` INTEGER NOT NULL,
    `previousOrderStatus` ENUM('PENDING_TUTOR_CONFIRM', 'PENDING_PAYMENT', 'ESCROWED', 'IN_PROGRESS', 'PENDING_PARENT_CONFIRM', 'COMPLETED', 'REFUND_REQUESTED', 'REFUNDED', 'CANCELLED') NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `adminNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Refund_orderId_idx`(`orderId`),
    INDEX `Refund_applicantId_idx`(`applicantId`),
    INDEX `Refund_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `LessonFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `tutorId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `studentPerformance` TEXT NOT NULL,
    `problems` TEXT NOT NULL,
    `nextSuggestion` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LessonFeedback_orderId_key`(`orderId`),
    INDEX `LessonFeedback_tutorId_idx`(`tutorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NOT NULL,
    `tutorId` VARCHAR(191) NOT NULL,
    `scorePunctuality` INTEGER NOT NULL,
    `scoreClarity` INTEGER NOT NULL,
    `scoreCommunication` INTEGER NOT NULL,
    `scoreAcceptance` INTEGER NOT NULL,
    `overallScore` DOUBLE NOT NULL,
    `comment` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_orderId_key`(`orderId`),
    INDEX `Review_parentId_idx`(`parentId`),
    INDEX `Review_tutorId_idx`(`tutorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `type` VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    `link` TEXT NULL,
    `dedupeKey` VARCHAR(512) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Notification_dedupeKey_key`(`dedupeKey`),
    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_type_idx`(`type`),
    INDEX `Notification_readAt_idx`(`readAt`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- MySQL equivalent of the SQLite partial unique index from
-- 20260618060000_remaining_p1_constraints. MySQL unique indexes allow
-- multiple NULL values, so only active school-proof rows participate.
ALTER TABLE `TutorVerificationDocument`
    ADD COLUMN `activeSchoolProofTutorId` VARCHAR(191)
        GENERATED ALWAYS AS (
            CASE
                WHEN `type` IN ('STUDENT_CARD', 'ENROLLMENT_PROOF')
                 AND `status` IN ('DRAFT', 'SUBMITTED', 'APPROVED')
                THEN `tutorProfileId`
                ELSE NULL
            END
        ) VIRTUAL,
    ADD UNIQUE INDEX `TutorVerificationDocument_one_active_school_proof` (`activeSchoolProofTutorId`);

-- AddForeignKey
ALTER TABLE `ParentProfile` ADD CONSTRAINT `ParentProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TutorProfile` ADD CONSTRAINT `TutorProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TutorVerificationDocument` ADD CONSTRAINT `TutorVerificationDocument_tutorProfileId_fkey` FOREIGN KEY (`tutorProfileId`) REFERENCES `TutorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TutorVerificationDocument` ADD CONSTRAINT `TutorVerificationDocument_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Demand` ADD CONSTRAINT `Demand_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_demandId_fkey` FOREIGN KEY (`demandId`) REFERENCES `Demand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonFeedback` ADD CONSTRAINT `LessonFeedback_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonFeedback` ADD CONSTRAINT `LessonFeedback_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
