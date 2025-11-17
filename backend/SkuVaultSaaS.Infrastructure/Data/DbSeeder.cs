using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Core.Models;

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

            // Basic tenant/customer seeding (safe and idempotent)
            if (!await context.Tenants.AnyAsync())
            {
                try
                {
                    // Try EF-based seeding first (preferred when schema matches models)
                    var tenant = new Tenant 
                    { 
                        Name = "Test Tenant",
                        SkuVaultTenantToken = "oEFB0JjwPPfxFlQdrWnM1CZoGsTWDzL0M+HN76zdwUY=",
                        SkuVaultUserToken = "WKJm9VseLAo6bPER7RAQdaSzFdu6uJewguZ9HHZcpqM="
                    };
                    context.Tenants.Add(tenant);
                    context.Customers.Add(new Customer { Name = "Customer 1", Tenant = tenant, ExternalId = "EXT001", Email = "Kim.baumann@skuvault.com", LastSyncedAt = DateTime.UtcNow });
                    await context.SaveChangesAsync();
                }
                catch (DbUpdateException ex)
                {
                    // Schema mismatch with remote DB (missing columns) — fall back to raw SQL inserts that target
                    // only the columns we know exist in the managed DB. This allows reseeding without altering the
                    // provider-managed schema.
                    logger?.LogWarning("EF seeding failed, falling back to raw SQL seeding: {Message}", ex.Message);

                    // Insert tenant using only the Name column
                    await context.Database.ExecuteSqlRawAsync("INSERT INTO Tenants (`Name`) VALUES ({0})", "Test Tenant");

                    // Retrieve the newly inserted tenant id using a raw SQL scalar query to avoid EF mapping
                    // attempting to read missing columns.
                    var connection = context.Database.GetDbConnection();
                    try
                    {
                        if (connection.State != System.Data.ConnectionState.Open)
                            await connection.OpenAsync();

                        using var cmd = connection.CreateCommand();
                        cmd.CommandText = "SELECT Id FROM Tenants WHERE Name = @name ORDER BY Id DESC LIMIT 1";
                        var p = cmd.CreateParameter();
                        p.ParameterName = "@name";
                        p.Value = "Test Tenant";
                        cmd.Parameters.Add(p);

                        var result = await cmd.ExecuteScalarAsync();
                        if (result != null && int.TryParse(result.ToString(), out var tenantId))
                        {
                            // Insert customer with the known columns: ExternalId, Name, Email, TenantId
                            await context.Database.ExecuteSqlRawAsync(
                                "INSERT INTO Customers (`ExternalId`, `Name`, `Email`, `TenantId`, `LastSyncedAt`) VALUES ({0}, {1}, {2}, {3}, {4})",
                                "EXT001", "Customer 1", "Kim.baumann@skuvault.com", tenantId, DateTime.UtcNow);
                        }
                        else
                        {
                            logger?.LogError("Could not determine tenant id after raw insert; reseed aborted.");
                        }
                    }
                    finally
                    {
                        if (connection.State == System.Data.ConnectionState.Open)
                            await connection.CloseAsync();
                    }
                }
            }

            // Identity seeding: create roles and users when appropriate.
            var userManager = scope.ServiceProvider.GetService<UserManager<IdentityUser>>();
            var roleManager = scope.ServiceProvider.GetService<RoleManager<IdentityRole>>();

            if (userManager == null || roleManager == null || config == null)
            {
                logger?.LogWarning("Identity services or configuration are not available; skipping identity seeding.");
                return;
            }

            // If running in Production and seeding was requested, require explicit seed credentials.
            if (env != null && env.IsProduction())
            {
                // Validate required secrets are present in configuration. These can come from appsettings or env vars
                // but in Production we treat missing values as an operator error.
                // Prefer secrets from the secret provider when available; fall back to configuration.
                var adminEmail = secretProvider?.GetSecret("SeedAdmin:Email") ?? config.GetValue<string>("SeedAdmin:Email");
                var adminPassword = secretProvider?.GetSecret("SeedAdmin:Password") ?? config.GetValue<string>("SeedAdmin:Password");
                var defaultUserEmail = secretProvider?.GetSecret("SeedDefaultUser:Email") ?? config.GetValue<string>("SeedDefaultUser:Email");
                var defaultUserPassword = secretProvider?.GetSecret("SeedDefaultUser:Password") ?? config.GetValue<string>("SeedDefaultUser:Password");

                if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword) ||
                    string.IsNullOrWhiteSpace(defaultUserEmail) || string.IsNullOrWhiteSpace(defaultUserPassword))
                {
                    var msg = "Production seeding requested but required seed credentials are missing. " +
                              "Provide SeedAdmin:Email, SeedAdmin:Password, SeedDefaultUser:Email and SeedDefaultUser:Password " +
                              "via environment variables or a secure configuration provider to proceed.";
                    logger?.LogError(msg);
                    throw new InvalidOperationException(msg);
                }

                // Use provided production credentials (no defaults).
                await EnsureRolesAndUsersAsync(context, userManager, roleManager, logger, defaultUserEmail, defaultUserPassword, adminEmail, adminPassword);
                return;
            }

            // Non-production: read seed values with sensible defaults for local dev convenience.
            // In non-production prefer secret provider values first (env vars, key vault wiring etc.), then config, then safe defaults for dev.
            var safeDefaultUserEmail = secretProvider?.GetSecret("SeedDefaultUser:Email") ?? config.GetValue<string>("SeedDefaultUser:Email") ?? "Kim.baumann@skuvault.com";
            var safeDefaultUserPassword = secretProvider?.GetSecret("SeedDefaultUser:Password") ?? config.GetValue<string>("SeedDefaultUser:Password") ?? "P@ssw0rd!";
            var safeAdminEmail = secretProvider?.GetSecret("SeedAdmin:Email") ?? config.GetValue<string>("SeedAdmin:Email") ?? "admin@example.com";
            var safeAdminPassword = secretProvider?.GetSecret("SeedAdmin:Password") ?? config.GetValue<string>("SeedAdmin:Password") ?? "P@ssw0rd!";

            await EnsureRolesAndUsersAsync(context, userManager, roleManager, logger, safeDefaultUserEmail, safeDefaultUserPassword, safeAdminEmail, safeAdminPassword);
        }

        private static async Task EnsureRolesAndUsersAsync(ApplicationDbContext context,
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger? logger,
            string defaultUserEmail,
            string defaultUserPassword,
            string adminEmail,
            string adminPassword)
        {
            const string roleName = "CustomerUser";
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
                logger?.LogInformation("Created role {Role}", roleName);
            }

            const string adminRole = "Admin";
            if (!await roleManager.RoleExistsAsync(adminRole))
            {
                await roleManager.CreateAsync(new IdentityRole(adminRole));
                logger?.LogInformation("Created role {Role}", adminRole);
            }

            // Default/non-admin user
            var user = await userManager.FindByEmailAsync(defaultUserEmail);
            if (user == null)
            {
                user = new IdentityUser { UserName = defaultUserEmail, Email = defaultUserEmail, EmailConfirmed = true };
                var createResult = await userManager.CreateAsync(user, defaultUserPassword);
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, roleName);
                    logger?.LogInformation("Created seeded user {Email} and added to role {Role}", defaultUserEmail, roleName);

                    // Optionally associate this user with an existing customer record.
                    // Avoid EF projections here because the provider-managed DB may be missing columns
                    // referenced by the model (which would cause "Unknown column" errors). Use a
                    // lightweight raw SQL lookup and insert instead.
                    var connection = context.Database.GetDbConnection();
                    try
                    {
                        if (connection.State != System.Data.ConnectionState.Open)
                            await connection.OpenAsync();

                        // Check if a customer already exists for this email
                        using (var checkCmd = connection.CreateCommand())
                        {
                            checkCmd.CommandText = "SELECT Id FROM Customers WHERE Email = @email LIMIT 1";
                            var p = checkCmd.CreateParameter();
                            p.ParameterName = "@email";
                            p.Value = user.Email ?? string.Empty;
                            checkCmd.Parameters.Add(p);

                            var existing = await checkCmd.ExecuteScalarAsync();
                            if (existing == null)
                            {
                                // No customer exists; find any tenant id to attach this customer to.
                                using var tenantCmd = connection.CreateCommand();
                                tenantCmd.CommandText = "SELECT Id FROM Tenants LIMIT 1";
                                var tRes = await tenantCmd.ExecuteScalarAsync();
                                if (tRes != null && int.TryParse(tRes.ToString(), out var tenantId))
                                {
                                    // Insert the customer row using only the known columns.
                                    await context.Database.ExecuteSqlRawAsync(
                                        "INSERT INTO Customers (`ExternalId`, `Name`, `Email`, `TenantId`, `LastSyncedAt`) VALUES ({0}, {1}, {2}, {3}, {4})",
                                        "TEST_EXT_001", "Test Customer from Seeder", user.Email ?? string.Empty, tenantId, DateTime.UtcNow);
                                }
                                else
                                {
                                    logger?.LogWarning("No tenant found to associate seeded customer {Email}", user.Email);
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        logger?.LogError(ex, "Failed to create/associate customer for seeded user {Email} using raw SQL fallback.", user?.Email);
                    }
                    finally
                    {
                        if (connection.State == System.Data.ConnectionState.Open)
                            await connection.CloseAsync();
                    }
                }
                else
                {
                    logger?.LogWarning("Failed to create seeded user {Email}: {Errors}", defaultUserEmail, string.Join(';', createResult.Errors));
                }
            }

            // Admin user
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new IdentityUser { UserName = adminEmail, Email = adminEmail, EmailConfirmed = true };
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
        }
    }
}
