using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Infrastructure.Data
{
    public static class DbSeeder
    {
        // Accept IServiceProvider so we can resolve Identity services (UserManager/RoleManager) and the DbContext.
        // This method will enforce safer behavior when running in Production: if seeding is explicitly enabled
        // in Production, required secrets (emails/passwords) must be provided via configuration (e.g. env vars)
        // otherwise the seeder will abort with a clear error to avoid accidentally creating insecure accounts.
        public static async Task SeedAsync(IServiceProvider provider)
        {
            using var scope = provider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var env = scope.ServiceProvider.GetService<IHostEnvironment>();
            var config = scope.ServiceProvider.GetService<IConfiguration>();
            var secretProvider = scope.ServiceProvider.GetService<SkuVaultSaaS.Infrastructure.Secrets.ISecretProvider>();
            var loggerFactory = scope.ServiceProvider.GetService<ILoggerFactory>();
            var logger = loggerFactory?.CreateLogger("DbSeeder");

            // Apply all pending migrations
            try
            {
                await context.Database.MigrateAsync();
                logger?.LogInformation("Database migrations applied successfully.");
            }
            catch (Exception ex)
            {
                // If tables already exist, that's OK - just log and continue
                if (ex.Message.Contains("already exists"))
                {
                    logger?.LogWarning("Database tables already exist. Skipping migrations. Error: {Message}", ex.Message);
                }
                else
                {
                    logger?.LogError(ex, "Failed to apply database migrations.");
                    throw;
                }
            }

            // Check if seeding is disabled
            var seedingEnabled = config?.GetValue<bool>("Seeding:Enabled") ?? (env != null && !env.IsProduction());
            if (!seedingEnabled)
            {
                logger?.LogInformation("Seeding is disabled. Skipping identity seeding.");
                return;
            }

            // Identity seeding: create roles and users when appropriate.
            var userManager = scope.ServiceProvider.GetService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetService<RoleManager<IdentityRole>>();

            if (userManager == null || roleManager == null || config == null)
            {
                logger?.LogWarning("Identity services or configuration are not available; skipping identity seeding.");
                return;
            }

            // If running in Production and seeding was requested, require explicit seed credentials.
            if (env != null && env.IsProduction())
            {
                // Validate required admin credentials are present
                var adminEmail = secretProvider?.GetSecret("SeedAdmin:Email") ?? config.GetValue<string>("SeedAdmin:Email");
                var adminPassword = secretProvider?.GetSecret("SeedAdmin:Password") ?? config.GetValue<string>("SeedAdmin:Password");

                if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
                {
                    var msg = "Production seeding requested but required admin credentials are missing. " +
                              "Provide SeedAdmin:Email and SeedAdmin:Password via environment variables or configuration.";
                    logger?.LogError(msg);
                    throw new InvalidOperationException(msg);
                }

                // Create only admin user in production
                await EnsureAdminUserAsync(context, userManager, roleManager, logger, adminEmail, adminPassword);
                return;
            }

            // Non-production: use sensible defaults for local dev convenience
            var safeAdminEmail = secretProvider?.GetSecret("SeedAdmin:Email") ?? config.GetValue<string>("SeedAdmin:Email") ?? "admin@example.com";
            var safeAdminPassword = secretProvider?.GetSecret("SeedAdmin:Password") ?? config.GetValue<string>("SeedAdmin:Password") ?? "P@ssw0rd!";

            await EnsureAdminUserAsync(context, userManager, roleManager, logger, safeAdminEmail, safeAdminPassword);
        }

        private static async Task EnsureAdminUserAsync(ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger? logger,
            string adminEmail,
            string adminPassword)
        {
            const string adminRole = "Admin";
            if (!await roleManager.RoleExistsAsync(adminRole))
            {
                await roleManager.CreateAsync(new IdentityRole(adminRole));
                logger?.LogInformation("Created role {Role}", adminRole);
            }

            // Admin user
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new ApplicationUser 
                { 
                    UserName = adminEmail, 
                    Email = adminEmail, 
                    EmailConfirmed = true,
                    CustomerRole = SkuVaultSaaS.Core.Enums.CustomerRole.Admin
                };
                var adminResult = await userManager.CreateAsync(adminUser, adminPassword);
                if (adminResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, adminRole);
                    logger?.LogInformation("Created admin user {Email}", adminEmail);
                }
                else
                {
                    logger?.LogWarning("Failed to create admin user {Email}: {Errors}", adminEmail, string.Join(';', adminResult.Errors));
                }
            }
            else
            {
                logger?.LogInformation("Admin user {Email} already exists", adminEmail);
            }
        }
    }
}
