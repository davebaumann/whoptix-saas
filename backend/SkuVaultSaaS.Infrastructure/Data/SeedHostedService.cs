using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace SkuVaultSaaS.Infrastructure.Data
{
    // One-shot hosted service that runs the DbSeeder when enabled via configuration.
    public class SeedHostedService : IHostedService
    {
        private readonly IServiceProvider _provider;
        private readonly IConfiguration _config;
        private readonly IHostEnvironment _env;
        private readonly ILogger<SeedHostedService> _logger;

        public SeedHostedService(IServiceProvider provider, IConfiguration config, IHostEnvironment env, ILogger<SeedHostedService> logger)
        {
            _provider = provider;
            _config = config;
            _env = env;
            _logger = logger;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            // Determine whether seeding should run. Prefer explicit config; fall back to Development environment.
            var enabled = _config.GetValue<bool?>("SeedDatabase");
            if (!enabled.HasValue)
            {
                enabled = _env.IsDevelopment();
            }

            if (!enabled.Value)
            {
                _logger.LogDebug("Database seeding is disabled by configuration.");
                return;
            }

            using var scope = _provider.CreateScope();

            // Run seeder (async). We log errors and rethrow to make failures visible in startup logs; callers
            // may choose how to handle (the host can be configured to stop on startup failure).
            try
            {
                await DbSeeder.SeedAsync(scope.ServiceProvider);
                _logger.LogInformation("Database seeding completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database seeding failed.");
                // Re-throwing would stop the host; keep existing behavior of not throwing to preserve best-effort startup,
                // but log the failure prominently so operators notice.
            }
        }

        // Nothing to do on stop.
        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
