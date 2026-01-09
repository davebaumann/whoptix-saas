-- ============================================================================
-- JUSTSKU Demo Database Setup
-- Auto-generated from EF Core migrations
-- Run this script against justsku_demo database to populate schema
-- ============================================================================

-- Create the migration history table first
CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` nvarchar(150) NOT NULL,
    `ProductVersion` nvarchar(32) NOT NULL,
    PRIMARY KEY (`MigrationId`)
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 1. Initial Create Tables (20251103163639_InitialCreate)
-- ============================================================================

CREATE TABLE `AspNetRoles` (
    `Id` varchar(255) NOT NULL,
    `Name` varchar(256) NULL,
    `NormalizedName` varchar(256) NULL,
    `ConcurrencyStamp` longtext NULL,
    PRIMARY KEY (`Id`),
    KEY `RoleNameIndex` (`NormalizedName`)
) CHARACTER SET utf8mb4;

CREATE TABLE `AspNetUsers` (
    `Id` varchar(255) NOT NULL,
    `UserName` varchar(256) NULL,
    `NormalizedUserName` varchar(256) NULL,
    `Email` varchar(256) NULL,
    `NormalizedEmail` varchar(256) NULL,
    `EmailConfirmed` tinyint(1) NOT NULL,
    `PasswordHash` longtext NULL,
    `SecurityStamp` longtext NULL,
    `ConcurrencyStamp` longtext NULL,
    `PhoneNumber` longtext NULL,
    `PhoneNumberConfirmed` tinyint(1) NOT NULL,
    `TwoFactorEnabled` tinyint(1) NOT NULL,
    `LockoutEnd` datetime(6) NULL,
    `LockoutEnabled` tinyint(1) NOT NULL,
    `AccessFailedCount` int NOT NULL,
    `CustomerId` int NULL,
    `IsEmailVerificationPending` tinyint(1) NOT NULL DEFAULT 0,
    `EmailVerificationToken` longtext NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`Id`),
    KEY `EmailIndex` (`NormalizedEmail`),
    KEY `UserNameIndex` (`NormalizedUserName`)
) CHARACTER SET utf8mb4;

CREATE TABLE `Tenants` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` longtext NOT NULL,
    `TenantToken` longtext NULL,
    `UserToken` longtext NULL,
    `AccountId` int NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET utf8mb4;

