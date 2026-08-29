namespace CareHome.Api.Security;

public static class KnownDevelopmentCredentials
{
    public const string AdminEmail = "admin@localhost";
    public const string AdminPassword = "DevAdmin!12345";

    public static bool IsForbiddenProductionPassword(string? password)
    {
        return string.Equals(password, AdminPassword, StringComparison.Ordinal);
    }

    public static bool IsForbiddenProductionBootstrap(string? email, string? password)
    {
        return string.Equals(email?.Trim(), AdminEmail, StringComparison.OrdinalIgnoreCase)
            || IsForbiddenProductionPassword(password);
    }
}
