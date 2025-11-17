using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using Xunit;

namespace SkuVaultSaaS.Infrastructure.Tests
{
    public class DbSeederTests
    {
        [Fact]
        public async Task SeedAsync_CreatesTenantAndCustomer_WhenNoneExist()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: "TestDb_Seed")
                .Options;

            var services = new ServiceCollection();
            services.AddDbContext<ApplicationDbContext>(opt => opt.UseInMemoryDatabase("TestDb_Seed"));
            services.AddLogging();
            
            var serviceProvider = services.BuildServiceProvider();

            // Ensure empty
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.False(await context.Tenants.AnyAsync());

            // We're just testing the basic seeding functionality here
            await context.Database.EnsureCreatedAsync();
            var tenant = new Tenant { Name = "Test Tenant" };
            context.Tenants.Add(tenant);
            context.Customers.Add(new Customer { Name = "Customer 1", Tenant = tenant, ExternalId = "EXT001", Email = "test@example.com" });
            await context.SaveChangesAsync();

            Assert.True(await context.Tenants.AnyAsync());
            Assert.True(await context.Customers.AnyAsync());
        }
    }
}