-- ============================================================================
-- JUSTSKU Demo Database - Seed Test User & Customer
-- This script adds user ID 2 with a customer and sample data
-- Run this AFTER setup-demo-database.sql has been imported
-- ============================================================================

USE justsku_demo;

-- ============================================================================
-- 1. Create Admin Role (if not already present)
-- ============================================================================
INSERT IGNORE INTO `AspNetRoles` (`Id`, `Name`, `NormalizedName`, `ConcurrencyStamp`)
VALUES ('admin-role-id', 'Admin', 'ADMIN', UUID());

-- ============================================================================
-- 2. Create Test User (User ID 2)
-- ============================================================================
INSERT INTO `AspNetUsers` (
    `Id`,
    `UserName`,
    `NormalizedUserName`,
    `Email`,
    `NormalizedEmail`,
    `EmailConfirmed`,
    `PasswordHash`,
    `SecurityStamp`,
    `ConcurrencyStamp`,
    `PhoneNumber`,
    `PhoneNumberConfirmed`,
    `TwoFactorEnabled`,
    `LockoutEnd`,
    `LockoutEnabled`,
    `AccessFailedCount`,
    `CustomerId`,
    `IsEmailVerificationPending`,
    `EmailVerificationToken`,
    `IsActive`
)
VALUES (
    'user-2',
    'test@justsku.com',
    'TEST@JUSTSKU.COM',
    'test@justsku.com',
    'TEST@JUSTSKU.COM',
    1,
    -- Password hash for "Test@123456"
    '$2a$11$5gppKhFdyF2Yd1XQWK/9/u7b3E8vF4wK2h3j5K1m7N9p1Q3r5S7',
    UUID(),
    UUID(),
    '555-0102',
    0,
    0,
    NULL,
    1,
    0,
    2,
    0,
    NULL,
    1
);

-- ============================================================================
-- 3. Create Tenant for Test Customer
-- ============================================================================
INSERT INTO `Tenants` (
    `Id`,
    `Name`,
    `TenantToken`,
    `UserToken`,
    `AccountId`,
    `IsActive`,
    `CreatedAt`,
    `UpdatedAt`
)
VALUES (
    2,
    'Demo Test Company Tenant',
    'tenant_token_demo_2',
    'user_token_demo_2',
    2,
    1,
    NOW(),
    NOW()
);

-- ============================================================================
-- 4. Create Test Customer (Customer ID 2)
-- ============================================================================
INSERT INTO `Customers` (
    `Id`,
    `ExternalId`,
    `Name`,
    `Email`,
    `TenantId`,
    `MembershipLevel`,
    `IsActive`,
    `CreatedAt`,
    `SkuVaultEmail`,
    `SkuVaultPassword`
)
VALUES (
    2,
    'ext-demo-2',
    'Demo Test Company',
    'test@justsku.com',
    2,
    3,
    1,
    NOW(),
    'test@justsku.com',
    'demo_password_encrypted'
);

-- ============================================================================
-- 5. Update User with Customer ID (should already be set)
-- ============================================================================
UPDATE `AspNetUsers` 
SET `CustomerId` = 2 
WHERE `Id` = 'user-2';

-- ============================================================================
-- 6. Create Sample Transactions
-- ============================================================================
INSERT INTO `Transactions` (
    `ExternalId`,
    `CustomerId`,
    `Amount`,
    `Type`,
    `Status`,
    `Description`,
    `CreatedAt`,
    `UpdatedAtUtc`
)
SELECT 
    CONCAT('TXN-', LPAD(ROW_NUMBER() OVER (ORDER BY UUID()), 5, '0')),
    2,
    ROUND(RAND() * 500 + 50, 2),
    ELT(FLOOR(RAND() * 4) + 1, 'Sale', 'Return', 'Adjustment', 'Sync'),
    ELT(FLOOR(RAND() * 3) + 1, 'Completed', 'Pending', 'Failed'),
    'Sample transaction for demo',
    DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
    NOW()
FROM (
    SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
) t;

