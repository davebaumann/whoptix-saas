# Cost-Effective Error Logging & Alerting (File-Based + Zeptomail)

**Zero AWS costs. Uses existing email infrastructure.**

## Overview

Instead of CloudWatch ($10-20/month) + SNS, this solution:
- Logs errors to local files on EC2 (free)
- Runs scheduled job every 10 minutes to parse new errors
- Sends email alerts via existing Zeptomail service
- No CloudWatch or SNS required

## Architecture

```
Application Error
    ↓
Global Exception Middleware
    ↓
Serilog (ERROR level only - logs to file)
    ↓
Error Log File (/logs/errors.txt)
    ↓
ErrorAlertingService (runs every 10 minutes)
    ↓
Zeptomail (sends email via existing service)
    ↓
Admin Email (receives alert)
```

## Implementation

### Step 1: Update Program.cs (Serilog Configuration)

Replace the logging section with this (simpler, file-only):

```csharp
// Configure Serilog for file-based error logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Error()  // Only ERROR level and above
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentUserName()
    .Enrich.WithMachineName()
    .WriteTo.File(
        path: "logs/errors.txt",
        rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] {Message:lj}{NewLine}{Exception}",
        fileSizeLimitBytes: 10485760,  // 10MB per file
        retainedFileCountLimit: 30)    // Keep 30 days of logs
    .CreateLogger();

builder.Host.UseSerilog();
```

**Add using statements at top:**
```csharp
using Serilog;
using Serilog.Core;
```

### Step 2: Create GlobalExceptionHandlerMiddleware

Create file: `backend/SkuVaultSaaS.Api/Middleware/GlobalExceptionHandlerMiddleware.cs`

```csharp
using Serilog;
using System.Text.Json;

namespace SkuVaultSaaS.Api.Middleware
{
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

        public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception in {Method} {Path} from {RemoteIP}. User: {UserId}",
                    context.Request.Method,
                    context.Request.Path,
                    context.Connection.RemoteIpAddress,
                    context.User?.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value ?? "Anonymous");
                
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            var response = new
            {
                message = "An error occurred processing your request",
                traceId = context.TraceIdentifier
            };

            return context.Response.WriteAsJsonAsync(response);
        }
    }
}
```

### Step 3: Register Middleware in Program.cs

In `Program.cs`, after `var app = builder.Build();` add:

```csharp
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
```

Should be one of the first middleware registrations (before routing, controllers, etc).

### Step 4: Create Error Alerting Hosted Service

Create file: `backend/SkuVaultSaaS.Api/Services/ErrorAlertingService.cs`

```csharp
using SkuVaultSaaS.Api.Services;
using System.Text;

namespace SkuVaultSaaS.Api.Services
{
    public class ErrorAlertingService : BackgroundService
    {
        private readonly ILogger<ErrorAlertingService> _logger;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private static string _lastProcessedPosition = "";

        public ErrorAlertingService(ILogger<ErrorAlertingService> logger, IEmailService emailService, IConfiguration configuration)
        {
            _logger = logger;
            _emailService = emailService;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ErrorAlertingService started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckForErrorsAndAlert();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in ErrorAlertingService");
                }

                // Check every 10 minutes
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            }
        }

        private async Task CheckForErrorsAndAlert()
        {
            string logPath = "logs/errors.txt";

            if (!File.Exists(logPath))
                return;

            try
            {
                // Read new errors since last check
                string content = File.ReadAllText(logPath);
                string[] lines = content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

                // Find lines after last position (simplified - find new [ERROR] entries)
                var newErrors = lines
                    .Where(l => l.Contains("[ERROR]"))
                    .Skip(lines.Count(l => l.Contains("[ERROR]")) > 0 ? 
                        Math.Max(0, lines.Count(l => l.Contains("[ERROR]")) - 5) : 0)  // Get last 5 errors
                    .ToList();

                if (newErrors.Count > 0)
                {
                    await SendErrorAlert(newErrors);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read error logs");
            }
        }

        private async Task SendErrorAlert(List<string> errors)
        {
            try
            {
                var adminEmail = _configuration["AdminSettings:AlertEmail"] ?? _configuration["Email:AdminEmail"];
                
                if (string.IsNullOrEmpty(adminEmail))
                {
                    _logger.LogWarning("AdminSettings:AlertEmail not configured");
                    return;
                }

                var sb = new StringBuilder();
                sb.AppendLine("🚨 Critical Errors Detected in SkuVaultSaaS");
                sb.AppendLine($"Timestamp: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
                sb.AppendLine();
                sb.AppendLine("Recent Errors:");
                sb.AppendLine("---");

                foreach (var error in errors)
                {
                    sb.AppendLine(error);
                }

                sb.AppendLine("---");
                sb.AppendLine();
                sb.AppendLine("Check logs at: logs/errors.txt");

                await _emailService.SendEmailAsync(
                    to: adminEmail,
                    subject: $"⚠️ Alert: {errors.Count} Error(s) in SkuVaultSaaS",
                    htmlBody: sb.ToString().Replace("\n", "<br/>"));

                _logger.LogInformation("Error alert sent to {Email} for {Count} errors", adminEmail, errors.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send error alert email");
            }
        }
    }
}
```

