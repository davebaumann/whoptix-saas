namespace SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi
{
    public class SkuVaultApiOptions
    {
        public string BaseUrl { get; set; } = "https://app.skuvault.com/api/";
        public string UserToken { get; set; } = string.Empty; // API UserToken from SkuVault settings
        // Per-tenant tokens stored in Tenant.SkuVaultTenantToken
    }
}
