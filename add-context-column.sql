-- ============================================================================
-- ADD MISSING CONTEXT COLUMN TO INVENTORY MOVEMENTS
-- ============================================================================

USE justsku_demo;

ALTER TABLE `InventoryMovements` ADD COLUMN `Context` longtext CHARACTER SET utf8mb4 NULL;

SELECT 'Context column added to InventoryMovements.' as Status;
