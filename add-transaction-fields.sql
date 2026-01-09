-- Add missing transaction fields from SkuVault API
-- This captures Code, ScannedCode, Title, and structured Context (Type/ID) instead of flat string

ALTER TABLE `Transactions` ADD COLUMN `Code` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `ScannedCode` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `Title` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE `Transactions` ADD COLUMN `ContextType` longtext CHARACTER SET utf8mb4 NULL COMMENT 'Type of context (e.g., Sale)';
ALTER TABLE `Transactions` ADD COLUMN `ContextId` longtext CHARACTER SET utf8mb4 NULL COMMENT 'ID from context (e.g., sale ID)';

-- Drop the old flat Context column if it exists
ALTER TABLE `Transactions` DROP COLUMN IF EXISTS `Context`;

-- Verify the new structure
DESCRIBE `Transactions`;
