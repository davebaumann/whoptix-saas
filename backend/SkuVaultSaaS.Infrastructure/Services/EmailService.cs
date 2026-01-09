using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SkuVaultSaaS.Infrastructure.Services
{
    public interface IEmailService
    {
        Task SendLowStockNotificationAsync(string toEmail, string customerName, List<LowStockEmailItem> lowStockItems);
        Task SendSuggestionEmailAsync(string userEmail, string message);
        Task SendContactInquiryAsync(string userEmail, string subject, string message);
        Task SendTechSupportRequestAsync(string userEmail, string priority, string category, string subject, string message);
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

        private async Task SendEmailAsync(MimeMessage mimeMessage)
        {
            using var client = new SmtpClient();
            
            // ZeptoMail specific configuration
            client.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;
            await client.ConnectAsync(_emailSettings.SmtpHost, _emailSettings.SmtpPort, false);
            await client.AuthenticateAsync(_emailSettings.Username, _emailSettings.Password);
            await client.SendAsync(mimeMessage);
            await client.DisconnectAsync(true);
        }

        public async Task SendContactInquiryAsync(string userEmail, string subject, string message)
        {
            try
            {
                var mimeMessage = new MimeMessage();
                var fromEmail = _emailSettings.GetEmailAddress("Support");
                mimeMessage.From.Add(new MailboxAddress(_emailSettings.FromName, fromEmail));
                mimeMessage.To.Add(new MailboxAddress("JUSTSKU Support", _emailSettings.ReplyToEmail));
                mimeMessage.Subject = $"Contact Inquiry from {userEmail}";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Contact Inquiry</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2ecc71; padding-bottom: 20px;'>
            <h1 style='color: #2ecc71; margin: 0;'>📧 Contact Inquiry</h1>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>From:</strong> {userEmail}</p>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>Subject:</strong> {subject}</p>
            <p style='margin: 0 0 20px 0; color: #333;'><strong>Received:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
        </div>

        <div style='background-color: #ecf0f1; border: 1px solid #bdc3c7; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word;'>{message}</p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                This is an automated notification from your JUSTSKU contact form.
            </p>
        </div>
    </div>
</body>
</html>"
                };
                mimeMessage.Body = bodyBuilder.ToMessageBody();

                await SendEmailAsync(mimeMessage);
                
                _logger.LogInformation("Contact inquiry email sent from {Email}", userEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send contact inquiry email from {Email}", userEmail);
                throw;
            }
        }

        public async Task SendTechSupportRequestAsync(string userEmail, string priority, string category, string subject, string message)
        {
            try
            {
                var mimeMessage = new MimeMessage();
                var fromEmail = _emailSettings.GetEmailAddress("Support");
                mimeMessage.From.Add(new MailboxAddress(_emailSettings.FromName, fromEmail));
                mimeMessage.To.Add(new MailboxAddress("JUSTSKU Tech Support", _emailSettings.ReplyToEmail));
                mimeMessage.Subject = $"[{priority.ToUpper()}] Tech Support: {category} - {subject}";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Tech Support Request</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #e74c3c; padding-bottom: 20px;'>
            <h1 style='color: #e74c3c; margin: 0;'>🔧 Tech Support Request</h1>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>From:</strong> {userEmail}</p>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>Priority:</strong> <span style='color: {(priority.ToLower() == "critical" ? "red" : priority.ToLower() == "high" ? "orange" : "green")};'>{priority.ToUpper()}</span></p>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>Category:</strong> {category}</p>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>Subject:</strong> {subject}</p>
            <p style='margin: 0 0 20px 0; color: #333;'><strong>Received:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
        </div>

        <div style='background-color: #ecf0f1; border: 1px solid #bdc3c7; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word;'>{message}</p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                This is an automated notification from your JUSTSKU support system.
            </p>
        </div>
    </div>
</body>
</html>"
                };
                mimeMessage.Body = bodyBuilder.ToMessageBody();

                await SendEmailAsync(mimeMessage);
                
                _logger.LogInformation("Tech support request email sent from {Email}", userEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send tech support request email from {Email}", userEmail);
                throw;
            }
        }

        public async Task SendSuggestionEmailAsync(string userEmail, string message)
        {
            try
            {
                var mimeMessage = new MimeMessage();
                var fromEmail = _emailSettings.GetEmailAddress("Support");
                mimeMessage.From.Add(new MailboxAddress(_emailSettings.FromName, fromEmail));
                mimeMessage.To.Add(new MailboxAddress("JUSTSKU Support", _emailSettings.ReplyToEmail));
                mimeMessage.Subject = $"New Suggestion from {userEmail}";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>New Suggestion</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 20px;'>
            <h1 style='color: #3498db; margin: 0;'>💡 New Suggestion Received</h1>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 10px 0; color: #333;'><strong>From:</strong> {userEmail}</p>
            <p style='margin: 0 0 20px 0; color: #333;'><strong>Received:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
        </div>

        <div style='background-color: #ecf0f1; border: 1px solid #bdc3c7; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word;'>{message}</p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                This is an automated notification from your JUSTSKU feedback system.
            </p>
        </div>
    </div>
</body>
</html>"
                };
                mimeMessage.Body = bodyBuilder.ToMessageBody();

                await SendEmailAsync(mimeMessage);
                
                _logger.LogInformation("Suggestion email sent from {Email}", userEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send suggestion email from {Email}", userEmail);
                throw;
            }
        }

        public async Task SendLowStockNotificationAsync(string toEmail, string customerName, List<LowStockEmailItem> lowStockItems)
        {
            _logger.LogDebug("Starting to send low stock notification to {Email} for {CustomerName}", toEmail, customerName);
            
            try
            {
                var message = new MimeMessage();
                var fromEmail = _emailSettings.GetEmailAddress("LowStockNotification");
                
                message.From.Add(new MailboxAddress(_emailSettings.FromName, fromEmail));
                
                if (_emailSettings.ShouldAddReplyTo(fromEmail))
                {
                    message.ReplyTo.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.ReplyToEmail));
                }
                
                message.To.Add(new MailboxAddress(customerName, toEmail));
                message.Subject = $"Low Stock Alert for {customerName}";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = GenerateLowStockEmailBody(customerName, lowStockItems)
                };
                message.Body = bodyBuilder.ToMessageBody();

                await SendEmailAsync(message);
                
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
                This is an automated notification from your JUSTSKU inventory management system.
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

    public class EmailSettings
    {
        public string SmtpHost { get; set; } = "";
        public int SmtpPort { get; set; } = 587;
        public bool UseSsl { get; set; } = true;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string FromName { get; set; } = "JUSTSKU";
        public string ReplyToEmail { get; set; } = "info@justsku.com";
        public string FromEmail { get; set; } = "";
        
        public Dictionary<string, string> Emails { get; set; } = new()
        {
            { "Verification", "noreply@justsku.com" },
            { "LowStockNotification", "notifications@justsku.com" },
            { "Support", "support@justsku.com" }
        };
        
        public string GetEmailAddress(string emailType)
        {
            if (Emails != null && Emails.TryGetValue(emailType, out var email))
            {
                return email;
            }
            return FromEmail;
        }
        
        public bool ShouldAddReplyTo(string fromEmail)
        {
            return !fromEmail.Contains("noreply");
        }
    }

    public class LowStockEmailItem
    {
        public string ProductSku { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string LocationName { get; set; } = "";
        public int CurrentQuantity { get; set; }
        public int ThresholdQuantity { get; set; }
    }
}