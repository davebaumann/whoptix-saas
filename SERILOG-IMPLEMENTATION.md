// ============================================================================
// SERILOG CONFIGURATION SNIPPET FOR Program.cs
// ============================================================================
// Add this at the TOP of Program.cs (before WebApplicationBuilder is created)
// Replace the existing logging configuration if present

using Serilog;
using Serilog.Enrichers;
using Amazon.CloudWatchLogs;
using Amazon.CloudWatchLogs.Model;

// Configure Serilog for structured logging to Console and CloudWatch
var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
var logGroupName = "/justsku/errors";
var awsRegion = Environment.GetEnvironmentVariable("AWS_REGION") ?? "us-east-1";

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentUserName()
    .Enrich.WithMachineName()
    .Enrich.WithProcessId()
    .Enrich.WithThreadId()
    .Enrich.WithProperty("Environment", environment)
    .Enrich.WithProperty("Application", "SkuVaultSaaS.Api")
    // Console sink for development and debugging
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
    // CloudWatch sink for ERROR and above
    .WriteTo.Logger(lc => lc
        .MinimumLevel.Error()
        .WriteTo.AwsCloudWatch(
            logGroup: logGroupName,
            logStreamNameProvider: new DefaultLogStreamNameProvider(),
            cloudWatchClient: new AmazonCloudWatchLogsClient(
                Amazon.RegionEndpoint.GetBySystemName(awsRegion)),
            batchSizeLimit: 100,
            batchUploadIntervalMs: 5000))
    .CreateLogger();

try
{
    Log.Information("Starting SkuVaultSaaS API in {Environment} environment", environment);
    
    var builder = WebApplication.CreateBuilder(args);
    
    // Add Serilog to the dependency injection container
    builder.Host.UseSerilog();
    
    // ... rest of your Program.cs configuration ...
    
    var app = builder.Build();
    
    // Add global exception handling middleware BEFORE other middleware
    app.UseMiddleware<SkuVaultSaaS.Api.Middleware.GlobalExceptionHandlerMiddleware>();
    
    // ... rest of your middleware setup ...
    
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// ============================================================================
// NEW CLASS: DefaultLogStreamNameProvider
// ============================================================================
// Add this new class to help organize CloudWatch logs by instance/pod
// File: backend/SkuVaultSaaS.Api/Services/DefaultLogStreamNameProvider.cs

namespace SkuVaultSaaS.Api.Services
{
    using Serilog.Sinks.AwsCloudWatch;

    public class DefaultLogStreamNameProvider : ILogStreamNameProvider
    {
        private readonly string _logStreamName;

        public DefaultLogStreamNameProvider()
        {
            // Create a unique log stream name per instance/pod
            var instanceId = Environment.GetEnvironmentVariable("HOSTNAME") ?? 
                           Environment.MachineName;
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd");
            _logStreamName = $"{instanceId}/{timestamp}";
        }

        public string GetLogStreamName()
        {
            return _logStreamName;
        }
    }
}

// ============================================================================
// TESTING ENDPOINT
// ============================================================================
// Add this test method to any controller to verify logging works

[HttpGet("test-error")]
[AllowAnonymous]
public IActionResult TestError()
{
    _logger.LogInformation("Test error endpoint called");
    _logger.LogError("This is a test error message");
    
    try
    {
        throw new InvalidOperationException("Test exception - should be caught by middleware and logged to CloudWatch");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Test exception caught and logged");
        throw; // Let middleware handle it
    }
}

// ============================================================================
// APPSETTINGS CONFIGURATION (Optional - if you want file-based config)
// ============================================================================
// Add to appsettings.Production.json if you want Serilog config in settings:

"Serilog": {
  "MinimumLevel": "Information",
  "MinimumLevel.Override": {
    "Microsoft.AspNetCore": "Warning",
    "Microsoft.EntityFrameworkCore": "Warning"
  },
  "WriteTo": [
    {
      "Name": "Console",
      "Args": {
        "outputTemplate": "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] {Message:lj}{NewLine}{Exception}"
      }
    },
    {
      "Name": "AwsCloudWatch",
      "Args": {
        "logGroup": "/justsku/errors",
        "minLevel": "Error",
        "cloudWatchClient": null,
        "batchSizeLimit": 100,
        "batchUploadIntervalMs": 5000
      }
    }
  ],
  "Enrich": [
    "FromLogContext",
    "WithEnvironmentUserName",
    "WithMachineName",
    "WithProcessId",
    "WithThreadId",
    "WithProperty(Environment,Production)",
    "WithProperty(Application,SkuVaultSaaS.Api)"
  ]
}

// ============================================================================
// EXAMPLE: Logging with Context in a Service
// ============================================================================

public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public OrderService(ILogger<OrderService> logger)
    {
        _logger = logger;
    }

    public async Task ProcessOrderAsync(string orderId)
    {
        using (LogContext.PushProperty("OrderId", orderId))
        {
            try
            {
                _logger.LogInformation("Processing order");
                
                // Your order processing logic here
                
                _logger.LogInformation("Order processed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process order");
                throw;
            }
        }
    }
}

// When this logs, every log entry will include OrderId in the structured data
// Example CloudWatch log:
// [2024-02-04 10:15:30.123 UTC] [ERR] [OrderService] Failed to process order
// Properties: { OrderId: "ORD-12345", RequestId: "xyz...", UserId: "user@example.com" }
