-- ============================================================================
-- SKU LOOKUP VALIDATION SCRIPT
-- Purpose: Identify SKU mismatches between API/Transactions and Products table
-- Date: 2026-01-16
-- ============================================================================

-- ============================================================================
-- 1. SAMPLE SKUS FROM PRODUCTS TABLE
-- ============================================================================
SELECT 'PRODUCTS TABLE - First 20 SKUs:' as section;
SELECT 
    Id,
    CustomerId,
    Sku,
    LENGTH(Sku) as SkuLength,
    HEX(Sku) as SkuHex
FROM Products
LIMIT 20;

-- ============================================================================
-- 2. SAMPLE SKUS FROM TRANSACTIONS TABLE
-- ============================================================================
SELECT '' as blank;
SELECT 'TRANSACTIONS TABLE - First 20 SKUs:' as section;
SELECT DISTINCT
    Sku,
    LENGTH(Sku) as SkuLength,
    HEX(Sku) as SkuHex,
    COUNT(*) as TransactionCount
FROM Transactions
GROUP BY Sku
LIMIT 20;

-- ============================================================================
-- 3. TRANSACTIONS SKUS NOT IN PRODUCTS (LOOKUP FAILURES)
-- ============================================================================
SELECT '' as blank;
SELECT 'CRITICAL: SKUs in Transactions but NOT in Products:' as section;
SELECT 
    t.Sku as TransactionSku,
    LENGTH(t.Sku) as SkuLength,
    HEX(t.Sku) as SkuHex,
    COUNT(*) as TransactionCount,
    COUNT(DISTINCT t.CustomerId) as CustomerCount,
    'NOT FOUND IN PRODUCTS' as Status
FROM Transactions t
LEFT JOIN Products p ON t.Sku = p.Sku
WHERE p.Id IS NULL
GROUP BY t.Sku
ORDER BY TransactionCount DESC;

-- ============================================================================
-- 4. INVENTORY LEVELS COUNT FOR CUSTOMER 2
-- ============================================================================
SELECT '' as blank;
SELECT 'INVENTORY LEVELS - Customer 2 Status:' as section;
SELECT 
    CustomerId,
    COUNT(*) as InventoryLevelCount,
    SUM(QuantityOnHand) as TotalQuantityOnHand,
    MAX(UpdatedAtUtc) as LastUpdated
FROM InventoryLevels
WHERE CustomerId = 2
GROUP BY CustomerId;

-- ============================================================================
-- 5. DETAILED BREAKDOWN FOR CUSTOMER 2
-- ============================================================================
SELECT '' as blank;
SELECT 'DETAILED: Customer 2 Inventory Levels with Product/Location info:' as section;
SELECT 
    il.Id,
    il.ProductId,
    p.Sku,
    il.LocationId,
    l.Code as LocationCode,
    il.QuantityOnHand,
    il.QuantityAvailable,
    il.QuantityAllocated,
    il.UpdatedAtUtc
FROM InventoryLevels il
LEFT JOIN Products p ON il.ProductId = p.Id
LEFT JOIN Locations l ON il.LocationId = l.Id
WHERE il.CustomerId = 2
LIMIT 20;

-- ============================================================================
-- 6. TRANSACTIONS COUNT FOR CUSTOMER 2
-- ============================================================================
SELECT '' as blank;
SELECT 'TRANSACTIONS - Customer 2 Summary:' as section;
SELECT 
    CustomerId,
    COUNT(*) as TransactionCount,
    COUNT(DISTINCT Sku) as UniqueSkuCount,
    MIN(TransactionDate) as OldestTransaction,
    MAX(TransactionDate) as NewestTransaction
FROM Transactions
WHERE CustomerId = 2
GROUP BY CustomerId;

-- ============================================================================
-- 7. CUSTOMER 2 - SKUS IN TRANSACTIONS VS INVENTORY LEVELS
-- ============================================================================
SELECT '' as blank;
SELECT 'COMPARISON: Customer 2 - Transactions vs InventoryLevels:' as section;
SELECT 
    t.Sku,
    COUNT(DISTINCT t.Id) as TransactionCount,
    COUNT(DISTINCT CASE WHEN il.Id IS NOT NULL THEN il.Id END) as HasInventoryLevel,
    p.Id as ProductId,
    CASE 
        WHEN il.Id IS NOT NULL THEN 'YES'
        WHEN p.Id IS NOT NULL THEN 'Product exists, no InventoryLevel'
        ELSE 'Product NOT FOUND'
    END as Status
FROM Transactions t
LEFT JOIN Products p ON t.Sku = p.Sku AND p.CustomerId = 2
LEFT JOIN InventoryLevels il ON p.Id = il.ProductId AND il.CustomerId = 2
WHERE t.CustomerId = 2
GROUP BY t.Sku, p.Id, il.Id
ORDER BY TransactionCount DESC
LIMIT 30;
