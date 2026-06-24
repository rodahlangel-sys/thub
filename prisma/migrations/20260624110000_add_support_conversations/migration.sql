-- CreateTable
CREATE TABLE `SupportConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupportConversation_userId_key`(`userId`),
    INDEX `SupportConversation_lastMessageAt_idx`(`lastMessageAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `SupportMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderUserId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `SupportMessage_senderUserId_idx`(`senderUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- AddForeignKey
ALTER TABLE `SupportConversation` ADD CONSTRAINT `SupportConversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `SupportConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
