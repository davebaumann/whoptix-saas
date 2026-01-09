-- ============================================================================
-- TRANSACTION SCHEMA UPDATE - SQL EXECUTION GUIDE
-- ============================================================================
-- This file documents the SQL scripts needed to update your Transactions
-- table to capture all SkuVault API response fields.
--
-- NEW FIELDS BEING ADDED:
--   - Code: Product code from SkuVault
--   - ScannedCode: Barcode/scan identifier  
--   - Title: Product title from SkuVault
--   - ContextType: Type of context (e.g., "Sale")
--   - ContextId: ID from context (e.g., sale ID)
--
-- FIELD BEING REPLACED:
--   - Context (flat string) → ContextType + ContextId (structured)
--
-- ============================================================================

-- OPTION 1: Using EF Core (RECOMMENDED)
-- ============================================================================
-- If you want EF Core to manage the migration:
--
-- cd backend/SkuVaultSaaS.Api
-- dotnet ef database update
--
-- This will apply the migration: AddMissingTransactionFields.cs
--

-- OPTION 2: Manual SQL Execution
-- ============================================================================
-- If you prefer to run SQL directly, use the scripts below:

-- STEP 1: FOR PRODUCTION DATABASE (justsku_prod)
-- ============================================================================
-- Run this to update production to the new schema:
--
-- SOURCE: add-transaction-fields.sql
-- 
-- This script:
--   1. Adds Code, ScannedCode, Title columns
--   2. Adds ContextType, ContextId columns
--   3. Drops the old Context column
--   4. Validates the structure

USE justsku_prod;

ALTER TABLE `Transactions` ADD COLUMN `Code` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `ScannedCode` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `Title` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `ContextType` longtext CHARACTER SET utf8mb4 NULL COMMENT 'Type of context (e.g., Sale)';
ALTER TABLE `Transactions` ADD COLUMN `ContextId` longtext CHARACTER SET utf8mb4 NULL COMMENT 'ID from context (e.g., sale ID)';
ALTER TABLE `Transactions` DROP COLUMN IF EXISTS `Context`;

DESCRIBE `Transactions`;


-- STEP 2: FOR DEMO DATABASE (justsku_demo)
-- ============================================================================
-- Run this to sync demo database schema:
--
-- SOURCE: sync-demo-transactions-schema.sql
--
-- This script:
--   1. Switches to justsku_demo database
--   2. Adds the same new columns
--   3. Removes the old Context column
--   4. Validates data integrity

USE justsku_demo;

ALTER TABLE `Transactions` ADD COLUMN `Code` longtext CHARACTER SET utf8mb4 NULL AFTER `Sku`;
ALTER TABLE `Transactions` ADD COLUMN `ScannedCode` longtext CHARACTER SET utf8mb4 NULL AFTER `Code`;
ALTER TABLE `Transactions` ADD COLUMN `Title` longtext CHARACTER SET utf8mb4 NULL AFTER `ScannedCode`;
ALTER TABLE `Transactions` ADD COLUMN `ContextType` longtext CHARACTER SET utf8mb4 NULL AFTER `TransactionNote` COMMENT 'Type of context (e.g., Sale)';
ALTER TABLE `Transactions` ADD COLUMN `ContextId` longtext CHARACTER SET utf8mb4 NULL AFTER `ContextType` COMMENT 'ID from context (e.g., sale ID)';
ALTER TABLE `Transactions` DROP COLUMN IF EXISTS `Context`;

-- Verify both databases are in sync
DESCRIBE `Transactions`;

SELECT COUNT(*) as 'Total Transactions' FROM `Transactions` WHERE CustomerId = 2;
SELECT `Id`, `Sku`, `Code`, `ScannedCode`, `Title`, `TransactionType`, `ContextType`, `ContextId` 
FROM `Transactions` 
WHERE CustomerId = 2 
LIMIT 5;


-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- Check column structure
DESCRIBE Transactions;

-- Show row count by customer
SELECT CustomerId, COUNT(*) as TransactionCount 
FROM Transactions 
GROUP BY CustomerId;

-- Show new fields populated (after sync)
SELECT COUNT(*) as WithCode FROM Transactions WHERE Code IS NOT NULL;
SELECT COUNT(*) as WithTitle FROM Transactions WHERE Title IS NOT NULL;
SELECT COUNT(*) as WithContextType FROM Transactions WHERE ContextType IS NOT NULL;
SELECT COUNT(*) as WithContextId FROM Transactions WHERE ContextId IS NOT NULL;

-- Sample data with new fields
SELECT 
    Id, Sku, Code, Title, 
    TransactionType, ContextType, ContextId,
    TransactionDate 
FROM Transactions 
LIMIT 10;


-- ROLLBACK (IF NEEDED)
-- ============================================================================
-- If you need to rollback these changes:

-- Add back the old Context column
ALTER TABLE `Transactions` ADD COLUMN `Context` longtext CHARACTER SET utf8mb4 NULL;

-- Remove the new columns
ALTER TABLE `Transactions` DROP COLUMN `Code`;
ALTER TABLE `Transactions` DROP COLUMN `ScannedCode`;
ALTER TABLE `Transactions` DROP COLUMN `Title`;
ALTER TABLE `Transactions` DROP COLUMN `ContextType`;
ALTER TABLE `Transactions` DROP COLUMN `ContextId`;

-- Verify structure is back to original
DESCRIBE `Transactions`;
