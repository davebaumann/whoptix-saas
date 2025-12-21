-- Create Demo Customer (Customer 2) in UAT database
-- This customer will be used for the public demo

-- First, get or create the default tenant
SET @tenantId = (SELECT Id FROM Tenants LIMIT 1);
IF @tenantId IS NULL THEN
    INSERT INTO Tenants (Name, CreatedAt) VALUES ('JUSTSKU Demo', NOW());
    SET @tenantId = LAST_INSERT_ID();
END IF;

-- Insert the demo customer
INSERT INTO Customers (ExternalId, Name, Email, TenantId, MembershipLevel, LastSyncedAt, IsActive, LowStockNotificationsEnabled, LowStockCheckIntervalMinutes)
VALUES (
    'demo-customer-2',
    'JUSTSKU Demo Account',
    'demo@justsku.local',
    @tenantId,
    2,  -- Premium membership (MembershipLevel enum value)
    NOW(),
    1,  -- IsActive = true
    0,  -- LowStockNotificationsEnabled = false
    240 -- LowStockCheckIntervalMinutes = 240
)
ON DUPLICATE KEY UPDATE 
    Name = 'JUSTSKU Demo Account',
    Email = 'demo@justsku.local',
    MembershipLevel = 2,
    IsActive = 1;

SELECT 'Demo customer created/updated' as Status;
