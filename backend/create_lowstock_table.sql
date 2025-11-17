-- Create LowStockThresholds table without foreign key constraints
-- This avoids the REFERENCES permission issue in the shared hosting environment

CREATE TABLE IF NOT EXISTS `LowStockThresholds` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NULL,
    `ThresholdQuantity` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NOT NULL,
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

-- Create indexes for performance
CREATE INDEX `IX_LowStockThresholds_CustomerId_ProductId_LocationId` ON `LowStockThresholds` (`CustomerId`, `ProductId`, `LocationId`);
CREATE INDEX `IX_LowStockThresholds_LocationId` ON `LowStockThresholds` (`LocationId`);
CREATE INDEX `IX_LowStockThresholds_ProductId` ON `LowStockThresholds` (`ProductId`);

-- Insert migration history record so EF knows this migration was applied
INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) 
VALUES ('20251113221347_AddLowStockThreshold', '8.0.11')
ON DUPLICATE KEY UPDATE `MigrationId` = `MigrationId`;