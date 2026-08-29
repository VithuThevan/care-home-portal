namespace CareHome.Api.Email;

public class EmailSendResult
{
    public bool Success { get; init; }

    public bool Simulated { get; init; }

    public string? ErrorMessage { get; init; }
}

public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(
        string to,
        string subject,
        string body,
        string? attachmentFileName,
        byte[]? attachmentBytes,
        CancellationToken cancellationToken = default);
}
