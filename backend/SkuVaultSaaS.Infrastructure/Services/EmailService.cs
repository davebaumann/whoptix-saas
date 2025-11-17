using System.Net.Mail;
using System.Net;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace SkuVaultSaaS.Infrastructure.Services
{
    public interface IEmailService
    {
        Task SendLowStockNotificationAsync(string toEmail, string customerName, List<LowStockEmailItem> lowStockItems);
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
        }

        public async Task SendLowStockNotificationAsync(string toEmail, string customerName, List<LowStockEmailItem> lowStockItems)
        {
            try
            {
                using var client = new SmtpClient(_emailSettings.SmtpHost, _emailSettings.SmtpPort)
                {
                    EnableSsl = _emailSettings.UseSsl,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(_emailSettings.Username, _emailSettings.Password)
                };

                var subject = $"Low Stock Alert for {customerName}";
                var body = GenerateLowStockEmailBody(customerName, lowStockItems);

                var message = new MailMessage
                {
                    From = new MailAddress(_emailSettings.FromEmail, _emailSettings.FromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                
                message.To.Add(toEmail);

                await client.SendMailAsync(message);
                
                _logger.LogInformation("Low stock notification email sent to {Email} for customer {CustomerName}", 
                    toEmail, customerName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send low stock notification email to {Email} for customer {CustomerName}", 
                    toEmail, customerName);
                throw;
            }
        }

        private string GenerateLowStockEmailBody(string customerName, List<LowStockEmailItem> lowStockItems)
        {
            var itemsHtml = string.Join("", lowStockItems.Select(item => $@"
                <tr>
                    <td style='padding: 8px; border-bottom: 1px solid #ddd;'>{item.ProductSku}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #ddd;'>{item.ProductName}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #ddd;'>{item.LocationName}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: {(item.CurrentQuantity == 0 ? "red" : "orange")};'>{item.CurrentQuantity}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: center;'>{item.ThresholdQuantity}</td>
                </tr>"));

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Low Stock Alert</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #e74c3c; padding-bottom: 20px;'>
            <h1 style='color: #e74c3c; margin: 0;'>⚠️ Low Stock Alert</h1>
            <p style='color: #666; margin: 5px 0 0 0;'>Inventory notification for {customerName}</p>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 10px 0; color: #333;'>Dear {customerName},</p>
            <p style='margin: 0 0 20px 0; color: #555;'>
                The following products have reached or fallen below their low stock thresholds and require attention:
            </p>
        </div>

        <table style='width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: white;'>
            <thead>
                <tr style='background-color: #f8f9fa;'>
                    <th style='padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left; font-weight: bold; color: #333;'>SKU</th>
                    <th style='padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left; font-weight: bold; color: #333;'>Product</th>
                    <th style='padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left; font-weight: bold; color: #333;'>Location</th>
                    <th style='padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center; font-weight: bold; color: #333;'>Current Qty</th>
                    <th style='padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center; font-weight: bold; color: #333;'>Threshold</th>
                </tr>
            </thead>
            <tbody>
                {itemsHtml}
            </tbody>
        </table>

        <div style='background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px;'>
                <strong>Action Required:</strong> Please review these items and consider restocking to avoid potential stockouts.
            </p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                This is an automated notification from your SkuVault SaaS inventory management system.
            </p>
            <p style='color: #888; font-size: 12px; margin: 5px 0 0 0;'>
                Generated on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC
            </p>
        </div>
    </div>
</body>
</html>";
        }
    }

    // Configuration class for email settings
    public class EmailSettings
    {
        public string SmtpHost { get; set; } = "";
        public int SmtpPort { get; set; } = 587;
        public bool UseSsl { get; set; } = true;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string FromEmail { get; set; } = "";
        public string FromName { get; set; } = "SkuVault SaaS";
    }

    // Email item DTO
    public class LowStockEmailItem
    {
        public string ProductSku { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string LocationName { get; set; } = "";
        public int CurrentQuantity { get; set; }
        public int ThresholdQuantity { get; set; }
    }
}