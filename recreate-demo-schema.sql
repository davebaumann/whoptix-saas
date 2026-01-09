-- ============================================================================
-- DEMO DATABASE COMPLETE SCHEMA RECREATION
-- ============================================================================
-- This script drops and recreates all tables in justsku_demo to match
-- current production schema

USE justsku_demo;

-- Drop all existing tables
DROP TABLE IF EXISTS `UserInvitations`;
DROP TABLE IF EXISTS `AspNetUserTokens`;
DROP TABLE IF EXISTS `AspNetUserRoles`;
DROP TABLE IF EXISTS `AspNetUserLogins`;
DROP TABLE IF EXISTS `AspNetUserClaims`;
DROP TABLE IF EXISTS `AspNetUsers`;
DROP TABLE IF EXISTS `AspNetRoleClaims`;
DROP TABLE IF EXISTS `AspNetRoles`;
DROP TABLE IF EXISTS `Shipments`;
DROP TABLE IF EXISTS `Transactions`;
DROP TABLE IF EXISTS `Sales`;
DROP TABLE IF EXISTS `LowStockThresholds`;
DROP TABLE IF EXISTS `InventoryMovements`;
DROP TABLE IF EXISTS `InventoryLevels`;
DROP TABLE IF EXISTS `Locations`;
DROP TABLE IF EXISTS `Products`;
DROP TABLE IF EXISTS `CustomerNotificationPreferences`;
DROP TABLE IF EXISTS `Customers`;
DROP TABLE IF EXISTS `Tenants`;

-- ============================================================================
-- RECREATE ALL TABLES WITH CURRENT SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS `Tenants` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `SkuVaultAccountId` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultEmail` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultPassword` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultTenantToken` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultUserToken` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Customers` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ExternalId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `TenantId` int NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `MembershipLevel` int NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    `LastSyncedAt` datetime(6) NOT NULL,
    `LowStockNotificationsEnabled` tinyint(1) NOT NULL,
    `LowStockNotificationEmail` longtext CHARACTER SET utf8mb4 NULL,
    `LowStockCheckIntervalMinutes` int NOT NULL,
    `StripeCustomerId` longtext CHARACTER SET utf8mb4 NULL,
    `CancelledAt` datetime(6) NULL,
    `ScheduledForDeletion` datetime(6) NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Customers_TenantId` (`TenantId`),
    CONSTRAINT `FK_Customers_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `Tenants` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Products` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `Sku` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Description` longtext CHARACTER SET utf8mb4 NULL,
    `Price` decimal(18,2) NULL,
    `Cost` decimal(18,2) NULL,
    `Category` longtext CHARACTER SET utf8mb4 NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Products_CustomerId_Sku` (`CustomerId`, `Sku`),
    CONSTRAINT `FK_Products_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Locations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `Code` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Warehouse` longtext CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Locations_CustomerId_Code` (`CustomerId`, `Code`),
    CONSTRAINT `FK_Locations_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `InventoryLevels` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NOT NULL,
    `Quantity` int NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_InventoryLevels_CustomerId_ProductId_LocationId` (`CustomerId`, `ProductId`, `LocationId`),
    CONSTRAINT `FK_InventoryLevels_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_InventoryLevels_Products_ProductId` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_InventoryLevels_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `InventoryMovements` (
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

CREATE TABLE IF NOT EXISTS `Transactions` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `SkuVaultId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NULL,
    `Sku` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Code` longtext CHARACTER SET utf8mb4 NULL,
    `ScannedCode` longtext CHARACTER SET utf8mb4 NULL,
    `Title` longtext CHARACTER SET utf8mb4 NULL,
    `Quantity` int NOT NULL,
    `QuantityBefore` int NOT NULL,
    `QuantityAfter` int NOT NULL,
    `TransactionType` longtext CHARACTER SET utf8mb4 NULL,
    `TransactionReason` longtext CHARACTER SET utf8mb4 NULL,
    `TransactionNote` longtext CHARACTER SET utf8mb4 NULL,
    `ContextType` longtext CHARACTER SET utf8mb4 NULL,
    `ContextId` longtext CHARACTER SET utf8mb4 NULL,
    `User` longtext CHARACTER SET utf8mb4 NULL,
    `PerformedBy` longtext CHARACTER SET utf8mb4 NULL,
    `TransactionDate` datetime(6) NOT NULL,
    `SyncedAtUtc` datetime(6) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Transactions_CustomerId` (`CustomerId`),
    KEY `IX_Transactions_TransactionDate` (`TransactionDate`),
    CONSTRAINT `FK_Transactions_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Sales` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `SaleId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Sku` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Quantity` int NOT NULL,
    `SaleDate` datetime(6) NOT NULL,
    `Channel` longtext CHARACTER SET utf8mb4 NOT NULL,
    `OrderNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Price` decimal(65,30) NOT NULL,
    `CustomerEmail` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CustomerName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CustomerId` int NOT NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `LowStockThresholds` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NULL,
    `ThresholdQuantity` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_LowStockThresholds_ProductId` (`ProductId`),
    KEY `IX_LowStockThresholds_LocationId` (`LocationId`),
    KEY `IX_LowStockThresholds_CustomerId_ProductId_LocationId` (`CustomerId`, `ProductId`, `LocationId`),
    CONSTRAINT `FK_LowStockThresholds_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_LowStockThresholds_Products_ProductId` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_LowStockThresholds_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE SET NULL
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `CustomerNotificationPreferences` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `NotificationType` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `IsEnabled` tinyint(1) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_CustomerNotificationPreferences_CustomerId` (`CustomerId`),
    CONSTRAINT `FK_CustomerNotificationPreferences_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Shipments` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ShipmentId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `OrderId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `TrackingNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Carrier` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Service` longtext CHARACTER SET utf8mb4 NOT NULL,
    `ShippedDate` datetime(6) NOT NULL,
    `ShippingCost` decimal(18,2) NOT NULL,
    `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientAddress` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCity` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientState` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientZip` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCountry` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CreatedDateUtc` datetime(6) NOT NULL,
    `UpdatedDateUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Shipments_CustomerId_ShipmentId` (`CustomerId`, `ShipmentId`),
    CONSTRAINT `FK_Shipments_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Schema recreation complete. Table count:' as Status;
SELECT COUNT(*) as TableCount FROM information_schema.tables WHERE table_schema = 'justsku_demo';
