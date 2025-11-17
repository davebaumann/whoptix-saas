-- Simple SQL script to create LowStockThresholds table
-- Run this manually in your MySQL database to create the table
-- You can copy and paste this into phpMyAdmin, MySQL Workbench, or any MySQL client

-- Create the table
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

-- Create the indexes (run one at a time if needed)
CREATE INDEX IX_LowStockThresholds_CustomerId_ProductId_LocationId ON LowStockThresholds (CustomerId, ProductId, LocationId);
CREATE INDEX IX_LowStockThresholds_LocationId ON LowStockThresholds (LocationId);
CREATE INDEX IX_LowStockThresholds_ProductId ON LowStockThresholds (ProductId);

-- Mark the migration as applied so Entity Framework knows it exists
INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) 
VALUES ('20251113221347_AddLowStockThreshold', '8.0.11');

-- Verify the table was created
SELECT COUNT(*) as table_exists FROM INFORMATION_SCHEMA.TABLES 
WHERE table_schema = DATABASE() AND table_name = 'LowStockThresholds';