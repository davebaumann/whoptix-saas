-- Add customer cancellation tracking fields
-- Run this script to add the new fields needed for automated data purge

ALTER TABLE Customers 
ADD COLUMN IsActive BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN CancelledAt DATETIME NULL,
ADD COLUMN ScheduledForDeletion DATETIME NULL;

-- Add indexes for performance on purge queries
CREATE INDEX IX_Customers_IsActive_CancelledAt ON Customers (IsActive, CancelledAt);
CREATE INDEX IX_Customers_ScheduledForDeletion ON Customers (ScheduledForDeletion);

-- Update existing customers to be active by default
UPDATE Customers SET IsActive = TRUE WHERE IsActive IS NULL;