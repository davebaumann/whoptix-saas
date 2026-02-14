using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.DataProtection;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi;
using SkuVaultSaaS.Infrastructure.Secrets;
using SkuVaultSaaS.Infrastructure.Configuration;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Services;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using Serilog;
using SkuVaultSaaS.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog for comprehensive logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()  // Log INFO and above
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentUserName()
    .Enrich.WithMachineName()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Log startup for verification
Log.Information("=== API STARTUP INITIATED === Environment: {Environment}, Timestamp: {Timestamp}", 
    Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
    DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff zzz"));

// Load environment variables from .env file
DotNetEnv.Env.Load();

// Explicitly configure to load environment-specific appsettings
var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{environment}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// Register a pluggable secret provider. The default implementation reads from IConfiguration
// which includes environment variables and any other configuration providers registered below.
builder.Services.AddSingleton<SkuVaultSaaS.Infrastructure.Secrets.ISecretProvider, SkuVaultSaaS.Infrastructure.Secrets.DefaultSecretProvider>();

// SkuVault API config and client
builder.Services.Configure<SkuVaultApiOptions>(builder.Configuration.GetSection("SkuVaultApi"));
builder.Services.AddHttpClient<ISkuVaultApiClient, SkuVaultApiClient>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(300); // 5 minutes - SkuVault API is heavily throttled
    });

// SkuVault Sync Service
builder.Services.AddScoped<SkuVaultSaaS.Infrastructure.Services.ISkuVaultSyncService, SkuVaultSaaS.Infrastructure.Services.SkuVaultSyncService>();

// Email Service
builder.Services.AddScoped<IEmailService, EmailService>();

// Two-Factor Authentication Service
builder.Services.AddScoped<ITwoFactorService, TwoFactorService>();

// Encryption Service for sensitive credentials (SkuVault passwords/tokens)
builder.Services.AddScoped<IEncryptionService, AesEncryptionService>();

// Data Migration Service for one-time migrations (e.g., encrypting plaintext credentials)
builder.Services.AddScoped<DataMigrationService>();

// User Context Service for tenant isolation
builder.Services.AddScoped<UserContextService>();

// Caching Service for reducing database connections
builder.Services.AddScoped<SkuVaultSaaS.Api.Services.ICachingService, SkuVaultSaaS.Api.Services.CachingService>();

// Demo Connection Service for routing demo users to demo database
// This will be registered after demoConnectionString is built below
// builder.Services.AddScoped<SkuVaultSaaS.Infrastructure.Services.IDemoConnectionService, SkuVaultSaaS.Infrastructure.Services.DemoConnectionService>();

// Report Access Service for membership-based report authorization
// Use Singleton to ensure configuration persists for the lifetime of the application
builder.Services.AddSingleton<SkuVaultSaaS.Core.Services.IReportAccessService, SkuVaultSaaS.Core.Services.ReportAccessService>();

// Configure sync settings from appsettings
builder.Services.Configure<SkuVaultSaaS.Infrastructure.Configuration.SyncSettings>(
    builder.Configuration.GetSection("SyncSettings"));

// Configure Email and Notification Settings with environment variable substitution
builder.Services.Configure<SkuVaultSaaS.Infrastructure.Services.EmailSettings>(options =>
{
    var emailSection = builder.Configuration.GetSection("EmailSettings");
    emailSection.Bind(options);
    
    // Replace environment variable placeholders
    if (!string.IsNullOrEmpty(options.Password) && options.Password.Contains("${EMAIL_PASSWORD}"))
    {
        var envPassword = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");
        options.Password = string.IsNullOrEmpty(envPassword) ? options.Password : envPassword;
    }

    Console.WriteLine($"[STARTUP] EmailSettings loaded:");
    Console.WriteLine($"  SmtpHost: {options.SmtpHost}");
    Console.WriteLine($"  SmtpPort: {options.SmtpPort}");
    Console.WriteLine($"  Username: {options.Username}");
    Console.WriteLine($"  Password: {(string.IsNullOrEmpty(options.Password) ? "NOT SET" : "SET")}");
    Console.WriteLine($"  FromName: {options.FromName}");
});
builder.Services.Configure<SkuVaultSaaS.Infrastructure.HostedServices.LowStockNotificationSettings>(
    builder.Configuration.GetSection("LowStockNotificationSettings"));

