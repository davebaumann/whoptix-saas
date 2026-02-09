# Logging and Alerting Setup for SkuVaultSaaS

## Overview
This guide sets up comprehensive error logging, monitoring, and email alerting for critical failures in your application. The solution uses:
- **Serilog**: Structured logging framework
- **AWS CloudWatch**: Log aggregation and storage
- **AWS SNS**: Email notifications for critical errors
- **Custom Exception Handler**: Global error catching middleware

## Architecture

```
Application Error
    ↓
Global Exception Middleware (catches all unhandled exceptions)
    ↓
Serilog + Enrichers (adds context like user, request ID, environment)
    ↓
CloudWatch Sink (writes to AWS CloudWatch Logs)
    ↓
CloudWatch Alarms (triggers on ERROR/CRITICAL logs)
    ↓
SNS Topic (sends email notifications)
    ↓
Admin Email Box (receives alert emails)
```

## Quick Setup (5-10 minutes)

### Step 1: Install NuGet Packages

Run in the backend project directory:

```bash
dotnet add package Serilog
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.AwsCloudWatch
dotnet add package Serilog.Enrichers.Environment
dotnet add package Serilog.Enrichers.Process
dotnet add package Serilog.Enrichers.Thread
```

### Step 2: Update Program.cs

Replace the logging setup section in `Program.cs` (around line 20) with:

```csharp
// Configure Serilog for structured logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentUserName()
    .Enrich.WithMachineName()
    .Enrich.WithProcessId()
    .Enrich.WithThreadId()
    .WriteTo.Console(outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.Logger(lc => lc
        .MinimumLevel.Error()
        .WriteTo.AwsCloudWatch(
            logGroup: "/justsku/errors",
            logStreamNameProvider: new DefaultLogStreamNameProvider(),
            cloudWatchClient: new AmazonCloudWatchLogsClient(RegionEndpoint.USEast1)))
    .CreateLogger();

builder.Host.UseSerilog();
```

### Step 3: Add Global Exception Handler Middleware

Add a new middleware file: `backend/SkuVaultSaaS.Api/Middleware/GlobalExceptionHandlerMiddleware.cs`

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
                _logger.LogError(ex, "Unhandled exception in request {Path}", context.Request.Path);
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
                requestId = context.TraceIdentifier,
                timestamp = DateTime.UtcNow
            };

            return context.Response.WriteAsJsonAsync(response);
        }
    }
}
```

Then register it in Program.cs (after `var app = builder.Build();`):

```csharp
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
```

### Step 4: Configure AWS CloudWatch Alarms

In AWS Console:

1. Go to **CloudWatch** → **Logs** → **Log Groups**
2. Create log group: `/justsku/errors`
3. Create a **Metric Filter** (New):
   - Filter Pattern: `[timestamp, level = ERROR || level = CRITICAL, ...]`
   - Metric Name: `SkuVaultErrors`
   - Metric Namespace: `SkuVault`
   - Default Value: 1

4. Create an **Alarm** on this metric:
   - Threshold: ≥ 1 error in 1 minute
   - Action: Send to SNS topic

### Step 5: Set Up SNS Topic for Email Alerts

```bash
# Create SNS topic
aws sns create-topic --name skuvault-critical-errors

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:skuvault-critical-errors \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription (check your email and click the link)

# Link SNS topic to CloudWatch Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name SkuVaultCriticalErrorAlert \
  --alarm-description "Alert on critical errors in SkuVault" \
  --metric-name SkuVaultErrors \
  --namespace SkuVault \
  --statistic Sum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:skuvault-critical-errors
```

### Step 6: Add IAM Permissions (if needed)

Add these permissions to your EC2/ECS task role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/justsku/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    }
  ]
}
```

## Frontend Error Logging (Optional but Recommended)

For React frontend crashes, add Sentry:

```bash
npm install @sentry/react @sentry/tracing
```

In `frontend/src/main.tsx`:

```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID",
  environment: import.meta.env.MODE,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const App = Sentry.withProfiler(function App() {
  // your app
});
```

## Testing

### Test Backend Logging

```csharp
// In any controller
[HttpGet("test-error")]
public IActionResult TestError()
{
    _logger.LogError("This is a test error message");
    throw new Exception("Test exception - should be caught by middleware and logged to CloudWatch");
}
```

Call: `curl https://your-api.com/api/test-error`

Check CloudWatch Logs within 60 seconds - you should see the error and receive an email alert.

### Test Frontend Logging

```typescript
<button onClick={() => {
  Sentry.captureException(new Error("Test frontend error"));
}}>
  Test Error
</button>
```

## Viewing Logs

### CloudWatch Console
- Go to **CloudWatch** → **Log Groups** → `/justsku/errors`
- View real-time logs with search and filtering

### CloudWatch Insights (Advanced Queries)

```sql
fields @timestamp, @message, @logStream, level
| filter level = "ERROR"
| stats count() as ErrorCount by @logStream
```

## Cost Considerations

- **CloudWatch Logs**: $0.50 per GB ingested
- **Estimated for low-traffic app**: $10-20/month
- **SNS Email**: Free for first 1,000 notifications/month

## Troubleshooting

### Logs not appearing in CloudWatch
1. Check IAM permissions (CloudWatch logs access)
2. Check log group name matches configuration
3. Check AWS region is correct
4. Verify instance has internet connectivity

### Not receiving email alerts
1. Confirm SNS subscription (check email for confirmation link)
2. Check alarm state in CloudWatch (should be in ALARM state)
3. Check spam folder
4. Verify SNS topic ARN in alarm configuration

### Performance impact
- Serilog is asynchronous and has minimal overhead
- CloudWatch writes are batched
- Expected <5ms latency per request

## Next Steps

1. Deploy updated code with Serilog
2. Test error logging (see Testing section)
3. Wait for SNS email confirmation
4. Create additional alarms for specific errors
5. Set up dashboards in CloudWatch for visualization
6. Archive old logs to S3 for compliance (optional)

## Useful Resources

- [Serilog Documentation](https://github.com/serilog/serilog/wiki)
- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
- [AWS SNS Email Notifications](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html)
- [CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)

---

**Questions?** Check the troubleshooting section or review AWS documentation.