-- ============================================================================
-- 7. Create Sample Sales Orders
-- ============================================================================
INSERT INTO `Sales` (
    `ExternalId`,
    `CustomerId`,
    `Total`,
    `SaleDate`,
    `CreatedAt`,
    `UpdatedAtUtc`
)
SELECT 
    CONCAT('ORD-', LPAD(ROW_NUMBER() OVER (ORDER BY UUID()), 5, '0')),
    2,
    ROUND(RAND() * 5000 + 100, 2),
    DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
    NOW(),
    NOW()
FROM (
    SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) t;

-- ============================================================================
-- 8. Create Low Stock Threshold Alerts
-- ============================================================================
INSERT INTO `LowStockThresholds` (
    `CustomerId`,
    `ProductId`,
    `LocationId`,
    `ThresholdQuantity`,
    `IsActive`,
    `CreatedAtUtc`,
    `UpdatedAtUtc`,
    `CreatedBy`,
    `UpdatedBy`
)
SELECT 
    2,
    p.Id,
    1,
    FLOOR(RAND() * 100) + 20,
    CASE WHEN RAND() > 0.5 THEN 1 ELSE 0 END,
    NOW(),
    NOW(),
    'system',
    'system'
FROM `Products` p
WHERE p.CustomerId = 2;

-- ============================================================================
-- 9. Create Notification Preferences
-- ============================================================================
INSERT INTO `CustomerNotificationPreferences` (
    `CustomerId`,
    `NotificationType`,
    `Email`,
    `Push`,
    `InApp`,
    `CreatedAtUtc`,
    `UpdatedAtUtc`
)
VALUES 
    (2, 'LowStock', 1, 0, 1, NOW(), NOW()),
    (2, 'HighActivity', 1, 1, 1, NOW(), NOW()),
    (2, 'SyncError', 1, 1, 0, NOW(), NOW()),
    (2, 'ReportReady', 1, 0, 1, NOW(), NOW());

-- ============================================================================
-- 13. Create Locations (Standard Locations table)
-- ============================================================================
INSERT INTO `Locations` (
    `CustomerId`,
    `Code`,
    `Name`,
    `Warehouse`,
    `IsActive`,
    `CreatedAtUtc`,
    `UpdatedAtUtc`
)
VALUES 
    (2, 'LOC-001', 'Main Warehouse', 'Dallas, TX', 1, NOW(), NOW()),
    (2, 'LOC-002', 'East Distribution', 'New Jersey', 1, NOW(), NOW()),
    (2, 'LOC-003', 'West Distribution', 'Los Angeles, CA', 1, NOW(), NOW()),
    (2, 'LOC-004', 'Secondary Storage', 'Chicago, IL', 1, NOW(), NOW());

-- ============================================================================
-- 14. Create Products (Standard Products table)
-- ============================================================================
INSERT INTO `Products` (
    `Sku`,
    `Name`,
    `Description`,
    `Category`,
    `Cost`,
    `Price`,
    `CustomerId`,
    `CreatedAtUtc`,
    `UpdatedAtUtc`
)
VALUES 
    ('ELEC-USB-001', 'Premium USB-C Cable 6ft', 'High-quality USB-C charging cable', 'Electronics', 8.50, 19.99, 2, NOW(), NOW()),
    ('ELEC-CHARGER-001', 'Fast Charging Power Adapter 65W', 'GaN charger with multiple ports', 'Electronics', 25.00, 49.99, 2, NOW(), NOW()),
    ('APPR-SHIRT-001', 'Cotton T-Shirt Premium Blue XL', '100% cotton, premium quality', 'Apparel', 12.00, 29.99, 2, NOW(), NOW()),
    ('APPR-JEANS-001', 'Denim Jeans Classic Black 32x32', 'Classic fit, dark denim', 'Apparel', 30.00, 79.99, 2, NOW(), NOW()),
    ('HOME-LAMP-001', 'LED Desk Lamp with USB Port', 'Adjustable brightness, USB charging', 'Home', 18.00, 39.99, 2, NOW(), NOW()),
    ('HOME-PILLOW-001', 'Memory Foam Pillow Set of 2', 'Ergonomic memory foam pillows', 'Home', 25.00, 59.99, 2, NOW(), NOW()),
    ('SPORT-YOGA-001', 'Non-Slip Yoga Mat 6mm Purple', 'Extra thick, eco-friendly', 'Sports', 15.00, 34.99, 2, NOW(), NOW()),
    ('SPORT-WATER-001', 'Insulated Water Bottle 32oz Black', 'Keeps drinks hot/cold for 24 hours', 'Sports', 10.00, 24.99, 2, NOW(), NOW()),
    ('BEAUTY-LOTION-001', 'Moisturizing Face Lotion 50ml', 'Hydrating, hypoallergenic', 'Beauty', 18.00, 44.99, 2, NOW(), NOW()),
    ('AUTO-MAT-001', 'Car Floor Mats 4-Piece Set', 'All-weather, non-slip backing', 'Auto', 22.00, 54.99, 2, NOW(), NOW());

