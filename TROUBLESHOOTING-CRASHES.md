# Troubleshooting App Crashes - Quick Diagnostics Guide

## Immediate Actions When App Crashes

### 1. Check the Logs (Different by Environment)

**If running locally:**
```powershell
# Check console output for exceptions
# Look for patterns like:
# [2024-02-04 10:15:30] [ERR] Unhandled exception occurred...
# System.NullReferenceException: Object reference not set to an instance of an object
```

**If running in Docker:**
```bash
docker logs <container-id> -f
```

**If running on AWS (EC2/ECS):**
- Check CloudWatch Logs (if logging is configured)
- Check `/var/log/` on EC2 instance
- Check ECS task logs in CloudWatch

### 2. Enable Debug Logging Immediately

Add to `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft": "Information"
    }
  }
}
```

### 3. Check for These Common Issues

#### Backend Crashes

**Database Connection Issues:**
```bash
# Test DB connectivity
mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p -e "SELECT 1;"

# Check connection string in environment
echo $DB_HOST
echo $DB_NAME
echo $DB_USER
```

**Missing Environment Variables:**
```bash
# Verify all required vars are set
env | grep -E "DB_|STRIPE_|JWT_|EMAIL_"

# Common missing vars:
# DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
# STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
# JWT_KEY, JWT_ISSUER, JWT_AUDIENCE
# EMAIL_PASSWORD
```

**Unhandled Exceptions in Controllers:**
- Add try-catch blocks to log specific errors
- Check for null reference exceptions
- Check for type casting issues

#### Frontend Crashes

**React Component Errors:**
- Open browser DevTools (F12)
- Check Console tab for JavaScript errors
- Look for red error messages

**CORS Issues:**
- Check Network tab in DevTools
- Look for red responses from API calls
- Error will show "Access to XMLHttpRequest blocked by CORS policy"

**API Connection Issues:**
- Verify API base URL: `import.meta.env.VITE_API_BASE_URL`
- Check if backend is running
- Check if ports are correct (frontend: 5173, backend: 5239)

### 4. Quick Diagnostic Endpoints

**Test Database:**
```bash
curl -X GET https://your-api.com/api/health/database
# Should return 200 OK if database is connected
```

**Test Stripe:**
```bash
curl -X GET https://your-api.com/api/health/stripe
# Should return 200 OK if Stripe keys are configured
```

**Test SkuVault:**
```bash
curl -X GET https://your-api.com/api/health/skuvault
# Should return 200 OK if SkuVault is reachable
```

**Force an Error (for testing logging):**
```bash
curl https://your-api.com/api/[controller]/test-error
# Should log to CloudWatch and send email alert
```

### 5. Common Stack Traces and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `System.NullReferenceException` | Null object access | Add null checks, use `?.` operator |
| `DbUpdateException` | Database constraint violation | Check foreign keys, verify data exists |
| `InvalidOperationException: A second operation started before previous operation completed` | Async issue | Properly await async methods, use `.GetAwaiter().GetResult()` with caution |
| `TimeoutException` | Database/API timeout | Increase timeout, check network connectivity |
| `UnauthorizedAccessException` | Missing IAM permissions | Add permissions to EC2/ECS role |
| `ConnectionRefusedException` | Service not running | Start database, start API, check firewall |
| `JsonSerializationException` | Invalid JSON response | Check API response format, check DTOs |

### 6. Enable More Detailed Logging in Code

**For Database Issues:**
```csharp
// In Program.cs when adding DbContext
.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
    mySqlOptions =>
    {
        mySqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null);
    })
    .LogTo(Console.WriteLine, LogLevel.Debug) // Add this for DEBUG output
```

**For API Issues:**
```csharp
// In controller
_logger.LogDebug("Request received: {@Request}", new { 
    Path = Request.Path, 
    Method = Request.Method,
    Headers = Request.Headers,
    QueryString = Request.QueryString
});
```

**For SkuVault Sync Issues:**
```csharp
// In SkuVaultSyncService
_logger.LogDebug("Syncing inventory for customer {CustomerId}, sync method: {Method}", 
    customerId, method);
```

### 7. Network Diagnostics

```bash
# Check if services are listening
netstat -tulpn | grep -E "5239|3306"

# Test connectivity to external services
curl -v https://app.skuvault.com  # SkuVault
curl -v https://api.stripe.com    # Stripe
curl -v https://smtp.zeptomail.com:587  # Email

# Check DNS resolution
nslookup app.skuvault.com
nslookup your-db-host.rds.amazonaws.com
```

### 8. Log File Locations

**Development (Local):**
- Console output only

**Docker:**
- `docker logs <container-id>`
- Volume mounted logs (check docker-compose.yml)

**AWS EC2:**
- `/var/log/syslog`
- `/var/log/auth.log`
- CloudWatch Logs (if configured)

**AWS ECS:**
- CloudWatch Logs
- `/ecs/logs/` (inside container)

### 9. Crash Dump Analysis (Windows Only)

```bash
# Generate crash dump
Get-Process dotnet | Stop-Process -PassThru -UseStop

# Analyze with WinDbg
# !analyze -v
# !printexception
```

### 10. Performance Profiling (if crashes are intermittent)

```bash
# Monitor memory usage
dotnet counters monitor --process-id <PID>

# Monitor GC
dotnet trace collect --duration 00:00:30 --process-id <PID>

# Analyze
dotnet trace convert merged_6234.nettrace --format speedscope
# View in https://www.speedscope.app
```

## What to Check When Enabling Logging

**Priority Order:**

1. ✅ **Check CloudWatch Logs** → Did the error appear?
2. ✅ **Check Email** → Did you get an alert email?
3. ✅ **Check Application Logs** → What's the full stack trace?
4. ✅ **Check Database Connection** → Can API connect to DB?
5. ✅ **Check Environment Variables** → Are all required vars set?
6. ✅ **Check API Endpoints** → Are health checks passing?
7. ✅ **Check External Services** → Is SkuVault/Stripe API working?
8. ✅ **Check Browser Console** → Any frontend errors?

## After Adding Logging

```powershell
# 1. Rebuild and redeploy
dotnet build
dotnet publish -c Release

# 2. Test error endpoint
curl https://your-api.com/api/[controller]/test-error

# 3. Wait 60 seconds for CloudWatch
# (logs are batched)

# 4. Check CloudWatch Logs
aws logs get-log-events \
  --log-group-name /justsku/errors \
  --log-stream-name <stream-name> \
  --region us-east-1

# 5. Verify email alert received
# (should arrive within 2 minutes)
```

## Next Steps

1. ✅ Implement Serilog (see SERILOG-IMPLEMENTATION.md)
2. ✅ Set up CloudWatch (see LOGGING-AND-ALERTING-SETUP.md)
3. ✅ Configure SNS email alerts
4. ✅ Test with intentional error
5. ✅ Monitor for next 24 hours
6. ✅ Document any patterns in crashes
7. ✅ Create specific alarms for each error type

---

**Still crashing?** 
1. Run setup script: `./backend/setup-logging.ps1`
2. Deploy with logging enabled
3. Reproduce the crash
4. Share CloudWatch logs + full stack trace
