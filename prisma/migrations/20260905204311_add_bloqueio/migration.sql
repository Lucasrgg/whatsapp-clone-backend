-- CreateTable
CREATE TABLE `Bloqueio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bloqueadorId` INTEGER NOT NULL,
    `bloqueadoId` INTEGER NOT NULL,

    UNIQUE INDEX `Bloqueio_bloqueadorId_bloqueadoId_key`(`bloqueadorId`, `bloqueadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bloqueio` ADD CONSTRAINT `Bloqueio_bloqueadorId_fkey` FOREIGN KEY (`bloqueadorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bloqueio` ADD CONSTRAINT `Bloqueio_bloqueadoId_fkey` FOREIGN KEY (`bloqueadoId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
