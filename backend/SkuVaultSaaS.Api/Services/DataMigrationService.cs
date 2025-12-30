using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SkuVaultSaaS.Api.Services
{
    /// <summary>
    /// Service for one-time data migrations, such as encrypting plaintext credentials
    /// </summary>
    public class DataMigrationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IEncryptionService _encryptionService;
        private readonly ILogger<DataMigrationService> _logger;

        public DataMigrationService(
            ApplicationDbContext context, 
            IEncryptionService encryptionService,
            ILogger<DataMigrationService> logger)
        {
            _context = context;
            _encryptionService = encryptionService;
            _logger = logger;
        }

        /// <summary>
        /// Encrypts all plaintext SkuVault credentials in the Tenant table
        /// </summary>
        public async Task EncryptPlaintextSkuVaultCredentialsAsync()
        {
            _logger.LogInformation("Starting encryption of plaintext SkuVault credentials...");

            try
            {
                var tenants = await _context.Tenants
                    .Where(t => !string.IsNullOrEmpty(t.SkuVaultPassword) || 
                                !string.IsNullOrEmpty(t.SkuVaultTenantToken) || 
                                !string.IsNullOrEmpty(t.SkuVaultUserToken))
                    .ToListAsync();

                if (tenants.Count == 0)
                {
                    _logger.LogInformation("No tenants with SkuVault credentials found.");
                    return;
                }

                int encryptedCount = 0;
                int skipCount = 0;

                foreach (var tenant in tenants)
                {
                    // Check if already encrypted by looking for Base64 pattern
                    bool passwordIsEncrypted = IsAlreadyEncrypted(tenant.SkuVaultPassword ?? string.Empty);
                    bool tenantTokenIsEncrypted = IsAlreadyEncrypted(tenant.SkuVaultTenantToken ?? string.Empty);
                    bool userTokenIsEncrypted = IsAlreadyEncrypted(tenant.SkuVaultUserToken ?? string.Empty);

                    if (passwordIsEncrypted && tenantTokenIsEncrypted && userTokenIsEncrypted)
                    {
                        _logger.LogDebug($"Tenant {tenant.Id} already has encrypted credentials, skipping.");
                        skipCount++;
                        continue;
                    }

                    try
                    {
                        // Encrypt password if plaintext
                        if (!string.IsNullOrEmpty(tenant.SkuVaultPassword) && !passwordIsEncrypted)
                        {
                            tenant.SkuVaultPassword = _encryptionService.Encrypt(tenant.SkuVaultPassword);
                            _logger.LogDebug($"Encrypted password for Tenant {tenant.Id}");
                        }

                        // Encrypt tenant token if plaintext
                        if (!string.IsNullOrEmpty(tenant.SkuVaultTenantToken) && !tenantTokenIsEncrypted)
                        {
                            tenant.SkuVaultTenantToken = _encryptionService.Encrypt(tenant.SkuVaultTenantToken);
                            _logger.LogDebug($"Encrypted tenant token for Tenant {tenant.Id}");
                        }

                        // Encrypt user token if plaintext
                        if (!string.IsNullOrEmpty(tenant.SkuVaultUserToken) && !userTokenIsEncrypted)
                        {
                            tenant.SkuVaultUserToken = _encryptionService.Encrypt(tenant.SkuVaultUserToken);
                            _logger.LogDebug($"Encrypted user token for Tenant {tenant.Id}");
                        }

                        encryptedCount++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error encrypting credentials for Tenant {tenant.Id}: {ex.Message}");
                        throw;
                    }
                }

                // Save all changes
                if (encryptedCount > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Successfully encrypted credentials for {encryptedCount} tenants. {skipCount} tenants already encrypted.");
                }
                else
                {
                    _logger.LogInformation($"No tenants needed encryption. {skipCount} tenants already encrypted.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Fatal error during credential encryption migration: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Detects if a credential string is likely encrypted (Base64-encoded) vs plaintext
        /// This is a heuristic check - truly encrypted data from AES is Base64-encoded
        /// </summary>
        private bool IsAlreadyEncrypted(string credential)
        {
            if (string.IsNullOrEmpty(credential))
                return false;

            try
            {
                // Encrypted values are Base64-encoded
                // Try to decode it - if successful, it's likely encrypted
                var bytes = Convert.FromBase64String(credential);
                
                // Additional check: encrypted data shouldn't contain common plaintext characters
                // like spaces, special chars used in passwords (except common ones)
                // But this is heuristic - we'll also check length
                // AES output is generally longer than typical tokens
                return credential.Length > 20; // Most tokens/passwords are shorter when encrypted
            }
            catch (FormatException)
            {
                // Not valid Base64, so it's plaintext
                return false;
            }
        }
    }
}
