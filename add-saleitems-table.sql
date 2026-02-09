-- Create SaleItems table to store individual items from sales
CREATE TABLE SaleItems (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    SaleId VARCHAR(100) NOT NULL,
    CustomerId INT NOT NULL,
    Sku VARCHAR(100),
    Quantity INT,
    UnitPrice DECIMAL(10, 2),
    ItemType VARCHAR(50),  -- 'MerchantItem' or 'FulfilledItem'
    CreatedAtUtc DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAtUtc DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (CustomerId) REFERENCES Customers(Id) ON DELETE CASCADE,
    INDEX idx_saleid_customerid (SaleId, CustomerId),
    INDEX idx_sku (Sku),
    INDEX idx_customerid (CustomerId)
);

-- Update Sales table to remove Sku, Quantity, Price columns (moved to SaleItems)
-- Keep these for backwards compatibility but mark as deprecated
-- ALTER TABLE Sales ADD COLUMN ItemType VARCHAR(50);
