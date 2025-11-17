namespace SkuVaultSaaS.Core.Models
{
    public class Tenant
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public ICollection<Customer> Customers { get; set; } = new List<Customer>();
        
    // SkuVault API credentials
    public string? SkuVaultEmail { get; set; }
    public string? SkuVaultPassword { get; set; }
        
    // SkuVault API tokens (retrieved via getTokens)
    public string? SkuVaultAccountId { get; set; }
    public string? SkuVaultTenantToken { get; set; }
    public string? SkuVaultUserToken { get; set; }
    }
}
