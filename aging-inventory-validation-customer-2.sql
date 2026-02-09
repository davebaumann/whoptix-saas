-- ============================================================================
-- AGING INVENTORY VALIDATION QUERIES - CUSTOMER 2
-- Purpose: Compare old (buggy) vs new (correct) calculation methods
-- Date: 2026-01-15
-- ============================================================================

-- First, let's see the raw transaction data for Customer 2
SELECT 
    Sku,
    TransactionType,
    TransactionDate,
    Quantity,
    DATE(TransactionDate) as TxnDate
FROM Transactions
WHERE CustomerId = 2
  AND (TransactionType = 'Add' OR TransactionType = 'Return')
  AND Quantity > 0
ORDER BY Sku, TransactionDate;

-- ============================================================================
-- SUMMARY: Current inventory per SKU (all transactions summed)
-- ============================================================================
SELECT 
    Sku,
    SUM(Quantity) as CurrentQuantity,
    MIN(TransactionDate) as OldestTransaction,
    MAX(TransactionDate) as NewestTransaction,
    COUNT(DISTINCT DATE(TransactionDate)) as UniqueDates
FROM Transactions
WHERE CustomerId = 2
  AND (TransactionType = 'Add' OR TransactionType = 'Return')
  AND Quantity > 0
GROUP BY Sku
HAVING SUM(Quantity) > 0
ORDER BY Sku;

-- ============================================================================
-- DETAILED BREAKDOWN: OLD METHOD (BUGGY) vs NEW METHOD (CORRECT)
-- ============================================================================
WITH TransactionGroups AS (
    SELECT 
        Sku,
        DATE(TransactionDate) as TxnDate,
        SUM(Quantity) as QuantityOnDate,
        DATEDIFF(CURDATE(), DATE(TransactionDate)) as DaysOld
    FROM Transactions
    WHERE CustomerId = 2
      AND (TransactionType = 'Add' OR TransactionType = 'Return')
      AND Quantity > 0
    GROUP BY Sku, DATE(TransactionDate)
),
SkuTotals AS (
    SELECT 
        Sku,
        SUM(QuantityOnDate) as TotalQuantity,
        MIN(TxnDate) as OldestDate,
        MAX(DaysOld) as DaysFromOldest
    FROM TransactionGroups
    GROUP BY Sku
),
OldMethodCalc AS (
    -- OLD METHOD: All quantity goes to ONE bucket based on oldest transaction
    SELECT 
        st.Sku,
        st.TotalQuantity,
        st.OldestDate,
        st.DaysFromOldest,
        CASE 
            WHEN st.DaysFromOldest <= 30 THEN st.TotalQuantity ELSE 0
        END as Old_Days0_30,
        CASE 
            WHEN st.DaysFromOldest > 30 AND st.DaysFromOldest <= 60 THEN st.TotalQuantity ELSE 0
        END as Old_Days31_60,
        CASE 
            WHEN st.DaysFromOldest > 60 AND st.DaysFromOldest <= 90 THEN st.TotalQuantity ELSE 0
        END as Old_Days61_90,
        CASE 
            WHEN st.DaysFromOldest > 90 THEN st.TotalQuantity ELSE 0
        END as Old_Days90Plus
    FROM SkuTotals st
),
NewMethodCalc AS (
    -- NEW METHOD: Each batch/shipment ages independently
    SELECT 
        Sku,
        SUM(CASE WHEN DaysOld <= 30 THEN QuantityOnDate ELSE 0 END) as New_Days0_30,
        SUM(CASE WHEN DaysOld > 30 AND DaysOld <= 60 THEN QuantityOnDate ELSE 0 END) as New_Days31_60,
        SUM(CASE WHEN DaysOld > 60 AND DaysOld <= 90 THEN QuantityOnDate ELSE 0 END) as New_Days61_90,
        SUM(CASE WHEN DaysOld > 90 THEN QuantityOnDate ELSE 0 END) as New_Days90Plus
    FROM TransactionGroups
    GROUP BY Sku
)
SELECT 
    omc.Sku,
    omc.TotalQuantity,
    omc.OldestDate,
    omc.DaysFromOldest,
    -- OLD METHOD RESULTS
    omc.Old_Days0_30,
    omc.Old_Days31_60,
    omc.Old_Days61_90,
    omc.Old_Days90Plus,
    -- NEW METHOD RESULTS
    nmc.New_Days0_30,
    nmc.New_Days31_60,
    nmc.New_Days61_90,
    nmc.New_Days90Plus,
    -- DIFFERENCES (what changed)
    (nmc.New_Days0_30 - omc.Old_Days0_30) as Diff_Days0_30,
    (nmc.New_Days31_60 - omc.Old_Days31_60) as Diff_Days31_60,
    (nmc.New_Days61_90 - omc.Old_Days61_90) as Diff_Days61_90,
    (nmc.New_Days90Plus - omc.Old_Days90Plus) as Diff_Days90Plus
