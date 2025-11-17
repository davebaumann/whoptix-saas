using Microsoft.Extensions.Configuration;

namespace SkuVaultSaaS.Infrastructure.Secrets
{
    // Default implementation: reads secrets from IConfiguration (which includes environment variables
    // and any configuration providers registered in Program.cs). This keeps behaviour env-var-first
    // when running in typical ASP.NET Core hosts.
    public class DefaultSecretProvider : ISecretProvider
    {
        private readonly IConfiguration _config;

        public DefaultSecretProvider(IConfiguration config)
        {
            _config = config;
        }

        public string? GetSecret(string key)
        {
            // IConfiguration already supports hierarchical keys with ':' and environment overrides
            return _config[key];
        }
    }
}
