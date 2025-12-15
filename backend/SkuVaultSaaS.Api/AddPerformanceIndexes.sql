-- Performance Optimization Indexes for Large Tables
-- Run this SQL script to add critical indexes for query performance

-- InventoryMovements table indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS IX_InventoryMovements_CustomerId_OccurredAtUtc 
ON InventoryMovements (CustomerId, OccurredAtUtc DESC);

CREATE INDEX IF NOT EXISTS IX_InventoryMovements_CustomerId_PerformedBy_OccurredAtUtc 
ON InventoryMovements (CustomerId, PerformedBy(255), OccurredAtUtc DESC);

CREATE INDEX IF NOT EXISTS IX_InventoryMovements_CustomerId_TransactionType_OccurredAtUtc 
ON InventoryMovements (CustomerId, TransactionType(100), OccurredAtUtc DESC);

CREATE INDEX IF NOT EXISTS IX_InventoryMovements_ProductId_CustomerId_OccurredAtUtc 
ON InventoryMovements (ProductId, CustomerId, OccurredAtUtc DESC);

-- Products table indexes
CREATE INDEX IF NOT EXISTS IX_Products_CustomerId_SKU 
ON Products (CustomerId, SKU(255));

CREATE INDEX IF NOT EXISTS IX_Products_CustomerId_IsActive 
ON Products (CustomerId, IsActive);

-- Inventory table indexes
CREATE INDEX IF NOT EXISTS IX_Inventory_CustomerId_ProductId 
ON Inventory (CustomerId, ProductId);

CREATE INDEX IF NOT EXISTS IX_Inventory_CustomerId_Quantity 
ON Inventory (CustomerId, Quantity);

-- LowStockThresholds table indexes
CREATE INDEX IF NOT EXISTS IX_LowStockThresholds_CustomerId_ProductId 
ON LowStockThresholds (CustomerId, ProductId);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS IX_Customers_Email 
ON Customers (Email(255));

CREATE INDEX IF NOT EXISTS IX_Customers_MembershipLevel 
ON Customers (MembershipLevel);

-- Locations table indexes
CREATE INDEX IF NOT EXISTS IX_Locations_CustomerId_Name 
ON Locations (CustomerId, Name(255));