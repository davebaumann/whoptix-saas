-- Demo Database Setup for JUSTSKU
-- Creates justsku_demo database with sample data for testing and demos
-- NOTE: Schema tables will be created by Entity Framework migrations on app startup

-- Create demo database
CREATE DATABASE IF NOT EXISTS justsku_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE justsku_demo;

-- After Entity Framework creates the schema tables, populate with demo data:

-- Insert demo tenant
INSERT INTO Tenants (Name, SkuVaultEmail, SkuVaultPassword, SkuVaultAccountId, CreatedAt)
VALUES (
    'JUSTSKU Demo Tenant',
    'demo@skuvault.example.com',
    AES_ENCRYPT('encrypted_token_here', 'encryption_key'),
    'demo-account-id',
    NOW()
) ON DUPLICATE KEY UPDATE Name = 'JUSTSKU Demo Tenant';

SET @tenantId = LAST_INSERT_ID();

-- Insert demo customer
INSERT INTO Customers (ExternalId, Name, Email, TenantId, MembershipLevel, LastSyncedAt, IsActive, LowStockNotificationsEnabled, LowStockCheckIntervalMinutes, CreatedAt)
VALUES (
    'demo-customer-001',
    'Demo Store Inc',
    'demo@justsku.local',
    @tenantId,
    2,  -- Premium membership
    NOW(),
    1,  -- Active
    1,  -- Low stock notifications enabled
    240, -- 4 hours
    NOW()
) ON DUPLICATE KEY UPDATE 
    Name = 'Demo Store Inc',
    Email = 'demo@justsku.local',
    IsActive = 1;

SET @customerId = LAST_INSERT_ID();

-- Insert sample products
INSERT INTO Products (ExternalId, Name, Sku, CustomerId, CreatedAt) VALUES
('demo-product-001', 'Demo Widget A', 'WIDGET-A-001', @customerId, NOW()),
('demo-product-002', 'Demo Widget B', 'WIDGET-B-002', @customerId, NOW()),
('demo-product-003', 'Demo Gadget X', 'GADGET-X-003', @customerId, NOW())
ON DUPLICATE KEY UPDATE Name = VALUES(Name);

-- Insert sample inventory levels
INSERT INTO InventoryLevels (ProductId, LocationId, Quantity, LastUpdated) 
SELECT Id, 1, FLOOR(RAND() * 500) + 10, NOW() 
FROM Products WHERE CustomerId = @customerId
ON DUPLICATE KEY UPDATE Quantity = VALUES(Quantity), LastUpdated = NOW();

-- Verify demo database created
SELECT 'Demo database created successfully!' as Status;
SHOW TABLES;
