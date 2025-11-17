using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SkuVaultSaaS.Infrastructure.Configuration;
using SkuVaultSaaS.Infrastructure.Services;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Infrastructure.HostedServices
{
    public class SkuVaultSyncHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SkuVaultSyncHostedService> _logger;
        private readonly SyncSettings _syncSettings;

        public SkuVaultSyncHostedService(
            IServiceProvider serviceProvider,
            ILogger<SkuVaultSyncHostedService> logger,
            IOptions<SyncSettings> syncSettings)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _syncSettings = syncSettings.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Check if sync is enabled
            if (!_syncSettings.Enabled)
            {
                _logger.LogInformation("SkuVault Sync is disabled in configuration");
                return;
            }

            _logger.LogInformation("SkuVault Sync Hosted Service started - Interval: {Interval} minutes, Startup Delay: {Delay} minutes", 
                _syncSettings.IntervalMinutes, _syncSettings.DelayStartMinutes);

            // Wait for configured startup delay
            await Task.Delay(_syncSettings.StartupDelay, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Starting scheduled SkuVault sync (every {Interval} minutes)", _syncSettings.IntervalMinutes);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var syncService = scope.ServiceProvider.GetRequiredService<ISkuVaultSyncService>();
                        await syncService.SyncAllCustomersAsync();
                    }

                    _logger.LogInformation("Completed scheduled SkuVault sync. Next sync in {Interval} minutes", _syncSettings.IntervalMinutes);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during scheduled SkuVault sync");
                }

                // Wait for the next sync interval
                await Task.Delay(_syncSettings.SyncInterval, stoppingToken);
            }

            _logger.LogInformation("SkuVault Sync Hosted Service stopped");
        }
    }
}
