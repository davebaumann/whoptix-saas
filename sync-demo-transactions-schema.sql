-- Sync demo transactions table with production schema changes
-- Add the new columns that capture SkuVault data more completely

USE justsku_demo;

-- Add the new columns
ALTER TABLE `Transactions` ADD COLUMN `Code` longtext CHARACTER SET utf8mb4 NULL AFTER `Sku`;
ALTER TABLE `Transactions` ADD COLUMN `ScannedCode` longtext CHARACTER SET utf8mb4 NULL AFTER `Code`;
ALTER TABLE `Transactions` ADD COLUMN `Title` longtext CHARACTER SET utf8mb4 NULL AFTER `ScannedCode`;

-- Replace the flat Context column with structured ContextType and ContextId
ALTER TABLE `Transactions` ADD COLUMN `ContextType` longtext CHARACTER SET utf8mb4 NULL AFTER `TransactionNote` COMMENT 'Type of context (e.g., Sale)';
ALTER TABLE `Transactions` ADD COLUMN `ContextId` longtext CHARACTER SET utf8mb4 NULL AFTER `ContextType` COMMENT 'ID from context (e.g., sale ID)';

-- Drop the old flat Context column
ALTER TABLE `Transactions` DROP COLUMN IF EXISTS `Context`;

-- Verify the updated structure
DESCRIBE `Transactions`;

-- Check the demo data
SELECT COUNT(*) as 'Total Transactions' FROM `Transactions` WHERE CustomerId = 2;
SELECT `Id`, `Sku`, `Code`, `ScannedCode`, `Title`, `TransactionType`, `ContextType`, `ContextId` 
FROM `Transactions` 
WHERE CustomerId = 2 
LIMIT 5;
