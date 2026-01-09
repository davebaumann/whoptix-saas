-- ============================================================================
-- TRANSACTION SCHEMA MIGRATION - MANUAL SQL SCRIPT
-- ============================================================================
-- Execute this script manually to update both production and demo databases
-- 
-- Command line execution:
--   mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p < migration.sql
--
-- Or copy-paste the relevant sections into MySQL Workbench/CLI
-- ============================================================================

-- ============================================================================
-- PART 1: PRODUCTION DATABASE (justsku_prod)
-- ============================================================================

USE justsku_prod;

-- Add new columns to capture SkuVault API data
ALTER TABLE `Transactions` ADD COLUMN `Code` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `ScannedCode` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `Title` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `ContextType` longtext CHARACTER SET utf8mb4 NULL COMMENT 'Type of context (e.g., Sale)';
ALTER TABLE `Transactions` ADD COLUMN `ContextId` longtext CHARACTER SET utf8mb4 NULL COMMENT 'ID from context (e.g., sale ID)';

-- Drop the old flat Context column
ALTER TABLE `Transactions` DROP COLUMN IF EXISTS `Context`;

-- Verify the new structure
DESCRIBE `Transactions`;

-- ============================================================================
-- PART 2: DEMO DATABASE (justsku_demo)
-- ============================================================================

USE justsku_demo;

-- Drop the old financial transactions table
DROP TABLE IF EXISTS `Transactions`;

-- Recreate Transactions table to match production schema exactly
CREATE TABLE `Transactions` (
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
) CHARACTER SET=utf8mb4;

-- Verify the new structure
DESCRIBE `Transactions`;

-- ============================================================================
-- PART 3: DEMO DATABASE - SALES TABLE (justsku_demo)
-- ============================================================================

USE justsku_demo;

-- Drop the old sales table
DROP TABLE IF EXISTS `Sales`;

-- Recreate Sales table to match production schema exactly
CREATE TABLE `Sales` (
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

-- Verify the new structure
DESCRIBE `Sales`;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify success)
-- ============================================================================

-- Check production database
USE justsku_prod;
SELECT COUNT(*) as ProductionTransactionCount FROM `Transactions`;
DESCRIBE `Transactions`;

-- Check demo database
USE justsku_demo;
SELECT COUNT(*) as DemoTransactionCount FROM `Transactions`;
SELECT COUNT(*) as DemoCustomer2Count FROM `Transactions` WHERE CustomerId = 2;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 
-- New Columns Added:
--   - Code: Product code from SkuVault
--   - ScannedCode: Barcode/scan identifier
--   - Title: Product title from SkuVault
--   - ContextType: Type of context (e.g., "Sale")
--   - ContextId: ID from context (e.g., sale ID)
--
-- Columns Removed:
--   - Context (replaced by ContextType + ContextId)
--
-- Next Steps:
--   1. dotnet build (in backend/SkuVaultSaaS.Api)
--   2. Rebuild Docker image
--   3. Redeploy to EC2
--   4. Re-sync transactions to populate new fields
-- ============================================================================
