using System.Net;
using System.Net.Mail;

namespace CareHome.Api.Email;

public class ConfigurableEmailSender(
    IConfiguration configuration,
    ILogger<ConfigurableEmailSender> logger) : IEmailSender
{
    public async Task<EmailSendResult> SendAsync(
        string to,
        string subject,
        string body,
        string? attachmentFileName,
        byte[]? attachmentBytes,
        CancellationToken cancellationToken = default)
    {
        var mode = configuration["Email:Mode"] ?? "Development";

        if (!string.Equals(mode, "Smtp", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation(
                "Email simulated. To={To} Subject={Subject} Attachment={Attachment}",
                to,
                subject,
                attachmentFileName);

            return new EmailSendResult { Success = true, Simulated = true };
        }

        var host = configuration["Email:Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            return new EmailSendResult
            {
                Success = false,
                Simulated = false,
                ErrorMessage = "SMTP host is not configured."
            };
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(
                    configuration["Email:FromAddress"] ?? "noreply@localhost",
                    configuration["Email:FromName"] ?? "Care Home Billing"),
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            };
            message.To.Add(to);

            if (attachmentBytes is not null && !string.IsNullOrWhiteSpace(attachmentFileName))
            {
                var stream = new MemoryStream(attachmentBytes);
                message.Attachments.Add(new Attachment(stream, attachmentFileName, "application/pdf"));
            }

            using var client = new SmtpClient(host)
            {
                Port = int.TryParse(configuration["Email:Smtp:Port"], out var port) ? port : 587,
                EnableSsl = !string.Equals(configuration["Email:Smtp:EnableSsl"], "false", StringComparison.OrdinalIgnoreCase)
            };

            var user = configuration["Email:Smtp:User"];
            var password = configuration["Email:Smtp:Password"];
            if (!string.IsNullOrWhiteSpace(user))
            {
                client.Credentials = new NetworkCredential(user, password);
            }

            await client.SendMailAsync(message, cancellationToken);
            return new EmailSendResult { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "SMTP send failed for {To}", to);
            return new EmailSendResult
            {
                Success = false,
                ErrorMessage = "The email could not be sent. Check SMTP configuration."
            };
        }
    }
}
