-- Add QRCODE two-step payment support without touching existing rows.
ALTER TABLE `Order`
  MODIFY `status` ENUM(
    'PENDING_TUTOR_CONFIRM',
    'PENDING_PAYMENT',
    'WAIT_PLATFORM_CONFIRM',
    'WAIT_TUTOR_PAYMENT',
    'WAIT_TUTOR_CONFIRM',
    'ESCROWED',
    'IN_PROGRESS',
    'PENDING_PARENT_CONFIRM',
    'COMPLETED',
    'REFUND_REQUESTED',
    'REFUNDED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING_TUTOR_CONFIRM';

ALTER TABLE `Payment`
  ADD COLUMN `platformAmountFen` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `tutorAmountFen` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `platformConfirmedAt` DATETIME(3) NULL,
  ADD COLUMN `platformConfirmedById` VARCHAR(191) NULL,
  ADD COLUMN `tutorPaymentMarkedAt` DATETIME(3) NULL,
  ADD COLUMN `tutorConfirmedAt` DATETIME(3) NULL;

CREATE TABLE `PlatformPaymentQrCode` (
  `id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` ENUM('WECHAT', 'ALIPAY') NOT NULL,
  `storageKey` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `originalName` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `mimeType` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `updatedById` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PlatformPaymentQrCode_type_key`(`type`),
  UNIQUE INDEX `PlatformPaymentQrCode_storageKey_key`(`storageKey`),
  INDEX `PlatformPaymentQrCode_updatedById_idx`(`updatedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `TutorPaymentQrCode` (
  `id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tutorProfileId` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` ENUM('WECHAT', 'ALIPAY') NOT NULL,
  `storageKey` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `originalName` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `mimeType` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TutorPaymentQrCode_storageKey_key`(`storageKey`),
  UNIQUE INDEX `TutorPaymentQrCode_tutorProfileId_type_key`(`tutorProfileId`, `type`),
  INDEX `TutorPaymentQrCode_tutorProfileId_idx`(`tutorProfileId`),
  INDEX `TutorPaymentQrCode_type_idx`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

ALTER TABLE `PlatformPaymentQrCode`
  ADD CONSTRAINT `PlatformPaymentQrCode_updatedById_fkey`
  FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TutorPaymentQrCode`
  ADD CONSTRAINT `TutorPaymentQrCode_tutorProfileId_fkey`
  FOREIGN KEY (`tutorProfileId`) REFERENCES `TutorProfile`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
