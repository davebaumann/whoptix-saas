using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi;
using Xunit;

namespace SkuVaultSaaS.Infrastructure.Tests.SkuVaultApi
{
    public class SkuVaultSyncJobTests
    {
        private readonly Mock<ISkuVaultApiClient> _mockApiClient;
        private readonly Mock<ILogger<SkuVaultSyncJob>> _mockLogger;
        private readonly ApplicationDbContext _dbContext;
        private readonly IServiceProvider _serviceProvider;

        public SkuVaultSyncJobTests()
        {
            _mockApiClient = new Mock<ISkuVaultApiClient>();
            _mockLogger = new Mock<ILogger<SkuVaultSyncJob>>();

            // Set up in-memory database
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
                .Options;
            _dbContext = new ApplicationDbContext(options);

            // Set up service provider
            var services = new ServiceCollection();
            services.AddSingleton(_mockApiClient.Object);
            services.AddSingleton(_dbContext);
            _serviceProvider = services.BuildServiceProvider();
        }

        [Fact]
        public async Task SyncCustomers_WithValidTenant_SyncsCustomers()
        {
            // Arrange
            var tenant = new Tenant
            {
                Id = 1,
                Name = "Test Tenant",
                SkuVaultTenantToken = "valid-token"
            };
            _dbContext.Tenants.Add(tenant);
            await _dbContext.SaveChangesAsync();

            var customers = new List<SkuVaultCustomerDto>
            {
                new() { Id = "cust1", Name = "Customer 1", Email = "customer1@example.com" },
                new() { Id = "cust2", Name = "Customer 2", Email = "customer2@example.com" }
            };

            _mockApiClient
                .Setup(x => x.GetCustomersForTenantAsync(tenant.SkuVaultTenantToken))
                .ReturnsAsync(customers);

            var job = new SkuVaultSyncJob(_serviceProvider, _mockLogger.Object);

            // Act
            await job.StartAsync(CancellationToken.None);
            // Give the job time to execute
            await Task.Delay(TimeSpan.FromSeconds(1));
            await job.StopAsync(CancellationToken.None);

            // Assert
            var syncedCustomers = await _dbContext.Customers.ToListAsync();
            Assert.Equal(2, syncedCustomers.Count);
            Assert.Contains(syncedCustomers, c => c.ExternalId == "cust1");
            Assert.Contains(syncedCustomers, c => c.ExternalId == "cust2");
        }

        [Fact]
        public async Task SyncCustomers_WithNoTenants_LogsAndSkips()
        {
            // Arrange
            var job = new SkuVaultSyncJob(_serviceProvider, _mockLogger.Object);

            // Act
            await job.StartAsync(CancellationToken.None);
            await Task.Delay(TimeSpan.FromSeconds(1));
            await job.StopAsync(CancellationToken.None);

            // Assert
            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => o.ToString().Contains("No tenants with SkuVault tokens found")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()
                ),
                Times.AtLeastOnce
            );

            _mockApiClient.Verify(x => x.GetCustomersForTenantAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task SyncCustomers_WithApiError_LogsErrorAndContinues()
        {
            // Arrange
            var tenant = new Tenant
            {
                Id = 1,
                Name = "Test Tenant",
                SkuVaultTenantToken = "valid-token"
            };
            _dbContext.Tenants.Add(tenant);
            await _dbContext.SaveChangesAsync();

            _mockApiClient
                .Setup(x => x.GetCustomersForTenantAsync(tenant.SkuVaultTenantToken))
                .ThrowsAsync(new HttpRequestException("API Error"));

            var job = new SkuVaultSyncJob(_serviceProvider, _mockLogger.Object);

            // Act
            await job.StartAsync(CancellationToken.None);
            await Task.Delay(TimeSpan.FromSeconds(1));
            await job.StopAsync(CancellationToken.None);

            // Assert
            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => o.ToString().Contains("Error syncing customers for tenant")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()
                ),
                Times.Once
            );
        }
    }
}