-- Add missing audit timestamp columns to Tenants table in UAT database
-- This fixes schema mismatch between EF Core model and database

ALTER TABLE Tenants 
ADD COLUMN IF NOT EXISTS CreatedAtUtc DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6);

ALTER TABLE Tenants 
ADD COLUMN IF NOT EXISTS UpdatedAtUtc DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

-- Verify the columns exist
DESCRIBE Tenants;
