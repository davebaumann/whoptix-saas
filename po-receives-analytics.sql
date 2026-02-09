-- ============================================================================
-- PO RECEIVES HISTORY ANALYTICS QUERIES
-- ============================================================================
-- Use these queries after syncing receives history data

-- ============================================================================
-- 1. SUMMARY: Receives by Customer
-- ============================================================================
SELECT 
    c.Id,
    c.Name,
    COUNT(DISTINCT pr.PONumber) as TotalPOs,
    COUNT(pr.Id) as TotalReceives,
    COUNT(DISTINCT pr.SKU) as UniqueSKUs,
    MIN(pr.ReceiptDate) as EarliestReceipt,
    MAX(pr.ReceiptDate) as LatestReceipt
FROM PurchaseOrderReceives pr
JOIN Customers c ON pr.CustomerId = c.Id
GROUP BY c.Id, c.Name
ORDER BY c.Name;

-- ============================================================================
-- 2. AVERAGE LEAD TIME BY SKU (for all customers or specific customer)
-- ============================================================================
SELECT 
    pr.SKU,
    pr.PartNumber,
    COUNT(*) as ReceiveCount,
    SUM(pr.Quantity) as TotalQuantityReceived,
    AVG(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays,
    MIN(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as MinLeadTimeDays,
    MAX(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as MaxLeadTimeDays,
    STDDEV(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as StdDevLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
-- WHERE pr.CustomerId = 1  -- Uncomment to filter by specific customer
GROUP BY pr.SKU, pr.PartNumber
ORDER BY AvgLeadTimeDays DESC;

-- ============================================================================
-- 3. AVERAGE LEAD TIME BY VENDOR (Supplier)
-- ============================================================================
SELECT 
    po.SupplierName as Vendor,
    COUNT(DISTINCT pr.PONumber) as TotalPOs,
    COUNT(DISTINCT pr.SKU) as UniqueSKUs,
    COUNT(pr.Id) as TotalReceives,
    SUM(pr.Quantity) as TotalQuantityReceived,
    AVG(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays,
    MIN(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as MinLeadTimeDays,
    MAX(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as MaxLeadTimeDays,
    STDDEV(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as StdDevLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
-- WHERE pr.CustomerId = 1  -- Uncomment to filter by specific customer
GROUP BY po.SupplierName
ORDER BY AvgLeadTimeDays ASC;

-- ============================================================================
-- 4. LEAD TIME BY VENDOR AND PRODUCT (SKU)
-- ============================================================================
SELECT 
    po.SupplierName as Vendor,
    pr.SKU,
    pr.PartNumber,
    COUNT(*) as ReceiveCount,
    SUM(pr.Quantity) as TotalQuantity,
    AVG(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays,
    MIN(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as MinLeadTimeDays,
    MAX(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as MaxLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
-- WHERE pr.CustomerId = 1  -- Uncomment to filter by specific customer
GROUP BY po.SupplierName, pr.SKU, pr.PartNumber
ORDER BY po.SupplierName, AvgLeadTimeDays DESC;

-- ============================================================================
-- 5. LEAD TIME TRENDS OVER TIME (by month)
-- ============================================================================
SELECT 
    YEAR(pr.ReceivedDate) as YearReceived,
    MONTH(pr.ReceivedDate) as MonthReceived,
    po.SupplierName as Vendor,
    COUNT(*) as ReceiveCount,
    AVG(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
-- WHERE pr.CustomerId = 1  -- Uncomment to filter by specific customer
GROUP BY YEAR(pr.ReceivedDate), MONTH(pr.ReceivedDate), po.SupplierName
ORDER BY YearReceived DESC, MonthReceived DESC, po.SupplierName;

-- ============================================================================
-- 6. CORRECTIONS IMPACT ANALYSIS
-- ============================================================================
SELECT 
    prc.SKU,
    COUNT(*) as CorrectionCount,
    SUM(prc.OldQuantity) as OriginalQuantity,
    SUM(prc.NewQuantity) as CorrectedQuantity,
    SUM(prc.NewQuantity - prc.OldQuantity) as QuantityAdjustment,
    ROUND(100.0 * SUM(ABS(prc.NewQuantity - prc.OldQuantity)) / NULLIF(SUM(prc.OldQuantity), 0), 2) as AdjustmentPercentage
FROM PurchaseOrderReceiveCorrections prc
-- WHERE prc.CustomerId = 1  -- Uncomment to filter by specific customer
GROUP BY prc.SKU
HAVING SUM(prc.NewQuantity - prc.OldQuantity) != 0
ORDER BY QuantityAdjustment DESC;

-- ============================================================================
-- 7. WAREHOUSE DISTRIBUTION OF RECEIVES
-- ============================================================================
SELECT 
    pr.Warehouse,
    COUNT(*) as ReceiveCount,
    COUNT(DISTINCT pr.SKU) as UniqueSKUs,
    SUM(pr.Quantity) as TotalQuantity,
    AVG(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
WHERE pr.Warehouse IS NOT NULL AND pr.Warehouse != ''
-- AND pr.CustomerId = 1  -- Uncomment to filter by specific customer
GROUP BY pr.Warehouse
ORDER BY ReceiveCount DESC;

-- ============================================================================
-- 8. PERFORMANCE: Vendors Above/Below Average Lead Time
-- ============================================================================
WITH VendorAverage AS (
    SELECT 
        po.SupplierName,
        AVG(DATEDIFF(DAY, po.OrderDate, pr.ReceivedDate)) as AvgLeadTime
    FROM PurchaseOrderReceives pr
    JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
    -- WHERE pr.CustomerId = 1
    GROUP BY po.SupplierName
),
OverallAverage AS (
    SELECT AVG(AvgLeadTime) as GlobalAvg FROM VendorAverage
)
SELECT 
    va.SupplierName as Vendor,
    ROUND(va.AvgLeadTime, 2) as VendorAvgLeadTime,
    ROUND(oa.GlobalAvg, 2) as GlobalAvgLeadTime,
    ROUND(va.AvgLeadTime - oa.GlobalAvg, 2) as DifferenceDays,
    CASE 
        WHEN va.AvgLeadTime < oa.GlobalAvg THEN 'ABOVE AVERAGE'
        WHEN va.AvgLeadTime > oa.GlobalAvg THEN 'BELOW AVERAGE'
        ELSE 'AVERAGE'
    END as Performance
FROM VendorAverage va, OverallAverage oa
ORDER BY va.AvgLeadTime ASC;

-- ============================================================================
-- 9. DATA QUALITY CHECK
-- ============================================================================
SELECT 
    'Total Receives' as Metric,
    COUNT(*) as Count
FROM PurchaseOrderReceives
UNION ALL
SELECT 
    'Total Corrections',
    COUNT(*)
FROM PurchaseOrderReceiveCorrections
UNION ALL
SELECT 
    'Receives with NULL SKU',
    COUNT(*)
FROM PurchaseOrderReceives
WHERE SKU IS NULL OR SKU = ''
UNION ALL
SELECT 
    'Receives with NULL ReceiptDate',
    COUNT(*)
FROM PurchaseOrderReceives
WHERE ReceiptDate IS NULL
UNION ALL
SELECT 
    'Receives with NULL ReceivedDate',
    COUNT(*)
FROM PurchaseOrderReceives
WHERE ReceivedDate IS NULL
UNION ALL
SELECT 
    'Orphaned Receives (no matching PO)',
    COUNT(*)
FROM PurchaseOrderReceives pr
LEFT JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
WHERE po.Id IS NULL;
