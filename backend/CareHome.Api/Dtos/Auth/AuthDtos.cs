namespace CareHome.Api.Dtos.Auth
{
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public List<string> Roles { get; set; } = [];

        public List<int> CareHomeIds { get; set; } = [];

        public string? TenantName { get; set; }

        public Guid? TenantPublicId { get; set; }
    }
}

