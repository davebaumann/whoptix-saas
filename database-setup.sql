-- Database Setup for Multi-Environment Configuration
-- Run this on your MySQL server to create the required databases

-- Development Database (Local)
CREATE DATABASE IF NOT EXISTS skuvault_dev;
CREATE USER IF NOT EXISTS 'dev_user'@'localhost' IDENTIFIED BY 'dev_password_123';
GRANT ALL PRIVILEGES ON skuvault_dev.* TO 'dev_user'@'localhost';

-- UAT Database (Remote)
CREATE DATABASE IF NOT EXISTS skuvault_uat;
CREATE USER IF NOT EXISTS 'uat_user'@'%' IDENTIFIED BY 'uat_password_456';
GRANT ALL PRIVILEGES ON skuvault_uat.* TO 'uat_user'@'%';

-- Azure Database (Remote)
CREATE DATABASE IF NOT EXISTS whoptix_azure;
CREATE USER IF NOT EXISTS 'azure_user'@'%' IDENTIFIED BY 'azure_password_789';
GRANT ALL PRIVILEGES ON whoptix_azure.* TO 'azure_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show created databases
SHOW DATABASES LIKE '%skuvault%';
SHOW DATABASES LIKE '%whoptix%';