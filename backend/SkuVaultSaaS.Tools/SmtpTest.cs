using System;
using System.Net;
using System.Net.Mail;

namespace SkuVaultSaaS.Tools
{
    public static class SmtpTest
    {
        public static void Main(string[] args)
        {
            var host = "mail.davidbaumann.pro";
            var port = 465;
            var username = "app@davidbaumann.pro";
            var password = "T3$t Setup";
            var useSsl = true;

            try
            {
                using (var client = new SmtpClient(host, port))
                {
                    client.EnableSsl = useSsl;
                    client.Credentials = new NetworkCredential(username, password);
                    client.DeliveryMethod = SmtpDeliveryMethod.Network;
                    client.Timeout = 10000;

                    // Try to send a test email
                    var mail = new MailMessage();
                    mail.From = new MailAddress(username);
                    mail.To.Add(username);
                    mail.Subject = "SMTP Test";
                    mail.Body = "This is a test email from SkuVaultSaaS SMTP connection test.";

                    client.Send(mail);
                    Console.WriteLine("SMTP connection and send succeeded.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SMTP connection or send failed: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"Inner: {ex.InnerException.Message}");
            }
        }
    }
}