// Register Email Service
builder.Services.AddScoped<SkuVaultSaaS.Infrastructure.Services.IEmailService, SkuVaultSaaS.Infrastructure.Services.EmailService>();

// Enable automatic sync with configurable intervals
builder.Services.AddHostedService<SkuVaultSaaS.Infrastructure.HostedServices.SkuVaultSyncHostedService>();

// Enable low stock notification service
builder.Services.AddHostedService<SkuVaultSaaS.Infrastructure.HostedServices.LowStockNotificationHostedService>();

// Enable customer data purge service
builder.Services.AddHostedService<SkuVaultSaaS.Infrastructure.HostedServices.CustomerDataPurgeService>();

// Enable demo data refresh service (daily at 6 AM ET)
builder.Services.AddHostedService<DemoDataRefreshService>();

// Enable error alerting service (checks logs every 10 minutes and sends email alerts)
builder.Services.AddHostedService<ErrorAlertingService>();

// Note: SkuVaultSyncJob is disabled for local development against the managed remote DB
// because the hosted DB schema on the provider doesn't match migrations and the sync
// job tries to read columns that may not exist. Re-enable when the schema is compatible.
// builder.Services.AddHostedService<SkuVaultSyncJob>();


// MySQL connection string with environment variable substitution
var connectionStringTemplate = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// Replace environment variable placeholders
var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
var dbName = Environment.GetEnvironmentVariable("DB_NAME");
var dbUser = Environment.GetEnvironmentVariable("DB_USER");
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");

Console.WriteLine($"[DEBUG] DB_HOST env var: {dbHost}");
Console.WriteLine($"[DEBUG] DB_NAME env var: {dbName}");
Console.WriteLine($"[DEBUG] DB_USER env var: {dbUser}");
Console.WriteLine($"[DEBUG] DB_PASSWORD env var: {(string.IsNullOrEmpty(dbPassword) ? "NOT SET" : "***")}");

var connectionString = connectionStringTemplate.Replace("${DB_HOST}", dbHost);
connectionString = connectionString.Replace("${DB_NAME}", dbName);
connectionString = connectionString.Replace("${DB_USER}", dbUser);
connectionString = connectionString.Replace("${DB_PASSWORD}", dbPassword);

// Also build the demo connection string (uses same credentials but different database name)
var demoConnectionStringTemplate = builder.Configuration.GetConnectionString("DemoConnection")
    ?? throw new InvalidOperationException("Connection string 'DemoConnection' not found.");
var demoConnectionString = demoConnectionStringTemplate.Replace("${DB_HOST}", dbHost);
demoConnectionString = demoConnectionString.Replace("${DB_USER}", dbUser);
demoConnectionString = demoConnectionString.Replace("${DB_PASSWORD}", dbPassword);
// DemoConnection hardcodes justsku_demo as the database name, so no need to replace ${DB_NAME}

// Log the final connection strings for debugging (DO NOT log passwords in production)
Console.WriteLine($"[DEBUG] Final DB Connection String: Server=***;Database={dbName};User={dbUser};Password=***;...");
Console.WriteLine($"[DEBUG] Final Demo Connection String: Server=***;Database=justsku_demo;User={dbUser};Password=***;...");

// Now that demoConnectionString is built, register the DemoConnectionService with the substituted demo connection string
builder.Services.AddScoped<SkuVaultSaaS.Infrastructure.Services.IDemoConnectionService>(provider =>
{
    return new SkuVaultSaaS.Infrastructure.Services.DemoConnectionService(demoConnectionString);
});

// Also handle other configuration substitutions for AllowedHosts
var allowedHostsEnv = Environment.GetEnvironmentVariable("ALLOWED_HOSTS");
var allowedHosts = builder.Configuration["AllowedHosts"];
Console.WriteLine($"[DEBUG] ALLOWED_HOSTS env var: {allowedHostsEnv}");
Console.WriteLine($"[DEBUG] AllowedHosts config before: {allowedHosts}");

if (!string.IsNullOrEmpty(allowedHosts) && allowedHosts.Contains("${ALLOWED_HOSTS}"))
{
    var replacement = allowedHostsEnv ?? "justsku.com;*.justsku.com";
    var newAllowedHosts = allowedHosts.Replace("${ALLOWED_HOSTS}", replacement);
    builder.Configuration["AllowedHosts"] = newAllowedHosts;
    Console.WriteLine($"[DEBUG] AllowedHosts config after: {newAllowedHosts}");
}