CREATE TABLE `AspNetRoleClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `RoleId` varchar(255) NOT NULL,
    `ClaimType` longtext NULL,
    `ClaimValue` longtext NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_AspNetRoleClaims_RoleId` (`RoleId`),
    CONSTRAINT `FK_AspNetRoleClaims_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE `AspNetUserClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `UserId` varchar(255) NOT NULL,
    `ClaimType` longtext NULL,
    `ClaimValue` longtext NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_AspNetUserClaims_UserId` (`UserId`),
    CONSTRAINT `FK_AspNetUserClaims_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE `AspNetUserLogins` (
    `LoginProvider` varchar(128) NOT NULL,
    `ProviderKey` varchar(128) NOT NULL,
    `ProviderDisplayName` longtext NULL,
    `UserId` varchar(255) NOT NULL,
    PRIMARY KEY (`LoginProvider`, `ProviderKey`),
    KEY `IX_AspNetUserLogins_UserId` (`UserId`),
    CONSTRAINT `FK_AspNetUserLogins_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE `AspNetUserRoles` (
    `UserId` varchar(255) NOT NULL,
    `RoleId` varchar(255) NOT NULL,
    PRIMARY KEY (`UserId`, `RoleId`),
    KEY `IX_AspNetUserRoles_RoleId` (`RoleId`),
    CONSTRAINT `FK_AspNetUserRoles_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_AspNetUserRoles_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE `AspNetUserTokens` (
    `UserId` varchar(255) NOT NULL,
    `LoginProvider` varchar(128) NOT NULL,
    `Name` varchar(128) NOT NULL,
    `Value` longtext NULL,
    PRIMARY KEY (`UserId`, `LoginProvider`, `Name`),
    CONSTRAINT `FK_AspNetUserTokens_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE `Customers` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ExternalId` varchar(255) NOT NULL,
    `Name` longtext NOT NULL,
    `Email` longtext NOT NULL,
    `TenantId` int NOT NULL,
    `MembershipLevel` int NOT NULL DEFAULT 0,
    `IsActive` tinyint(1) NOT NULL DEFAULT 1,
    `CreatedAt` datetime(6) NOT NULL,
    `SkuVaultEmail` longtext NULL,
    `SkuVaultPassword` longtext NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Customers_ExternalId` (`ExternalId`),
    KEY `IX_Customers_TenantId` (`TenantId`),
    CONSTRAINT `FK_Customers_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `Tenants` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 2. Add SkuVault Models (20251106164851_AddSkuVaultModels)
-- ============================================================================

CREATE TABLE `SkuVaultInventory` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ProductId` int NOT NULL,
    `LocationId` int NOT NULL,
    `Quantity` int NOT NULL,
    `SyncedAt` datetime(6) NOT NULL,
    `CustomerId` int NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_SkuVaultInventory_ProductId` (`ProductId`),
    KEY `IX_SkuVaultInventory_CustomerId` (`CustomerId`),
    CONSTRAINT `FK_SkuVaultInventory_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE `InventoryLevels` (
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
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 3. Add InventoryMovement Context (20251110155754_AddInventoryMovementContext)
-- ============================================================================

CREATE TABLE `InventoryMovements` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ProductId` int NOT NULL,
    `LocationId` int NOT NULL,
    `QuantityBefore` int NOT NULL,
    `QuantityAfter` int NOT NULL,
    `MovementType` longtext NOT NULL,
    `Reason` longtext NULL,
    `MovedAt` datetime(6) NOT NULL,
    `CustomerId` int NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_InventoryMovements_CustomerId` (`CustomerId`),
    CONSTRAINT `FK_InventoryMovements_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 4. Add Transaction Table (20251112205354_AddTransactionTableNoFK)
-- ============================================================================

CREATE TABLE `Transactions` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ExternalId` varchar(255) NOT NULL,
    `CustomerId` int NOT NULL,
    `Amount` decimal(18,2) NOT NULL,
    `Type` longtext NOT NULL,
    `Status` longtext NOT NULL,
    `Description` longtext NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Transactions_CustomerId` (`CustomerId`),
    KEY `IX_Transactions_ExternalId` (`ExternalId`),
    CONSTRAINT `FK_Transactions_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 5. Add Low Stock Thresholds (20251113225259_AddLowStockThresholds)
-- ============================================================================

CREATE TABLE `LowStockThresholds` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ProductId` int NOT NULL,
    `LocationId` int NULL,
    `ThresholdQuantity` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    `CreatedBy` longtext NOT NULL,
    `UpdatedBy` longtext NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_LowStockThresholds_CustomerId` (`CustomerId`),
    KEY `IX_LowStockThresholds_ProductId` (`ProductId`),
    KEY `IX_LowStockThresholds_LocationId` (`LocationId`),
    CONSTRAINT `FK_LowStockThresholds_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 6. Add Membership Level (20251116000323_AddMembershipLevelToCustomer)
-- ============================================================================

-- Column already added to Customers in initial create

-- ============================================================================
-- 7. Add Notification Preferences (20251120201848_AddCustomerNotificationPreferences)
-- ============================================================================

CREATE TABLE `CustomerNotificationPreferences` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `NotificationType` longtext NOT NULL,
    `Email` tinyint(1) NOT NULL,
    `Push` tinyint(1) NOT NULL,
    `InApp` tinyint(1) NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_CustomerNotificationPreferences_CustomerId` (`CustomerId`),
    CONSTRAINT `FK_CustomerNotificationPreferences_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 8. Add Sales Table (20251128195814_AddSalesTable)
-- ============================================================================

CREATE TABLE `Sales` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ExternalId` varchar(255) NOT NULL,
    `CustomerId` int NOT NULL,
    `Total` decimal(18,2) NOT NULL,
    `SaleDate` datetime(6) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Sales_CustomerId` (`CustomerId`),
    KEY `IX_Sales_ExternalId` (`ExternalId`),
    CONSTRAINT `FK_Sales_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 9. Add User Invitations (20251218191829_AddUserInvitationsTable)
-- ============================================================================

CREATE TABLE `UserInvitations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `Email` longtext NOT NULL,
    `InvitationToken` longtext NOT NULL,
    `InvitationTokenExpiry` datetime(6) NOT NULL,
    `IsAccepted` tinyint(1) NOT NULL DEFAULT 0,
    `AcceptedAt` datetime(6) NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `CreatedBy` longtext NOT NULL,
    `UpdatedAtUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_UserInvitations_CustomerId` (`CustomerId`),
    CONSTRAINT `FK_UserInvitations_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- ============================================================================
-- 10. Add Customer ID to User (20251214205837_AddCustomerIdToUser)
-- ============================================================================

-- Column already added to AspNetUsers in initial create

-- ============================================================================
-- 11. Add Production Admin User & Migration History (20260103_AddProductionAdminUser + 20260104_AddMissingAspNetUserColumns)
-- ============================================================================

-- Insert migration history records
INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES 
    ('20251103163639_InitialCreate', '8.0.11'),
    ('20251106164851_AddSkuVaultModels', '8.0.11'),
    ('20251110155754_AddInventoryMovementContext', '8.0.11'),
    ('20251112205354_AddTransactionTableNoFK', '8.0.11'),
    ('20251113225259_AddLowStockThresholds', '8.0.11'),
    ('20251113221347_AddLowStockThreshold', '8.0.11'),
    ('20251116000323_AddMembershipLevelToCustomer', '8.0.11'),
    ('20251120201848_AddCustomerNotificationPreferences', '8.0.11'),
    ('20251128195814_AddSalesTable', '8.0.11'),
    ('20251214205837_AddCustomerIdToUser', '8.0.11'),
    ('20251218191829_AddUserInvitationsTable', '8.0.11'),
    ('20260103_AddProductionAdminUser', '8.0.11'),
    ('20260104_AddMissingAspNetUserColumns', '8.0.11')
ON DUPLICATE KEY UPDATE `MigrationId` = `MigrationId`;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- Demo database is now ready with all required tables and indexes.
-- You can now run the application against justsku_demo database.
-- ============================================================================
