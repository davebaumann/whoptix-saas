-- Query to check if SkuVault credentials are encrypted in Tenant table
-- Run this after the backend has started and the migration has completed

-- View all tenants with credentials
SELECT 
    Id,
    Name,
    Email,
    SkuVaultEmail,
    SUBSTRING(SkuVaultPassword, 1, 50) AS PasswordFirst50Chars,
    LENGTH(SkuVaultPassword) AS PasswordLength,
    SUBSTRING(SkuVaultTenantToken, 1, 50) AS TenantTokenFirst50Chars,
    LENGTH(SkuVaultTenantToken) AS TenantTokenLength,
    SUBSTRING(SkuVaultUserToken, 1, 50) AS UserTokenFirst50Chars,
    LENGTH(SkuVaultUserToken) AS UserTokenLength
FROM Tenants
WHERE 
    SkuVaultPassword IS NOT NULL 
    OR SkuVaultTenantToken IS NOT NULL 
    OR SkuVaultUserToken IS NOT NULL;

-- Expected output:
-- - PasswordFirst50Chars should look like Base64: letters, numbers, +, /, = 
-- - Should NOT see readable plaintext like "password123" or common tokens
-- - PasswordLength should be > 20 (encrypted text is longer than plaintext)

-- If you see plaintext in the results, the encryption migration hasn't run yet.
-- Make sure the backend is running and check the logs for:
-- "Starting encryption of plaintext SkuVault credentials..."
