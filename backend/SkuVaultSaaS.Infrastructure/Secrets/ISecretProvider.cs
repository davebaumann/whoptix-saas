using System;

namespace SkuVaultSaaS.Infrastructure.Secrets
{
    // Simple abstraction for retrieving secrets from a pluggable provider.
    public interface ISecretProvider
    {
        // Returns the configured value for the provided key or null if not present.
        string? GetSecret(string key);
    }

}