// Handle SeedAdmin environment variable substitution
var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL");
var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");
Console.WriteLine($"[DEBUG] ADMIN_EMAIL env var: {adminEmail ?? "NOT_SET"}");
Console.WriteLine($"[DEBUG] ADMIN_PASSWORD env var: {(string.IsNullOrEmpty(adminPassword) ? "NOT_SET" : "SET")}");
if (!string.IsNullOrEmpty(adminEmail))
{
    builder.Configuration["SeedAdmin:Email"] = adminEmail;
    Console.WriteLine($"[DEBUG] Set SeedAdmin:Email = {adminEmail}");
}
if (!string.IsNullOrEmpty(adminPassword))
{
    builder.Configuration["SeedAdmin:Password"] = adminPassword;
    Console.WriteLine($"[DEBUG] Set SeedAdmin:Password");
}
var seedDatabaseConfig = builder.Configuration["SeedDatabase"];
Console.WriteLine($"[DEBUG] SeedDatabase config: {seedDatabaseConfig}");

// Fetch Stripe keys from AWS Parameter Store
Console.WriteLine("[INFO] Attempting to fetch Stripe keys from AWS Parameter Store...");
try
{
    var ssm = new AmazonSimpleSystemsManagementClient();
    
    // Fetch Stripe Publishable Key
    try
    {
        var pubKeyParam = ssm.GetParameterAsync(new GetParameterRequest 
        { 
            Name = "stripe-publishable-key", 
            WithDecryption = true 
        }).GetAwaiter().GetResult();
        builder.Configuration["Stripe:PublishableKey"] = pubKeyParam.Parameter.Value;
        Console.WriteLine("[INFO] Stripe Publishable Key loaded from Parameter Store");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[WARN] Stripe Publishable Key failed. Exception: {ex.GetType().Name}: {ex.Message}");
        var pubKeyEnv = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY");
        if (!string.IsNullOrEmpty(pubKeyEnv))
        {
            builder.Configuration["Stripe:PublishableKey"] = pubKeyEnv;
            Console.WriteLine("[INFO] ✓ Stripe Publishable Key loaded from environment variable");
        }
        else
        {
            Console.WriteLine("[ERROR] ✗ STRIPE_PUBLISHABLE_KEY env var not set!");
        }
    }
    
    // Fetch Stripe Secret Key
    try
    {
        var secretKeyParam = ssm.GetParameterAsync(new GetParameterRequest 
        { 
            Name = "stripe-secret-key", 
            WithDecryption = true 
        }).GetAwaiter().GetResult();
        builder.Configuration["Stripe:SecretKey"] = secretKeyParam.Parameter.Value;
        Console.WriteLine("[INFO] Stripe Secret Key loaded from Parameter Store");
    }
    catch (Exception ex) when (ex.Message.Contains("ParameterNotFound") || ex is Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementException)
    {
        Console.WriteLine("[WARN] Stripe Secret Key not found in Parameter Store, using environment/config value");
    }
    
    // Fetch Stripe Webhook Secret
    try
    {
        var webhookParam = ssm.GetParameterAsync(new GetParameterRequest 
        { 
            Name = "stripe-webhook-secret", 
            WithDecryption = true 
        }).GetAwaiter().GetResult();
        builder.Configuration["Stripe:WebhookSecret"] = webhookParam.Parameter.Value;
        Console.WriteLine("[INFO] Stripe Webhook Secret loaded from Parameter Store");
    }
    catch (Exception ex) when (ex.Message.Contains("ParameterNotFound") || ex is Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementException)
    {
        Console.WriteLine("[WARN] Stripe Webhook Secret not found in Parameter Store, using environment/config value");
    }
    
    // Fetch Encryption Key
    try
    {
        var encryptionKeyParam = ssm.GetParameterAsync(new GetParameterRequest 
        { 
            Name = "/justsku/ENCRYPTION_KEY", 
            WithDecryption = true 
        }).GetAwaiter().GetResult();
        builder.Configuration["Encryption:Key"] = encryptionKeyParam.Parameter.Value;
        Console.WriteLine("[INFO] Encryption Key loaded from Parameter Store");
    }
    catch (Exception ex) when (ex.Message.Contains("ParameterNotFound") || ex is Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementException)
    {
        Console.WriteLine("[WARN] Encryption Key not found in Parameter Store, using environment/config value");
    }
    
    // Fetch Encryption IV
    try
    {
        var encryptionIvParam = ssm.GetParameterAsync(new GetParameterRequest 
        { 
            Name = "/justsku/ENCRYPTION_IV", 
            WithDecryption = true 
        }).GetAwaiter().GetResult();
        builder.Configuration["Encryption:IV"] = encryptionIvParam.Parameter.Value;
        Console.WriteLine("[INFO] Encryption IV loaded from Parameter Store");
    }
    catch (Exception ex) when (ex.Message.Contains("ParameterNotFound") || ex is Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementException)
    {
        Console.WriteLine("[WARN] Encryption IV not found in Parameter Store, using environment/config value");
    }
    
    // Fetch Stripe Price Amounts
    Console.WriteLine("[DEBUG] Starting to fetch Stripe Price Amounts from Parameter Store...");
    string[] priceAmountKeys = { "standard_monthly", "premium_monthly", "enterprise_monthly" };
    foreach (var key in priceAmountKeys)
    {
        try
        {
            var priceAmountParam = ssm.GetParameterAsync(new GetParameterRequest 
            { 
                Name = "/justsku/Stripe/PriceAmounts/" + key, 
                WithDecryption = false 
            }).GetAwaiter().GetResult();
            builder.Configuration["Stripe:PriceAmounts:" + key] = priceAmountParam.Parameter.Value;
            Console.WriteLine("[INFO] Stripe PriceAmount for " + key + " loaded from Parameter Store: " + priceAmountParam.Parameter.Value);
        }
        catch (Exception ex) when (ex.Message.Contains("ParameterNotFound") || ex is Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementException)
        {
            Console.WriteLine("[WARN] Stripe PriceAmount for " + key + " not found in Parameter Store, using config value");
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"[WARN] Error fetching from Parameter Store: {ex.Message}. Continuing with environment variables.");
}

// Add DbContext with optimized connection pooling
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString), mySqlOptions =>
    {
        // Connection resilience
        mySqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null);
        
        // Increase command timeout for complex reports (default is 30 seconds)
        mySqlOptions.CommandTimeout(300); // 5 minutes for aging inventory and other complex queries
    }), ServiceLifetime.Scoped); // Explicit scoped lifetime