### Step 5: Register Service in Program.cs

In `Program.cs` (around line 35-40 with other hosted services), add:

```csharp
builder.Services.AddHostedService<ErrorAlertingService>();
```

### Step 6: Add Admin Email Config

In `appsettings.Development.json` (and other environments):

```json
"AdminSettings": {
  "AlertEmail": "your-admin-email@example.com"
}
```

### Step 7: Install NuGet Package (If Needed)

Run in backend directory (Serilog.Sinks.File is lightweight):

```powershell
dotnet add package Serilog
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Enrichers.Environment
```

## Testing

### Test 1: Trigger an Error

Navigate to (add this temporarily to a controller):

```csharp
[HttpGet("test-error")]
public IActionResult TestError()
{
    throw new InvalidOperationException("Test error for alerting system");
}
```

Call: `GET /api/[controller]/test-error`

### Test 2: Check Log File

After a few seconds, check: `backend/logs/errors.txt`

You should see the error logged with timestamp.

### Test 3: Wait for Email

Within 10 minutes, you should receive an email alert at your configured admin email with the error details.

## Configuration

**Log Retention:**
- `retainedFileCountLimit: 30` = keeps 30 days of daily logs
- `fileSizeLimitBytes: 10485760` = 10MB per file before rolling

Adjust these in Program.cs if needed.

**Alert Frequency:**
- Currently checks every 10 minutes
- Change `TimeSpan.FromMinutes(10)` in ErrorAlertingService if needed

**Email:**
- Uses existing `IEmailService` (already configured with Zeptomail)
- Admin email configured in `appsettings.json`

## Advantages

✅ **Zero cost** - no CloudWatch or SNS  
✅ **Uses existing infrastructure** - leverages Zeptomail email service  
✅ **Simple** - file-based logging, no AWS setup needed  
✅ **Reliable** - only logs ERROR level (minimal disk space)  
✅ **Email alerts** - within 10 minutes of error occurring  
✅ **Searchable** - local error log file for debugging  

## Disadvantages

❌ Logs only stored locally on EC2 (not in cloud)  
❌ No real-time dashboards  
❌ Manual log cleanup if needed  

## Cleanup

If you want to remove old log files manually:

```powershell
Get-ChildItem -Path "logs/" -Filter "errors-*.txt" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

The retainedFileCountLimit handles this automatically.

## Troubleshooting

### Errors not logged
- Check `logs/` directory exists (create if needed)
- Verify app has write permissions to `logs/`
- Check Serilog MinimumLevel is set to `Error`

### Not receiving emails
- Verify `AdminSettings:AlertEmail` is configured
- Check IEmailService is working (test with existing low-stock notification)
- Review ErrorAlertingService logs

### Too many emails
- Increase interval from 10 to 30 minutes in ErrorAlertingService
- Or implement deduplication logic to avoid duplicate alerts for same error

## Next Steps

1. Copy Program.cs Serilog configuration (Step 1)
2. Create GlobalExceptionHandlerMiddleware (Step 2)
3. Register middleware in Program.cs (Step 3)
4. Create ErrorAlertingService (Step 4)
5. Register service in Program.cs (Step 5)
6. Update appsettings with admin email (Step 6)
7. Run `dotnet add package` commands (Step 7)
8. Test with error endpoint
9. Verify email arrives within 10 minutes

**Total setup time: 15-20 minutes. Zero AWS costs.**
