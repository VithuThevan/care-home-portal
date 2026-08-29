using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Dtos.Auth;
using CareHome.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CareHome.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController(
        UserManager<ApplicationUser> userManager,
        CareHomeDbContext dbContext,
        IConfiguration configuration) : ControllerBase
    {
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email.Trim());
            if (user is null || !user.IsActive)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            if (!await userManager.CheckPasswordAsync(user, request.Password))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            return Ok(await BuildResponse(user, includeToken: true));
        }

        [HttpGet("me")]
        public async Task<ActionResult<AuthResponse>> Me()
        {
            var user = await userManager.GetUserAsync(User);
            if (user is null)
            {
                return Unauthorized();
            }

            return Ok(await BuildResponse(user, includeToken: false));
        }

        private async Task<AuthResponse> BuildResponse(ApplicationUser user, bool includeToken)
        {
            var roles = (await userManager.GetRolesAsync(user)).ToList();
            if (roles.Contains(AppRoles.SuperAdmin) && !roles.Contains(AppRoles.PlatformAdmin))
            {
                roles.Add(AppRoles.PlatformAdmin);
            }

            string? tenantName = null;
            Guid? tenantPublicId = null;
            if (user.TenantId is int tenantId)
            {
                var tenant = await dbContext.Tenants.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == tenantId);
                tenantName = tenant?.Name;
                tenantPublicId = tenant?.PublicId;
            }

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Name, user.DisplayName),
                new(ClaimTypes.Email, user.Email ?? "")
            };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            if (user.TenantId is int tid)
            {
                claims.Add(new Claim(TenantClaimTypes.TenantId, tid.ToString()));
                if (tenantPublicId is Guid publicId)
                {
                    claims.Add(new Claim(TenantClaimTypes.TenantPublicId, publicId.ToString("D")));
                }

                if (!string.IsNullOrWhiteSpace(tenantName))
                {
                    claims.Add(new Claim(TenantClaimTypes.TenantName, tenantName));
                }
            }

            var careHomeIds = await userManager.Users
                .Where(x => x.Id == user.Id)
                .SelectMany(x => x.CareHomeAccess.Select(a => a.CareHomeId))
                .ToListAsync();

            var response = new AuthResponse
            {
                DisplayName = user.DisplayName,
                Email = user.Email ?? "",
                Roles = roles,
                CareHomeIds = careHomeIds,
                TenantName = tenantName,
                TenantPublicId = tenantPublicId
            };

            if (includeToken)
            {
                var key = configuration["Jwt:Key"]
                    ?? throw new InvalidOperationException("Jwt:Key is not configured.");
                var issuer = configuration["Jwt:Issuer"] ?? "CareHomeApi";
                var audience = configuration["Jwt:Audience"] ?? "CareHomeWeb";
                var token = new JwtSecurityToken(
                    issuer,
                    audience,
                    claims,
                    expires: DateTime.UtcNow.AddHours(12),
                    signingCredentials: new SigningCredentials(
                        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                        SecurityAlgorithms.HmacSha256));
                response.Token = new JwtSecurityTokenHandler().WriteToken(token);
            }

            return response;
        }
    }
}