FROM OldMethodCalc omc
LEFT JOIN NewMethodCalc nmc ON omc.Sku = nmc.Sku
ORDER BY omc.Sku;

-- ============================================================================
-- VISUAL COMPARISON: Show which SKUs have the biggest differences
-- ============================================================================
WITH Calculations AS (
    SELECT 
        Sku,
        SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 30 THEN Quantity ELSE 0 END) as New_Days0_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) > 30 
                  AND DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 60 THEN Quantity ELSE 0 END) as New_Days31_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) > 60 
                  AND DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 90 THEN Quantity ELSE 0 END) as New_Days61_90,
        SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) > 90 THEN Quantity ELSE 0 END) as New_Days90Plus,
        SUM(Quantity) as TotalQty
    FROM Transactions
    WHERE CustomerId = 2
      AND (TransactionType = 'Add' OR TransactionType = 'Return')
      AND Quantity > 0
    GROUP BY Sku
)
SELECT 
    Sku,
    TotalQty,
    New_Days0_30 + New_Days31_60 + New_Days61_90 + New_Days90Plus as DistributedTotal,
    ROUND(CAST(New_Days0_30 AS DECIMAL) / NULLIF(TotalQty, 0) * 100, 2) as Pct_Days0_30,
    ROUND(CAST(New_Days31_60 AS DECIMAL) / NULLIF(TotalQty, 0) * 100, 2) as Pct_Days31_60,
    ROUND(CAST(New_Days61_90 AS DECIMAL) / NULLIF(TotalQty, 0) * 100, 2) as Pct_Days61_90,
    ROUND(CAST(New_Days90Plus AS DECIMAL) / NULLIF(TotalQty, 0) * 100, 2) as Pct_Days90Plus
FROM Calculations
ORDER BY TotalQty DESC;

-- ============================================================================
-- TRANSACTION DETAIL: See each batch for specific SKU (change SKU_VALUE)
-- ============================================================================
-- EXAMPLE: Run this for a specific SKU to see batch-level aging
SET @TargetSku = 'SKU001'; -- Change this to any SKU from results above

SELECT 
    Sku,
    TransactionDate as TransactionDate,
    DATE(TransactionDate) as DateOnly,
    DATEDIFF(CURDATE(), DATE(TransactionDate)) as DaysOld,
    Quantity,
    TransactionType,
    CASE 
        WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 30 THEN '0-30 days'
        WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 60 THEN '31-60 days'
        WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 90 THEN '61-90 days'
        ELSE '90+ days'
    END as AgeBucket
FROM Transactions
WHERE CustomerId = 2
  AND Sku = @TargetSku
  AND (TransactionType = 'Add' OR TransactionType = 'Return')
  AND Quantity > 0
ORDER BY TransactionDate DESC;

-- ============================================================================
-- FIRST: Check if any transactions exist for Customer 2
-- ============================================================================
SELECT COUNT(*) as TransactionCount, CustomerId FROM Transactions WHERE CustomerId = 2 GROUP BY CustomerId;

-- ============================================================================
-- SUMMARY TOTALS: Verify the math (simplified)
-- ============================================================================
SELECT 
    SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 30 THEN Quantity ELSE 0 END) as Days0_30,
    SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) > 30 AND DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 60 THEN Quantity ELSE 0 END) as Days31_60,
    SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) > 60 AND DATEDIFF(CURDATE(), DATE(TransactionDate)) <= 90 THEN Quantity ELSE 0 END) as Days61_90,
    SUM(CASE WHEN DATEDIFF(CURDATE(), DATE(TransactionDate)) > 90 THEN Quantity ELSE 0 END) as Days90Plus,
    SUM(Quantity) as TotalAllQuantity
FROM Transactions
WHERE CustomerId = 2
  AND (TransactionType = 'Add' OR TransactionType = 'Return')
  AND Quantity > 0;
