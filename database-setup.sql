-- Production Database Setup for JUSTSKU on AWS RDS
-- This script creates the production database and all required tables
-- NOTE: The 'admin' user is already created in AWS RDS during instance setup

CREATE DATABASE IF NOT EXISTS justsku_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE justsku_prod;

-- ============================================================================
-- IDENTITY TABLES (ASP.NET Core Identity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `AspNetRoles` (
    `Id` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(256) CHARACTER SET utf8mb4 NULL,
    `NormalizedName` varchar(256) CHARACTER SET utf8mb4 NULL,
    `ConcurrencyStamp` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `RoleNameIndex` (`NormalizedName`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AspNetUsers` (
    `Id` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `UserName` varchar(256) CHARACTER SET utf8mb4 NULL,
    `NormalizedUserName` varchar(256) CHARACTER SET utf8mb4 NULL,
    `Email` varchar(256) CHARACTER SET utf8mb4 NULL,
    `NormalizedEmail` varchar(256) CHARACTER SET utf8mb4 NULL,
    `EmailConfirmed` tinyint(1) NOT NULL,
    `PasswordHash` longtext CHARACTER SET utf8mb4 NULL,
    `SecurityStamp` longtext CHARACTER SET utf8mb4 NULL,
    `ConcurrencyStamp` longtext CHARACTER SET utf8mb4 NULL,
    `PhoneNumber` longtext CHARACTER SET utf8mb4 NULL,
    `PhoneNumberConfirmed` tinyint(1) NOT NULL,
    `TwoFactorEnabled` tinyint(1) NOT NULL,
    `LockoutEnd` datetime(6) NULL,
    `LockoutEnabled` tinyint(1) NOT NULL,
    `AccessFailedCount` int NOT NULL,
    `CustomerId` int NULL,
    `CustomerRole` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UserNameIndex` (`NormalizedUserName`),
    KEY `EmailIndex` (`NormalizedEmail`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AspNetUserRoles` (
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `RoleId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    PRIMARY KEY (`UserId`, `RoleId`),
    KEY `IX_AspNetUserRoles_RoleId` (`RoleId`),
    CONSTRAINT `FK_AspNetUserRoles_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_AspNetUserRoles_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AspNetUserClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ClaimType` longtext CHARACTER SET utf8mb4 NULL,
    `ClaimValue` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_AspNetUserClaims_UserId` (`UserId`),
    CONSTRAINT `FK_AspNetUserClaims_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AspNetUserLogins` (
    `LoginProvider` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `ProviderKey` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `ProviderDisplayName` longtext CHARACTER SET utf8mb4 NULL,
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    PRIMARY KEY (`LoginProvider`, `ProviderKey`),
    KEY `IX_AspNetUserLogins_UserId` (`UserId`),
    CONSTRAINT `FK_AspNetUserLogins_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AspNetUserTokens` (
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `LoginProvider` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `Value` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`UserId`, `LoginProvider`, `Name`),
    CONSTRAINT `FK_AspNetUserTokens_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AspNetRoleClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `RoleId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ClaimType` longtext CHARACTER SET utf8mb4 NULL,
    `ClaimValue` longtext CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_AspNetRoleClaims_RoleId` (`RoleId`),
    CONSTRAINT `FK_AspNetRoleClaims_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- ============================================================================
-- CUSTOM APPLICATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `Tenants` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `SkuVaultEmail` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultPassword` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultAccountId` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultTenantToken` longtext CHARACTER SET utf8mb4 NULL,
    `SkuVaultUserToken` longtext CHARACTER SET utf8mb4 NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Customers` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ExternalId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `TenantId` int NOT NULL,
    `MembershipLevel` int NOT NULL,
    `LastSyncedAt` datetime(6) NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT 1,
    `CancelledAt` datetime(6) NULL,
    `ScheduledForDeletion` datetime(6) NULL,
    `StripeCustomerId` longtext CHARACTER SET utf8mb4 NULL,
    `LowStockNotificationsEnabled` tinyint(1) NOT NULL,
    `LowStockNotificationEmail` longtext CHARACTER SET utf8mb4 NULL,
    `LowStockCheckIntervalMinutes` int NOT NULL DEFAULT 240,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_Customers_ExternalId` (`ExternalId`(255)),
    KEY `IX_Customers_TenantId` (`TenantId`),
    KEY `IX_Customers_IsActive_CancelledAt` (`IsActive`, `CancelledAt`),
    KEY `IX_Customers_ScheduledForDeletion` (`ScheduledForDeletion`),
    CONSTRAINT `FK_Customers_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `Tenants` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

ALTER TABLE `AspNetUsers` 
ADD CONSTRAINT `FK_AspNetUsers_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `Products` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Sku` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Description` longtext CHARACTER SET utf8mb4 NULL,
    `Category` longtext CHARACTER SET utf8mb4 NULL,
    `Cost` decimal(18,2) NULL,
    `Price` decimal(18,2) NULL,
    `CustomerId` int NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Products_CustomerId_Sku` (`CustomerId`, `Sku`(128)),
    CONSTRAINT `FK_Products_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Locations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `Code` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NULL,
    `Warehouse` longtext CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT 1,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Locations_CustomerId_Code` (`CustomerId`, `Code`(128)),
    CONSTRAINT `FK_Locations_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `InventoryLevels` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NOT NULL,
    `QuantityOnHand` int NOT NULL DEFAULT 0,
    `QuantityAvailable` int NOT NULL DEFAULT 0,
    `QuantityAllocated` int NOT NULL DEFAULT 0,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_InventoryLevels_CustomerId_ProductId_LocationId` (`CustomerId`, `ProductId`, `LocationId`),
    KEY `IX_InventoryLevels_ProductId` (`ProductId`),
    KEY `IX_InventoryLevels_LocationId` (`LocationId`),
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
    `Price` decimal(18,2) NOT NULL DEFAULT 0,
    `CustomerName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CustomerEmail` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CustomerId` int NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Sales_CustomerId` (`CustomerId`),
    KEY `IX_Sales_SaleDate` (`SaleDate`),
    CONSTRAINT `FK_Sales_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

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
    PRIMARY KEY (`Id`),
    KEY `IX_LowStockThresholds_CustomerId_ProductId_LocationId` (`CustomerId`, `ProductId`, `LocationId`),
    KEY `IX_LowStockThresholds_ProductId` (`ProductId`),
    KEY `IX_LowStockThresholds_LocationId` (`LocationId`)
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
    `CreatedDateUtc` datetime(6) NOT NULL,
    `UpdatedDateUtc` datetime(6) NOT NULL,
    `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
    `ShippingCost` decimal(18,2) NOT NULL,
    `RecipientName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientAddress` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCity` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientState` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientZip` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCountry` longtext CHARACTER SET utf8mb4 NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_Shipments_CustomerId_ShipmentId` (`CustomerId`, `ShipmentId`),
    KEY `IX_Shipments_OrderId` (OrderId(255)),
    KEY `IX_Shipments_ShippedDate` (`ShippedDate`),
    CONSTRAINT `FK_Shipments_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `UserInvitations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Role` int NOT NULL,
    `InvitationToken` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `InvitedByUserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `ExpiresAt` datetime(6) NOT NULL,
    `IsAccepted` tinyint(1) NOT NULL,
    `AcceptedAt` datetime(6) NULL,
    `AcceptedByUserId` varchar(255) CHARACTER SET utf8mb4 NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_UserInvitations_InvitationToken` (`InvitationToken`),
    KEY `IX_UserInvitations_CustomerId` (`CustomerId`),
    KEY `IX_UserInvitations_InvitedByUserId` (`InvitedByUserId`),
    KEY `IX_UserInvitations_AcceptedByUserId` (`AcceptedByUserId`),
    CONSTRAINT `FK_UserInvitations_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_UserInvitations_AspNetUsers_InvitedByUserId` FOREIGN KEY (`InvitedByUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_UserInvitations_AspNetUsers_AcceptedByUserId` FOREIGN KEY (`AcceptedByUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE SET NULL
) CHARACTER SET=utf8mb4;

-- ============================================================================
-- MIGRATIONS HISTORY (for Entity Framework)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

-- Verify database created
SELECT 'Production database schema created successfully!' as Status;
SHOW TABLES;