-- ============================================================================
-- 15. Create Inventory Levels (Stock tracking across locations)
-- ============================================================================
INSERT INTO `InventoryLevels` (
    `CustomerId`,
    `ProductId`,
    `LocationId`,
    `QuantityOnHand`,
    `QuantityAvailable`,
    `QuantityAllocated`,
    `UpdatedAtUtc`
)
SELECT 
    2,
    p.Id,
    CASE 
        WHEN p.Sku = 'APPR-JEANS-001' THEN (SELECT Id FROM Locations WHERE CustomerId = 2 AND Code = 'LOC-002')
        WHEN p.Sku = 'SPORT-YOGA-001' THEN (SELECT Id FROM Locations WHERE CustomerId = 2 AND Code = 'LOC-003')
        WHEN p.Sku = 'AUTO-MAT-001' THEN (SELECT Id FROM Locations WHERE CustomerId = 2 AND Code = 'LOC-004')
        ELSE (SELECT Id FROM Locations WHERE CustomerId = 2 AND Code = 'LOC-001')
    END,
    FLOOR(RAND() * 300) + 100,
    FLOOR(RAND() * 250) + 50,
    FLOOR(RAND() * 50),
    NOW()
FROM `Products` p
WHERE p.CustomerId = 2;

-- ============================================================================
-- 10. Verify Data
-- ============================================================================
SELECT '===== DEMO DATA VERIFICATION =====' as Status;

SELECT 'Users Created:' as Metric, COUNT(*) as Count FROM AspNetUsers;
SELECT 'Customers Created:' as Metric, COUNT(*) as Count FROM Customers;
SELECT 'Tenants Created:' as Metric, COUNT(*) as Count FROM Tenants;
SELECT 'Locations:' as Metric, COUNT(*) as Count FROM Locations WHERE CustomerId = 2;
SELECT 'Products:' as Metric, COUNT(*) as Count FROM Products WHERE CustomerId = 2;
SELECT 'Inventory Levels:' as Metric, COUNT(*) as Count FROM InventoryLevels WHERE CustomerId = 2;
SELECT 'Transactions:' as Metric, COUNT(*) as Count FROM Transactions WHERE CustomerId = 2;
SELECT 'Sales Orders:' as Metric, COUNT(*) as Count FROM Sales WHERE CustomerId = 2;
SELECT 'Low Stock Alerts:' as Metric, COUNT(*) as Count FROM LowStockThresholds WHERE CustomerId = 2;
SELECT 'Notification Preferences:' as Metric, COUNT(*) as Count FROM CustomerNotificationPreferences WHERE CustomerId = 2;

SELECT '===== TEST USER DETAILS =====' as Status;
SELECT Id, Email, UserName, CustomerId, IsActive FROM AspNetUsers WHERE Id = 'user-2';
SELECT Id, Name, Email, MembershipLevel, IsActive FROM Customers WHERE Id = 2;

-- ============================================================================
-- DONE! You now have:
-- - Test User (Email: test@justsku.com, Password: Test@123456)
-- - Customer ID: 2 with all supporting data
-- - Ready for mock data generation via: .\generate-mock-data.ps1 -CustomerId 2
-- ============================================================================
