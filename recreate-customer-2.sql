-- ============================================================================
-- ADD MISSING COLUMNS AND RECREATE CUSTOMER 2 DATA
-- ============================================================================

USE justsku_demo;

-- Add missing columns to Customers table (if they don't exist)
ALTER TABLE Customers 
ADD COLUMN IF NOT EXISTS CreatedAtUtc datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS UpdatedAtUtc datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS LastSyncedAt datetime(6) NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS LowStockNotificationsEnabled tinyint(1) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS LowStockNotificationEmail longtext CHARACTER SET utf8mb4 NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS LowStockCheckIntervalMinutes int NOT NULL DEFAULT 360,
ADD COLUMN IF NOT EXISTS ScheduledForDeletion datetime(6) NULL DEFAULT NULL;

-- Delete existing Customer 2 data
DELETE FROM Customers WHERE Id = 2;
DELETE FROM Products WHERE CustomerId = 2;
DELETE FROM Locations WHERE CustomerId = 2;
DELETE FROM InventoryLevels WHERE CustomerId = 2;
DELETE FROM InventoryMovements WHERE CustomerId = 2;
DELETE FROM Transactions WHERE CustomerId = 2;
DELETE FROM Sales WHERE CustomerId = 2;
DELETE FROM LowStockThresholds WHERE CustomerId = 2;
DELETE FROM CustomerNotificationPreferences WHERE CustomerId = 2;

-- ============================================================================
-- INSERT CUSTOMER 2
-- ============================================================================

INSERT INTO Customers (Id, ExternalId, TenantId, Name, Email, IsActive, MembershipLevel, CreatedAtUtc, UpdatedAtUtc, LastSyncedAt, LowStockNotificationsEnabled, LowStockNotificationEmail, LowStockCheckIntervalMinutes, StripeCustomerId, CancelledAt, ScheduledForDeletion)
VALUES (
    2,                                      -- Id
    '4889be5c-eb1a-11f0-b7ca-16ffc7ce6f71', -- ExternalId
    2,                                      -- TenantId
    'Demo Test Company',                    -- Name
    'test@justsku.com',                     -- Email
    1,                                      -- IsActive
    3,                                      -- MembershipLevel (Premium)
    '2026-01-06 16:10:56.000000',          -- CreatedAtUtc
    '2026-01-07 10:00:00.000000',          -- UpdatedAtUtc
    '2026-01-07 09:30:00.000000',          -- LastSyncedAt
    1,                                      -- LowStockNotificationsEnabled
    'test@justsku.com',                     -- LowStockNotificationEmail
    360,                                    -- LowStockCheckIntervalMinutes (6 hours)
    NULL,                                   -- StripeCustomerId
    NULL,                                   -- CancelledAt
    NULL                                    -- ScheduledForDeletion
);

-- ============================================================================
-- INSERT TEST PRODUCTS FOR CUSTOMER 2
-- ============================================================================

INSERT INTO Products (CustomerId, Sku, Name, Description, Price, Cost, Category, CreatedAtUtc, UpdatedAtUtc) VALUES
(2, 'PROD-001', 'Widget A', 'Standard widget in aluminum', 29.99, 12.50, 'Widgets', '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'PROD-002', 'Widget B', 'Premium widget in stainless steel', 49.99, 22.50, 'Widgets', '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'PROD-003', 'Gadget X', 'Electronic gadget', 149.99, 75.00, 'Gadgets', '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'PROD-004', 'Component C', 'Replacement component', 12.99, 5.00, 'Components', '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'PROD-005', 'Part D', 'Small part for assembly', 3.99, 1.50, 'Parts', '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000');

-- ============================================================================
-- INSERT TEST LOCATIONS FOR CUSTOMER 2
-- ============================================================================

INSERT INTO Locations (CustomerId, Code, Name, Warehouse, IsActive, CreatedAtUtc, UpdatedAtUtc) VALUES
(2, 'WAREHOUSE-A1', 'Main Warehouse - Aisle 1', 'Main Facility', 1, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'WAREHOUSE-A2', 'Main Warehouse - Aisle 2', 'Main Facility', 1, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'WAREHOUSE-B1', 'Secondary Warehouse - Bin 1', 'Secondary Facility', 1, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 'WAREHOUSE-HOLD', 'Hold Area', 'Main Facility', 1, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000');

-- ============================================================================
-- INSERT TEST INVENTORY LEVELS FOR CUSTOMER 2
-- ============================================================================

INSERT INTO InventoryLevels (CustomerId, ProductId, LocationId, Quantity, CreatedAtUtc, UpdatedAtUtc) VALUES
(2, 1, 1, 150, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 1, 2, 75, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 2, 1, 50, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 2, 2, 25, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 3, 1, 10, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 3, 3, 8, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 4, 1, 300, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 4, 2, 200, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 5, 1, 500, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000'),
(2, 5, 2, 250, '2026-01-01 08:00:00.000000', '2026-01-07 10:00:00.000000');

-- ============================================================================
-- INSERT TEST TRANSACTIONS FOR CUSTOMER 2
-- ============================================================================

INSERT INTO Transactions (CustomerId, SkuVaultId, ProductId, LocationId, Sku, Code, ScannedCode, Title, Quantity, QuantityBefore, QuantityAfter, TransactionType, TransactionReason, TransactionNote, ContextType, ContextId, User, PerformedBy, TransactionDate, SyncedAtUtc, CreatedAtUtc) VALUES
(2, 'TXN-1', 1, 1, 'PROD-001', 'P001', '11111111111', 'Widget A', 50, 100, 150, 'Add', 'Received', 'PO#2025-001', 'PurchaseOrder', '1-1-1-1-PO001', 'customer2@example.com', 'warehouse_staff', '2026-01-02 09:00:00.000000', '2026-01-02 10:00:00.000000', '2026-01-02 10:00:00.000000'),
(2, 'TXN-2', 1, 1, 'PROD-001', 'P001', '11111111111', 'Widget A', 25, 150, 125, 'Remove', 'Sold', 'ORDER#12345', 'Sale', '1-1-1-1-SALE001', 'customer2@example.com', 'sales_system', '2026-01-03 14:30:00.000000', '2026-01-03 15:00:00.000000', '2026-01-03 15:00:00.000000'),
(2, 'TXN-3', 2, 1, 'PROD-002', 'P002', '22222222222', 'Widget B', 30, 20, 50, 'Add', 'Received', 'PO#2025-002', 'PurchaseOrder', '1-1-1-1-PO002', 'customer2@example.com', 'warehouse_staff', '2026-01-04 08:15:00.000000', '2026-01-04 09:00:00.000000', '2026-01-04 09:00:00.000000'),
(2, 'TXN-4', 3, 1, 'PROD-003', 'P003', '33333333333', 'Gadget X', 5, 5, 10, 'Add', 'Received', 'PO#2025-003', 'PurchaseOrder', '1-1-1-1-PO003', 'customer2@example.com', 'warehouse_staff', '2026-01-05 10:45:00.000000', '2026-01-05 11:30:00.000000', '2026-01-05 11:30:00.000000'),
(2, 'TXN-5', 3, 1, 'PROD-003', 'P003', '33333333333', 'Gadget X', 2, 10, 8, 'Remove', 'Sold', 'ORDER#12346', 'Sale', '1-1-1-1-SALE002', 'customer2@example.com', 'sales_system', '2026-01-05 16:20:00.000000', '2026-01-05 17:00:00.000000', '2026-01-05 17:00:00.000000'),
(2, 'TXN-6', 4, 2, 'PROD-004', 'P004', '44444444444', 'Component C', 100, 200, 300, 'Add', 'Received', 'PO#2025-004', 'PurchaseOrder', '1-1-1-1-PO004', 'customer2@example.com', 'warehouse_staff', '2026-01-06 07:30:00.000000', '2026-01-06 08:15:00.000000', '2026-01-06 08:15:00.000000'),
(2, 'TXN-7', 5, 1, 'PROD-005', 'P005', '55555555555', 'Part D', 250, 250, 500, 'Add', 'Received', 'PO#2025-005', 'PurchaseOrder', '1-1-1-1-PO005', 'customer2@example.com', 'warehouse_staff', '2026-01-06 14:00:00.000000', '2026-01-06 15:00:00.000000', '2026-01-06 15:00:00.000000');

-- ============================================================================
-- INSERT TEST SALES FOR CUSTOMER 2
-- ============================================================================

INSERT INTO Sales (SaleId, Sku, Quantity, SaleDate, Channel, OrderNumber, Price, CustomerEmail, CustomerName, CustomerId) VALUES
('SALE-001', 'PROD-001', 25, '2026-01-03 14:30:00.000000', 'Web', 'ORDER#12345', 749.75, 'customer2@example.com', 'Demo Customer 2', 2),
('SALE-002', 'PROD-003', 2, '2026-01-05 16:20:00.000000', 'Amazon', 'ORDER#12346', 299.98, 'customer2@example.com', 'Demo Customer 2', 2),
('SALE-003', 'PROD-001', 15, '2026-01-06 11:45:00.000000', 'Shopify', 'ORDER#12347', 449.85, 'customer2@example.com', 'Demo Customer 2', 2),
('SALE-004', 'PROD-002', 10, '2026-01-06 13:20:00.000000', 'Web', 'ORDER#12348', 499.90, 'customer2@example.com', 'Demo Customer 2', 2),
('SALE-005', 'PROD-004', 50, '2026-01-07 09:00:00.000000', 'Bulk', 'ORDER#12349', 649.50, 'customer2@example.com', 'Demo Customer 2', 2);

-- ============================================================================
-- INSERT TEST LOW STOCK THRESHOLDS FOR CUSTOMER 2
-- ============================================================================

INSERT INTO LowStockThresholds (CustomerId, ProductId, LocationId, ThresholdQuantity, IsActive, CreatedAtUtc, CreatedBy, UpdatedAtUtc, UpdatedBy) VALUES
(2, 1, 1, 50, 1, '2026-01-01 08:00:00.000000', 'admin@example.com', '2026-01-07 10:00:00.000000', 'admin@example.com'),
(2, 3, 1, 5, 1, '2026-01-01 08:00:00.000000', 'admin@example.com', '2026-01-07 10:00:00.000000', 'admin@example.com'),
(2, 4, 1, 100, 1, '2026-01-01 08:00:00.000000', 'admin@example.com', '2026-01-07 10:00:00.000000', 'admin@example.com');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Customer 2 recreation complete.' as Status;
SELECT COUNT(*) as TotalTransactions FROM Transactions WHERE CustomerId = 2;
SELECT COUNT(*) as TotalSales FROM Sales WHERE CustomerId = 2;
SELECT COUNT(*) as TotalProducts FROM Products WHERE CustomerId = 2;
SELECT COUNT(*) as TotalLocations FROM Locations WHERE CustomerId = 2;
SELECT 'Use query: SELECT * FROM Customers WHERE Id = 2; to verify customer details' as Next;
