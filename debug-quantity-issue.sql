-- Find the most recent transaction for SONARTSGBLACKGREYSTD
SELECT 
    Sku,
    TransactionDate,
    TransactionType,
    Quantity,
    QuantityBefore,
    QuantityAfter,
    ROW_NUMBER() OVER (PARTITION BY Sku ORDER BY TransactionDate DESC) as RecencyRank
FROM Transactions
WHERE Sku = 'SONARTSGBLACKGREYSTD'
ORDER BY TransactionDate DESC
LIMIT 10;

-- Sum all Add/Return vs Pick for this SKU
SELECT 
    SUM(CASE WHEN TransactionType IN ('Add', 'Return') THEN Quantity ELSE 0 END) as TotalAdded,
    SUM(CASE WHEN TransactionType IN ('Pick', 'Remove') THEN Quantity ELSE 0 END) as TotalRemoved,
    SUM(CASE WHEN TransactionType IN ('Add', 'Return') THEN Quantity ELSE 0 END) 
    - SUM(CASE WHEN TransactionType IN ('Pick', 'Remove') THEN Quantity ELSE 0 END) as CalculatedCurrent
FROM Transactions
WHERE Sku = 'SONARTSGBLACKGREYSTD';

-- Get the actual most recent QuantityAfter (the truth)
SELECT 
    Sku,
    MAX(TransactionDate) as MostRecentDate,
    (SELECT QuantityAfter FROM Transactions t2 WHERE t2.Sku = 'SONARTSGBLACKGREYSTD' ORDER BY TransactionDate DESC LIMIT 1) as ActualCurrentQty
FROM Transactions
WHERE Sku = 'SONARTSGBLACKGREYSTD';
