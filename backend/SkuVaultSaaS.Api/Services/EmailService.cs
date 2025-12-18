using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SkuVaultSaaS.Api.Services
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string email, string resetToken, string resetUrl);
        Task SendWelcomeEmailAsync(string email, string customerName, string temporaryPassword);
        Task SendEmailVerificationAsync(string email, string confirmationLink);
    }

    public class EmailService : IEmailService
    {
        private readonly ILogger<EmailService> _logger;
        private readonly IConfiguration _configuration;

        public EmailService(ILogger<EmailService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        public async Task SendPasswordResetEmailAsync(string email, string resetToken, string resetUrl)
        {
            _logger.LogInformation("Password reset requested for: {Email}", email);
            var fullResetUrl = $"{resetUrl}?token={resetToken}&email={email}";
            _logger.LogInformation("Reset URL: {ResetUrl}", fullResetUrl);

            try
            {
                var emailSettings = _configuration.GetSection("EmailSettings");
                var smtpHost = emailSettings["SmtpHost"];
                var smtpPort = int.Parse(emailSettings["SmtpPort"] ?? "587");
                var username = emailSettings["Username"];
                var password = emailSettings["Password"];
                var fromEmail = emailSettings["FromEmail"];
                var fromName = emailSettings["FromName"];
                var useSsl = bool.Parse(emailSettings["UseSsl"] ?? "true");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(fromName, fromEmail));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "Reset your JUSTSKU password";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = GeneratePasswordResetEmailBody(fullResetUrl)
                };
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                
                var secureSocketOptions = smtpPort switch
                {
                    465 => SecureSocketOptions.SslOnConnect,
                    587 => SecureSocketOptions.StartTls,
                    25 => SecureSocketOptions.Auto,
                    _ => SecureSocketOptions.Auto
                };

                await client.ConnectAsync(smtpHost, smtpPort, secureSocketOptions);
                await client.AuthenticateAsync(username, password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                
                _logger.LogInformation("Password reset email sent successfully to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
                throw;
            }
        }

        public async Task SendWelcomeEmailAsync(string email, string customerName, string temporaryPassword)
        {
            _logger.LogInformation("Welcome email for: {Email}", email);
            _logger.LogInformation("Customer: {CustomerName}", customerName);

            try
            {
                var emailSettings = _configuration.GetSection("EmailSettings");
                var smtpHost = emailSettings["SmtpHost"];
                var smtpPort = int.Parse(emailSettings["SmtpPort"] ?? "587");
                var username = emailSettings["Username"];
                var password = emailSettings["Password"];
                var fromEmail = emailSettings["FromEmail"];
                var fromName = emailSettings["FromName"];
                var useSsl = bool.Parse(emailSettings["UseSsl"] ?? "true");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(fromName, fromEmail));
                message.To.Add(new MailboxAddress(customerName, email));
                message.Subject = "Welcome to JUSTSKU!";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = GenerateWelcomeEmailBody(customerName, temporaryPassword)
                };
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                
                var secureSocketOptions = smtpPort switch
                {
                    465 => SecureSocketOptions.SslOnConnect,
                    587 => SecureSocketOptions.StartTls,
                    25 => SecureSocketOptions.Auto,
                    _ => SecureSocketOptions.Auto
                };

                await client.ConnectAsync(smtpHost, smtpPort, secureSocketOptions);
                await client.AuthenticateAsync(username, password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                
                _logger.LogInformation("Welcome email sent successfully to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send welcome email to {Email}", email);
                throw;
            }
        }

        public async Task SendEmailVerificationAsync(string email, string confirmationLink)
        {
            _logger.LogInformation("Email verification requested for: {Email}", email);
            _logger.LogInformation("Verification link: {ConfirmationLink}", confirmationLink);

            try
            {
                var emailSettings = _configuration.GetSection("EmailSettings");
                var smtpHost = emailSettings["SmtpHost"];
                var smtpPort = int.Parse(emailSettings["SmtpPort"] ?? "465");
                var username = emailSettings["Username"];
                var password = emailSettings["Password"];
                var fromEmail = emailSettings["FromEmail"];
                var fromName = emailSettings["FromName"];
                var useSsl = bool.Parse(emailSettings["UseSsl"] ?? "true");

                // Replace environment variable placeholder
                if (password?.Contains("${EMAIL_PASSWORD}") == true)
                {
                    var envPassword = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");
                    password = password.Replace("${EMAIL_PASSWORD}", envPassword);
                    _logger.LogInformation("Environment variable EMAIL_PASSWORD found: {Found}", !string.IsNullOrEmpty(envPassword));
                }



                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(fromName, fromEmail));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "Verify your JUSTSKU account";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = GenerateVerificationEmailBody(confirmationLink)
                };
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                
                var secureSocketOptions = smtpPort switch
                {
                    465 => SecureSocketOptions.SslOnConnect,
                    587 => SecureSocketOptions.StartTls,
                    25 => SecureSocketOptions.Auto,
                    _ => SecureSocketOptions.Auto
                };

                _logger.LogInformation("Connecting to SMTP server {Host}:{Port}", smtpHost, smtpPort);
                await client.ConnectAsync(smtpHost, smtpPort, secureSocketOptions);
                
                _logger.LogInformation("Authenticating with username {Username}", username);
                await client.AuthenticateAsync(username, password);
                
                _logger.LogInformation("Sending email to {Email}", email);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                
                _logger.LogInformation("Verification email sent successfully to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send verification email to {Email}", email);
                throw;
            }
        }

        private string GenerateVerificationEmailBody(string confirmationLink)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Verify your JUSTSKU account</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3B82F6; padding-bottom: 20px;'>
            <h1 style='color: #3B82F6; margin: 0;'>Welcome to JUSTSKU!</h1>
            <p style='color: #666; margin: 5px 0 0 0;'>Please verify your email address</p>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 20px 0; color: #555;'>
                Thank you for signing up for JUSTSKU! To complete your registration, please verify your email address by clicking the button below:
            </p>
        </div>

        <div style='text-align: center; margin: 30px 0;'>
            <a href='{confirmationLink}' style='display: inline-block; background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Verify Email Address</a>
        </div>

        <div style='background-color: #f8f9fa; border: 1px solid #dee2e6; color: #495057; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px;'>
                If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href='{confirmationLink}' style='color: #3B82F6; word-break: break-all;'>{confirmationLink}</a>
            </p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                This verification link will expire in 24 hours for security reasons.
            </p>
            <p style='color: #888; font-size: 12px; margin: 5px 0 0 0;'>
                If you didn't create a JUSTSKU account, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>";
        }

        private string GeneratePasswordResetEmailBody(string resetUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Reset your JUSTSKU password</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3B82F6; padding-bottom: 20px;'>
            <h1 style='color: #3B82F6; margin: 0;'>Reset Your Password</h1>
            <p style='color: #666; margin: 5px 0 0 0;'>JUSTSKU password reset request</p>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 20px 0; color: #555;'>
                We received a request to reset your JUSTSKU account password. Click the button below to create a new password:
            </p>
        </div>

        <div style='text-align: center; margin: 30px 0;'>
            <a href='{resetUrl}' style='display: inline-block; background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>
        </div>

        <div style='background-color: #f8f9fa; border: 1px solid #dee2e6; color: #495057; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px;'>
                If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href='{resetUrl}' style='color: #3B82F6; word-break: break-all;'>{resetUrl}</a>
            </p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                This password reset link will expire in 1 hour for security reasons.
            </p>
            <p style='color: #888; font-size: 12px; margin: 5px 0 0 0;'>
                If you didn't request a password reset, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>";
        }

        private string GenerateWelcomeEmailBody(string customerName, string temporaryPassword)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Welcome to JUSTSKU!</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3B82F6; padding-bottom: 20px;'>
            <h1 style='color: #3B82F6; margin: 0;'>Welcome to JUSTSKU!</h1>
            <p style='color: #666; margin: 5px 0 0 0;'>Your account has been created</p>
        </div>
        
        <div style='margin-bottom: 20px;'>
            <p style='margin: 0 0 10px 0; color: #333;'>Dear {customerName},</p>
            <p style='margin: 0 0 20px 0; color: #555;'>
                Welcome to JUSTSKU! Your account has been successfully created. Here are your login credentials:
            </p>
        </div>

        <div style='background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0 0 10px 0; font-weight: bold; color: #333;'>Temporary Password:</p>
            <p style='margin: 0; font-family: monospace; background-color: #e9ecef; padding: 10px; border-radius: 3px; font-size: 16px;'>{temporaryPassword}</p>
        </div>

        <div style='background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px;'>
                <strong>Important:</strong> Please change your password after your first login for security purposes.
            </p>
        </div>

        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            <p style='color: #888; font-size: 12px; margin: 0;'>
                Thank you for choosing JUSTSKU for your inventory management needs.
            </p>
        </div>
    </div>
</body>
</html>";
        }
    }
}