// Add memory caching for frequent queries
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 1000; // Limit cache entries
    options.CompactionPercentage = 0.25; // Remove 25% when limit reached
});

// Add Identity with security settings
builder.Services.AddDefaultIdentity<ApplicationUser>(options => {
    options.SignIn.RequireConfirmedAccount = false;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<ApplicationDbContext>();

// Configure Data Protection (for protecting sensitive data like authentication tokens/keys)
// This suppresses the warning about unencrypted XML keys
var dataProtectionPath = Path.Combine("/app/data-protection-keys"); // Docker mounted volume
if (!Directory.Exists(dataProtectionPath))
{
    Directory.CreateDirectory(dataProtectionPath);
}
var dpBuilder = builder.Services.AddDataProtection()
    .SetApplicationName("SkuVaultSaaS")
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionPath));

// Note: DPAPI encryption is Windows-only. On Linux/Docker, keys are stored unencrypted in the mounted volume.
// For production, consider using Azure Key Vault, AWS KMS, or similar for key management.
// This is acceptable since the keys are only used for protecting session data and antiforgery tokens.

// JWT Authentication
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection.GetValue<string>("Key");
var jwtIssuer = jwtSection.GetValue<string>("Issuer");
var jwtAudience = jwtSection.GetValue<string>("Audience");
if (!string.IsNullOrWhiteSpace(jwtKey))
{
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        
        // Configure to read JWT token from cookies
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Check for token in Authorization header first
                if (string.IsNullOrEmpty(context.Token))
                {
                    // If no Authorization header, check for AuthToken cookie
                    var token = context.Request.Cookies["AuthToken"];
                    if (!string.IsNullOrEmpty(token))
                    {
                        context.Token = token;
                        // Token found in cookie
                    }
                }
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                // Log authentication failures for monitoring
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                // Token validated successfully
                return Task.CompletedTask;
            }
        };
    });
}

