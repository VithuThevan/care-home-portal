namespace CareHome.Api.Security;

public static class JwtSigningKey
{
    public const string DevelopmentPlaceholder = "DEVELOPMENT-ONLY-CHANGE-ME-TO-A-LONG-SECRET-KEY";
    public const int MinimumLength = 32;

    public static string Resolve(string? configuredKey, bool isDevelopment)
    {
        var key = configuredKey?.Trim();
        var missingOrPlaceholder =
            string.IsNullOrWhiteSpace(key) ||
            string.Equals(key, DevelopmentPlaceholder, StringComparison.Ordinal);

        if (!isDevelopment && missingOrPlaceholder)
        {
            throw new InvalidOperationException(
                "Jwt:Key is not configured. Set Jwt__Key as an environment variable, user secret, or deployment secret. The development placeholder is not allowed outside the Development environment.");
        }

        key = string.IsNullOrWhiteSpace(key) ? DevelopmentPlaceholder : key;
        if (IsWeak(key))
        {
            throw new InvalidOperationException(
                $"Jwt:Key is missing, is the development placeholder, or is too weak. Provide a secret of at least {MinimumLength} characters.");
        }

        return key;
    }

    public static bool IsWeak(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return true;
        }

        if (key.Length < MinimumLength)
        {
            return true;
        }

        if (string.Equals(key, DevelopmentPlaceholder, StringComparison.Ordinal))
        {
            return false;
        }

        if (key.Distinct().Count() < 8)
        {
            return true;
        }

        var lowered = key.ToLowerInvariant();
        return lowered.Contains("changeme", StringComparison.Ordinal)
            || lowered is "passwordpasswordpasswordpassword"
            || lowered is "secretsecretsecretsecretsecret12";
    }
}
