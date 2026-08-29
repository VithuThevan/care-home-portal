namespace CareHome.Api.Security;

public static class ProductionStartupValidator
{
    public static void Validate(IConfiguration configuration, IHostEnvironment environment, ILogger logger)
    {
        if (environment.IsDevelopment())
        {
            return;
        }

        ValidateConnectionString(configuration.GetConnectionString("DefaultConnection"));
        ValidateEmail(configuration, logger);
        ValidateCors(configuration, environment);
        ValidateProductionSeed(configuration);
    }

    public static void ValidateConnectionString(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is not configured. Set ConnectionStrings__DefaultConnection to a SQL Server connection string.");
        }

        if (connectionString.Contains("(localdb)", StringComparison.OrdinalIgnoreCase)
            || connectionString.Contains("MSSQLLocalDB", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "LocalDB is not allowed outside Development. Set ConnectionStrings__DefaultConnection to a SQL Server instance.");
        }
    }

    public static void ValidateEmail(IConfiguration configuration, ILogger logger)
    {
        var mode = configuration["Email:Mode"] ?? "";
        if (string.Equals(mode, "Smtp", StringComparison.OrdinalIgnoreCase))
        {
            var host = configuration["Email:Smtp:Host"];
            var from = configuration["Email:FromAddress"];
            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
            {
                throw new InvalidOperationException(
                    "Email:Mode is Smtp but Email:Smtp:Host or Email:FromAddress is missing. Set Email__Smtp__Host and Email__FromAddress, or change Email__Mode.");
            }

            logger.LogInformation(
                "Email mode is Smtp. Host={Host} Port={Port} From={From} Ssl={Ssl}",
                host,
                configuration["Email:Smtp:Port"] ?? "587",
                from,
                configuration["Email:Smtp:EnableSsl"] ?? "true");
            return;
        }

        logger.LogWarning(
            "PRODUCTION EMAIL IS SIMULATED. Email:Mode={Mode}. No messages will be delivered to real mailboxes. Set Email__Mode=Smtp with SMTP secrets for live email.",
            string.IsNullOrWhiteSpace(mode) ? "(empty)" : mode);
    }

    public static void ValidateCors(IConfiguration configuration, IHostEnvironment environment)
    {
        var origins = ResolveOrigins(configuration);
        if (origins.Any(o => string.Equals(o, "*", StringComparison.Ordinal)))
        {
            throw new InvalidOperationException("CORS must not use AllowAnyOrigin / '*'.");
        }

        if (!environment.IsDevelopment()
            && origins.Any(o => o.Contains("localhost", StringComparison.OrdinalIgnoreCase)
                || o.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException(
                "Production CORS must not include localhost. Set Cors__AllowedOrigins__0 to the HTTPS origin of the Angular host, or leave origins empty for same-origin hosting.");
        }
    }

    public static string[] ResolveOrigins(IConfiguration configuration)
    {
        var allowed = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (allowed.Length > 0)
        {
            return allowed.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToArray();
        }

        var legacy = configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
        return legacy.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToArray();
    }

    public static void ValidateProductionSeed(IConfiguration configuration)
    {
        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        if (KnownDevelopmentCredentials.IsForbiddenProductionBootstrap(email, password))
        {
            throw new InvalidOperationException(
                "The Development platform admin credentials cannot be used outside Development. Set Seed__AdminEmail and Seed__AdminPassword to unique bootstrap values, or leave them empty and create the first PlatformAdmin manually.");
        }
    }
}
