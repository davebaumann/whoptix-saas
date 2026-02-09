-- ============================================================================
-- SYNC DATA VALIDATION QUERIES
-- Purpose: Identify missing records, gaps, and data integrity issues
-- Date: 2026-01-18
-- ============================================================================

-- ============================================================================
-- 1. TRANSACTION GAPS - Find SKUs with missing transaction sequences
-- ============================================================================
SELECT 'ANALYSIS: Transaction Gaps by SKU' as section;

WITH TransactionSequence AS (
    SELECT 
        Sku,
        TransactionDate,
        LAG(TransactionDate) OVER (PARTITION BY Sku ORDER BY TransactionDate) as PreviousTxnDate,
        DATEDIFF(DAY, LAG(TransactionDate) OVER (PARTITION BY Sku ORDER BY TransactionDate), TransactionDate) as DaysSinceLast,
        TransactionType,
        Quantity
    FROM Transactions
    WHERE CustomerId = 2
),
GapAnalysis AS (
    SELECT 
        Sku,
        COUNT(*) as TransactionCount,
        MIN(TransactionDate) as FirstTransaction,
        MAX(TransactionDate) as LastTransaction,
        DATEDIFF(DAY, MIN(TransactionDate), MAX(TransactionDate)) as DateSpanDays,
        MAX(DaysSinceLast) as MaxDayGap,
        AVG(DATEDIFF(DAY, MIN(TransactionDate), MAX(TransactionDate)) / NULLIF(COUNT(*), 1)) as AvgDaysBetweenTxns
    FROM TransactionSequence
    WHERE PreviousTxnDate IS NOT NULL
    GROUP BY Sku
    HAVING MAX(DaysSinceLast) > 3  -- More than 3 days between transactions
)
SELECT 
    Sku,
    TransactionCount,
    FirstTransaction,
    LastTransaction,
    DateSpanDays,
    MaxDayGap,
    ROUND(AvgDaysBetweenTxns, 2) as AvgDaysBetweenTxns
FROM GapAnalysis
ORDER BY MaxDayGap DESC
LIMIT 20;

-- ============================================================================
-- 2. QUANTITY CONSISTENCY - Check if QtyBefore->QtyAfter chain is intact
-- ============================================================================
SELECT '' as blank;
SELECT 'ANALYSIS: Quantity Consistency Checks' as section;

WITH TransactionChain AS (
    SELECT 
        Sku,
        TransactionDate,
        TransactionType,
        Quantity,
        QuantityBefore,
        QuantityAfter,
        LAG(QuantityAfter) OVER (PARTITION BY Sku ORDER BY TransactionDate) as PreviousQtyAfter,
        LEAD(QuantityBefore) OVER (PARTITION BY Sku ORDER BY TransactionDate) as NextQtyBefore
    FROM Transactions
    WHERE CustomerId = 2
)
SELECT 
    Sku,
    TransactionDate,
    TransactionType,
    Quantity,
    QuantityBefore,
    QuantityAfter,
    CASE 
        WHEN PreviousQtyAfter IS NOT NULL AND PreviousQtyAfter <> QuantityBefore THEN 'MISMATCH'
        ELSE 'OK'
    END as PreviousChainStatus,
    (QuantityBefore + Quantity - QuantityAfter) as CalculationError  -- Should be 0
FROM TransactionChain
WHERE CustomerId = 2
    AND (PreviousQtyAfter IS NOT NULL AND PreviousQtyAfter <> QuantityBefore 
         OR QuantityBefore + Quantity - QuantityAfter <> 0)
LIMIT 30;

-- ============================================================================
-- 3. SYNC DATE RANGES - Identify date ranges for testing
-- ============================================================================
SELECT '' as blank;
SELECT 'SYNC DATE RANGES: Recommended test windows' as section;

SELECT 
    WEEK(TransactionDate) as WeekNum,
    MIN(DATE(TransactionDate)) as WeekStart,
    MAX(DATE(TransactionDate)) as WeekEnd,
    COUNT(*) as TransactionCount,
    COUNT(DISTINCT Sku) as UniqueSkus,
    COUNT(DISTINCT TransactionType) as TransactionTypes