// Response caching disabled - reports can be very large and shouldn't be cached in memory
// builder.Services.AddResponseCaching(options =>
// {
//     options.MaximumBodySize = 1024 * 1024; // 1MB
//     options.UseCaseSensitivePaths = false;
// });

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization using the Bearer scheme. Enter only the token, no 'Bearer' prefix.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// Register the seeding hosted service (will attempt safe seeding and fall back to raw SQL when
// the provider schema is missing optional columns). Enabled so we can reseed on startup.
builder.Services.AddHostedService<SkuVaultSaaS.Infrastructure.Data.SeedHostedService>();

// CORS for frontend - configured per environment
builder.Services.AddCors(options =>
{
    // Get allowed origins from configuration (environment-specific)
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
        ?? new[] { "http://localhost:5173" };

    options.AddPolicy("FrontendDev", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowCredentials()
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .WithHeaders("Content-Type", "Authorization", "Accept");
    });
});

var app = builder.Build();

Console.WriteLine($"=== JUSTSKU API Startup ===");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
Console.WriteLine($"BUILD TIMESTAMP: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
Console.WriteLine($"CONTACT CONTROLLER: Fixed to use Infrastructure EmailService");
Console.WriteLine($"CORS Origins: {string.Join(", ", builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "localhost:5173" })}");

// Configure static file serving for React app
// In production, files are in wwwroot; in development, they're in frontend/dist
var frontendPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(frontendPath))
{
    // Fallback to development path if wwwroot doesn't exist
    frontendPath = Path.Combine(builder.Environment.ContentRootPath, "..", "..", "frontend", "dist");
}

if (Directory.Exists(frontendPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath),
        RequestPath = ""
    });
}

// Enable Swagger in all environments for testing
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "JUSTSKU API v1");
    c.RoutePrefix = "swagger";
});

// Add global exception handler middleware for structured logging
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Add global exception handler for generic error responses (security hardening)
app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        
        logger.LogError(exception, "Unhandled exception in request");
        
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        
        var isDevelopment = app.Environment.IsDevelopment();
        var errorResponse = SkuVaultSaaS.Api.Models.ErrorResponse.InternalError(
            message: "An error occurred processing your request.",
            details: isDevelopment ? exception?.Message : null,
            stackTrace: isDevelopment ? exception?.StackTrace : null
        );
        
        await context.Response.WriteAsJsonAsync(errorResponse);
    });
});

// Add security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self' https://api.stripe.com https://m.stripe.network https://m.stripe.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline';";
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    }
    await next();
});

app.UseCors("FrontendDev");

// Rate limiting middleware (prevent DOS and brute force attacks)
app.UseMiddleware<SkuVaultSaaS.Api.Middleware.RateLimitingMiddleware>(
    new SkuVaultSaaS.Api.Middleware.RateLimitOptions 
    { 
        WindowSeconds = 60,        // 1 minute window
        MaxRequests = 100          // 100 requests per minute per user/IP
    });

// Response caching disabled to reduce memory usage
// app.UseResponseCaching();

// Enable HTTPS redirection
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();

// Add demo auth middleware AFTER UseAuthentication so it can override the authenticated user
// when demo=true query param is present
app.UseMiddleware<SkuVaultSaaS.Api.Middleware.DemoAuthMiddleware>();

app.UseAuthorization();

app.MapControllers();

// Simple health check endpoint
app.MapGet("/api/health", () => 
{
    return Results.Ok(new { 
        status = "healthy",
        timestamp = DateTime.UtcNow.ToString("o"),
        service = "JUSTSKU API",
        buildTime = "2024-12-18 19:30:00 UTC"
    });
});

// Detailed health check with database connectivity for monitoring
app.MapGet("/api/health/detailed", async (ApplicationDbContext dbContext) => 
{
    try 
    {
        // Test database connectivity
        await dbContext.Database.CanConnectAsync();
        
        return Results.Ok(new { 
            status = "healthy", 
            timestamp = DateTime.UtcNow.ToString("o"),
            version = "1.0.0",
            service = "JUSTSKU API",
            environment = app.Environment.EnvironmentName,
            database = "connected"
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new {
            status = "unhealthy",
            timestamp = DateTime.UtcNow.ToString("o"),
            version = "1.0.0", 
            service = "JUSTSKU API",
            environment = app.Environment.EnvironmentName,
            database = "disconnected",
            error = ex.Message
        }, statusCode: 503);
    }
});

// Fallback to index.html for React Router (SPA)
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath)
});

app.Run();
