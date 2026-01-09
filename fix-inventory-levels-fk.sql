-- ============================================================================
-- RECREATE INVENTORY LEVELS TABLE WITH CORRECT SCHEMA
-- ============================================================================

USE justsku_demo;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables
DROP TABLE `InventoryLevels`;
DROP TABLE `SkuVaultProducts`;
DROP TABLE `SkuVaultLocations`;

-- Recreate InventoryLevels with correct schema and FKs
CREATE TABLE `InventoryLevels` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NOT NULL,
    `QuantityOnHand` int NOT NULL,
    `QuantityAvailable` int NOT NULL,
    `QuantityAllocated` int NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_InventoryLevels_CustomerId_ProductId_LocationId` (`CustomerId`, `ProductId`, `LocationId`),
    CONSTRAINT `FK_InventoryLevels_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_InventoryLevels_Products_ProductId` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_InventoryLevels_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'InventoryLevels table recreated successfully with correct schema.' as Status;