FROM Transactions
WHERE CustomerId = 2
GROUP BY WEEK(TransactionDate)
ORDER BY MIN(DATE(TransactionDate)) DESC;

-- ============================================================================
-- 4. MISSING TRANSACTION TYPES - Check what types are being synced
-- ============================================================================
SELECT '' as blank;
SELECT 'TRANSACTION TYPES: Verify all types are captured' as section;

SELECT 
    TransactionType,
    COUNT(*) as Count,
    MIN(TransactionDate) as OldestRecord,
    MAX(TransactionDate) as NewestRecord,
    SUM(CASE WHEN TransactionType IN ('Add', 'Return') THEN Quantity ELSE -Quantity END) as NetQuantity
FROM Transactions
WHERE CustomerId = 2
GROUP BY TransactionType
ORDER BY Count DESC;

-- ============================================================================
-- 5. API RESPONSE SIZE CHECK - Verify if large date ranges return complete data
-- ============================================================================
SELECT '' as blank;
SELECT 'DATA SIZE ANALYSIS: Check transaction density by date range' as section;

WITH DateRanges AS (
    SELECT 
        DATE(TransactionDate) as TxnDate,
        COUNT(*) as DailyCount,
        COUNT(DISTINCT Sku) as DailySkus
    FROM Transactions
    WHERE CustomerId = 2
    GROUP BY DATE(TransactionDate)
)
SELECT 
    TxnDate,
    DailyCount,
    DailySkus,
    LAG(DailyCount) OVER (ORDER BY TxnDate) as PreviousDayCount,
    CASE 
        WHEN LAG(DailyCount) OVER (ORDER BY TxnDate) > 0 
             AND DailyCount = 0 THEN 'ZERO TRANSACTIONS DAY'
        WHEN DailyCount < (LAG(DailyCount) OVER (ORDER BY TxnDate) / 2) THEN 'DROP > 50%'
        ELSE 'NORMAL'
    END as AnomalyFlag
FROM DateRanges
WHERE AnomalyFlag IN ('ZERO TRANSACTIONS DAY', 'DROP > 50%')
ORDER BY TxnDate DESC;

-- ============================================================================
-- 6. SYNC COMPLETENESS - Compare Products vs Transactions
-- ============================================================================
SELECT '' as blank;
SELECT 'COMPLETENESS: SKUs in Products but missing from Transactions' as section;

SELECT 
    p.Sku,
    COUNT(DISTINCT t.Id) as TransactionCount,
    CASE 
        WHEN COUNT(DISTINCT t.Id) = 0 THEN 'NO TRANSACTIONS'
        WHEN COUNT(DISTINCT t.Id) < 10 THEN 'VERY LOW'
        WHEN COUNT(DISTINCT t.Id) < 50 THEN 'LOW'
        ELSE 'NORMAL'
    END as ActivityLevel
FROM Products p
LEFT JOIN Transactions t ON p.Sku = t.Sku AND t.CustomerId = 2
WHERE p.CustomerId = 2
GROUP BY p.Sku
HAVING COUNT(DISTINCT t.Id) < 10
ORDER BY TransactionCount;

-- ============================================================================
-- 7. INITIAL SYNC VALIDATION - For new customers
-- ============================================================================
SELECT '' as blank;
SELECT 'INITIAL SYNC VALIDATION: Oldest transaction dates' as section;

SELECT 
    MIN(TransactionDate) as OldestTransaction,
    MAX(TransactionDate) as NewestTransaction,
    DATEDIFF(DAY, MIN(TransactionDate), MAX(TransactionDate)) as DateRangeSpanDays,
    COUNT(*) as TotalTransactions,
    COUNT(DISTINCT Sku) as TotalSkus,
    COUNT(DISTINCT CustomerId) as CustomerCount
FROM Transactions
WHERE CustomerId = 2;
