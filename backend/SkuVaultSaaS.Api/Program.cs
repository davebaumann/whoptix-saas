using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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

var builder = WebApplication.CreateBuilder(args);

// Register a pluggable secret provider. The default implementation reads from IConfiguration
// which includes environment variables and any other configuration providers registered below.
builder.Services.AddSingleton<SkuVaultSaaS.Infrastructure.Secrets.ISecretProvider, SkuVaultSaaS.Infrastructure.Secrets.DefaultSecretProvider>();

// SkuVault API config and client
builder.Services.Configure<SkuVaultApiOptions>(builder.Configuration.GetSection("SkuVaultApi"));
builder.Services.AddHttpClient<ISkuVaultApiClient, SkuVaultApiClient>();

// SkuVault Sync Service
builder.Services.AddScoped<SkuVaultSaaS.Infrastructure.Services.ISkuVaultSyncService, SkuVaultSaaS.Infrastructure.Services.SkuVaultSyncService>();

// Email Service
builder.Services.AddScoped<IEmailService, EmailService>();

// User Context Service for tenant isolation
builder.Services.AddScoped<UserContextService>();

// Report Access Service for membership-based report authorization
builder.Services.AddScoped<SkuVaultSaaS.Core.Services.IReportAccessService, SkuVaultSaaS.Core.Services.ReportAccessService>();

// Configure sync settings from appsettings
builder.Services.Configure<SkuVaultSaaS.Infrastructure.Configuration.SyncSettings>(
    builder.Configuration.GetSection("SyncSettings"));

// Configure Email and Notification Settings
builder.Services.Configure<SkuVaultSaaS.Infrastructure.Services.EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));
builder.Services.Configure<SkuVaultSaaS.Infrastructure.HostedServices.LowStockNotificationSettings>(
    builder.Configuration.GetSection("LowStockNotificationSettings"));

// Register Email Service
builder.Services.AddScoped<SkuVaultSaaS.Infrastructure.Services.IEmailService, SkuVaultSaaS.Infrastructure.Services.EmailService>();

// Enable automatic sync with configurable intervals
builder.Services.AddHostedService<SkuVaultSaaS.Infrastructure.HostedServices.SkuVaultSyncHostedService>();

// Enable low stock notification service
builder.Services.AddHostedService<SkuVaultSaaS.Infrastructure.HostedServices.LowStockNotificationHostedService>();

// Note: SkuVaultSyncJob is disabled for local development against the managed remote DB
// because the hosted DB schema on the provider doesn't match migrations and the sync
// job tries to read columns that may not exist. Re-enable when the schema is compatible.
// builder.Services.AddHostedService<SkuVaultSyncJob>();

// MySQL connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Add Identity (include Roles so RoleManager/RoleStore are available)
builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = false)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

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
                    context.Token = context.Request.Cookies["AuthToken"];
                }
                return Task.CompletedTask;
            }
        };
    });
}

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

// CORS for local frontend dev
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173", // Vite default
            "http://127.0.0.1:5173"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Configure port for Heroku deployment
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Urls.Add($"http://0.0.0.0:{port}");

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
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "SkuVault SaaS API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("FrontendDev");

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Simple health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { 
    status = "healthy", 
    timestamp = DateTime.UtcNow,
    version = "1.0.0",
    service = "Whoptix API"
}));

app.MapControllers();

// Fallback to index.html for React Router (SPA)
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath)
});

app.Run();
