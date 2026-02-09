-- Migration: Add compound index for aging inventory report performance
-- This dramatically speeds up queries filtering by (CustomerId, Sku, LocationId, TransactionDate)
-- The report was timing out because full table scans were querying millions of rows

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE TABLE_NAME = 'Transactions' 
               AND INDEX_NAME = 'IX_Transactions_Customer_Sku_Location_Date')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Transactions_Customer_Sku_Location_Date
    ON dbo.Transactions (CustomerId, Sku, LocationId, TransactionDate)
    INCLUDE (QuantityAfter, TransactionType, Quantity)
    WITH (ONLINE = ON);
    
    PRINT 'Index IX_Transactions_Customer_Sku_Location_Date created successfully';
END
ELSE
BEGIN
    PRINT 'Index IX_Transactions_Customer_Sku_Location_Date already exists';
END
