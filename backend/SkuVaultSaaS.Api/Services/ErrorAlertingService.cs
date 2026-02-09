using SkuVaultSaaS.Infrastructure.Services;
using System.Text;

namespace SkuVaultSaaS.Api.Services
{
    public class ErrorAlertingService : BackgroundService
    {
        private readonly ILogger<ErrorAlertingService> _logger;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private static DateTime _lastProcessedTime = DateTime.UtcNow;

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
                // Read log file
                string content = File.ReadAllText(logPath);
                string[] lines = content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

                // Find ERROR lines that occurred after last check
                var newErrors = lines
                    .Where(l => l.Contains("[ERROR]") || l.Contains("[FATAL]"))
                    .ToList();

                // Filter for errors after last processed time
                var recentErrors = new List<string>();
                foreach (var error in newErrors)
                {
                    if (TryParseErrorTime(error, out var errorTime) && errorTime > _lastProcessedTime)
                    {
                        recentErrors.Add(error);
                    }
                }

                if (recentErrors.Count > 0)
                {
                    await SendErrorAlert(recentErrors);
                    _lastProcessedTime = DateTime.UtcNow;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read error logs");
            }
        }

        private bool TryParseErrorTime(string logLine, out DateTime errorTime)
        {
            errorTime = DateTime.MinValue;
            try
            {
                // Parse format: [2026-02-04 14:30:45.123 +00:00] [ERROR]
                var match = System.Text.RegularExpressions.Regex.Match(logLine, @"\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})");
                if (match.Success && DateTime.TryParse(match.Groups[1].Value, out var parsed))
                {
                    errorTime = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
                    return true;
                }
            }
            catch { }
            return false;
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

                foreach (var error in errors.Take(10))  // Limit to last 10 errors
                {
                    sb.AppendLine(error);
                }

                sb.AppendLine("---");
                sb.AppendLine();
                sb.AppendLine($"Check logs at: {Path.GetFullPath("logs/errors.txt")}");

                // Use SendContactMessageAsync as generic email method to send error alerts
                await _emailService.SendContactMessageAsync(
                    userEmail: "error-alerting-system",
                    subject: $"⚠️ Alert: {errors.Count} Error(s) in SkuVaultSaaS",
                    message: sb.ToString());

                _logger.LogInformation("Error alert sent to {Email} for {Count} errors", adminEmail, errors.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send error alert email");
            }
        }
    }
}
