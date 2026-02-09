-- Indexes to improve sync performance
-- Run this on the database after instance restart

-- Index for transaction sync (speeds up duplicate checking)
CREATE INDEX IF NOT EXISTS idx_transactions_customer_skuvaultid 
ON Transactions(CustomerId, SkuVaultId);

-- Index for sales sync (speeds up duplicate checking)
CREATE INDEX IF NOT EXISTS idx_sales_customer_saleid 
ON Sales(CustomerId, SaleId);

-- Index for inventory sync 
CREATE INDEX IF NOT EXISTS idx_inventorylevels_customer_product_location
ON InventoryLevels(CustomerId, ProductId, LocationId);

-- Verify indexes were created
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('Transactions', 'Sales', 'InventoryLevels')
AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME;
