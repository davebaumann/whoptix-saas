-- ============================================================================
-- RECREATE INVENTORY MOVEMENTS TABLE WITH CORRECT SCHEMA
-- ============================================================================

USE justsku_demo;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop the old table
DROP TABLE `InventoryMovements`;

-- Recreate with correct schema matching production
CREATE TABLE `InventoryMovements` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NULL,
    `QuantityChange` int NOT NULL,
    `Reason` longtext CHARACTER SET utf8mb4 NULL,
    `Reference` longtext CHARACTER SET utf8mb4 NULL,
    `PerformedBy` longtext CHARACTER SET utf8mb4 NULL,
    `TransactionType` longtext CHARACTER SET utf8mb4 NULL,
    `Context` longtext CHARACTER SET utf8mb4 NULL,
    `OccurredAtUtc` datetime(6) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_InventoryMovements_CustomerId` (`CustomerId`),
    KEY `IX_InventoryMovements_ProductId` (`ProductId`),
    KEY `IX_InventoryMovements_LocationId` (`LocationId`),
    KEY `IX_InventoryMovements_OccurredAtUtc` (`OccurredAtUtc`),
    CONSTRAINT `FK_InventoryMovements_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_InventoryMovements_Products_ProductId` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_InventoryMovements_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE SET NULL
) CHARACTER SET=utf8mb4;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'InventoryMovements table recreated with production schema.' as Status;
