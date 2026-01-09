-- ============================================================================
-- DEMO DATABASE SCHEMA SYNC - Missing Columns
-- ============================================================================
-- The demo database is missing columns added in recent migrations
-- This script brings the demo Customers table up to date

USE justsku_demo;

-- Add missing columns to Customers table
ALTER TABLE `Customers` ADD COLUMN `CancelledAt` datetime(6) NULL;
ALTER TABLE `Customers` ADD COLUMN `ScheduledForDeletion` datetime(6) NULL;
ALTER TABLE `Customers` ADD COLUMN `StripeCustomerId` longtext CHARACTER SET utf8mb4 NULL;

-- Verify the updated structure
DESCRIBE `Customers`;

-- Verify data integrity
SELECT COUNT(*) as TotalCustomers FROM `Customers`;
SELECT * FROM `Customers` WHERE Id = 2;
