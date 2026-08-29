using CareHome.Api.Audit;
using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Dtos.Users;
using CareHome.Api.Models;
using CareHome.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    [RequireTenant]
    [Authorize(Roles = $"{AppRoles.TenantAdmin},{AppRoles.Administrator}")]
    public class UsersController(
        UserManager<ApplicationUser> userManager,
        CareHomeDbContext dbContext,
        AuditService audit,
        ITenantContext tenantContext) : ControllerBase
    {
        private static readonly string[] AssignableRoles =
        [
            AppRoles.TenantAdmin,
            AppRoles.Administrator,
            AppRoles.LocationManager,
            AppRoles.ReadOnly
        ];

        [HttpGet]
        public async Task<ActionResult<List<UserDto>>> List()
        {
            var tenantId = tenantContext.TenantId;
            var users = await userManager.Users
                .Include(x => x.CareHomeAccess)
                .Where(x => x.TenantId == tenantId)
                .OrderBy(x => x.Email)
                .ToListAsync();

            var result = new List<UserDto>();
            foreach (var user in users)
            {
                result.Add(await ToDto(user));
            }

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> Get(string id)
        {
            var user = await FindTenantUser(id);
            return user is null ? NotFound() : Ok(await ToDto(user));
        }

        [HttpPost]
        public async Task<ActionResult<UserDto>> Create(CreateUserRequest request)
        {
            if (!AssignableRoles.Contains(request.Role))
            {
                return BadRequest(new { message = "Invalid role." });
            }

            var homesError = await ValidateHomes(request.CareHomeIds);
            if (homesError is not null)
            {
                return homesError;
            }

            if (KnownDevelopmentCredentials.IsForbiddenProductionPassword(request.Password))
            {
                return BadRequest(new { message = "This password is not allowed. Choose a unique password." });
            }

            var user = new ApplicationUser
            {
                TenantId = tenantContext.TenantId,
                UserName = request.Email.Trim(),
                Email = request.Email.Trim(),
                DisplayName = request.DisplayName.Trim(),
                EmailConfirmed = true,
                IsActive = true
            };

            var created = await userManager.CreateAsync(user, request.Password);
            if (!created.Succeeded)
            {
                return BadRequest(new { message = string.Join(" ", created.Errors.Select(e => e.Description)) });
            }

            await userManager.AddToRoleAsync(user, request.Role);
            await ReplaceHomes(user.Id, request.CareHomeIds);
            await audit.LogAsync("User", user.Id, "Create", null, new { user.Email, request.Role }, "Created user.");
            return CreatedAtAction(nameof(Get), new { id = user.Id }, await ToDto(user));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<UserDto>> Update(string id, UpdateUserRequest request)
        {
            var user = await FindTenantUser(id);
            if (user is null)
            {
                return NotFound();
            }

            if (!AssignableRoles.Contains(request.Role))
            {
                return BadRequest(new { message = "Invalid role." });
            }

            var homesError = await ValidateHomes(request.CareHomeIds);
            if (homesError is not null)
            {
                return homesError;
            }

            user.DisplayName = request.DisplayName.Trim();
            user.IsActive = request.IsActive;
            await userManager.UpdateAsync(user);

            var roles = await userManager.GetRolesAsync(user);
            await userManager.RemoveFromRolesAsync(user, roles);
            await userManager.AddToRoleAsync(user, request.Role);
            await ReplaceHomes(id, request.CareHomeIds);
            await audit.LogAsync("User", id, "Update", null, request, "Updated user.");
            return Ok(await ToDto(user));
        }

        [HttpPost("{id}/deactivate")]
        public async Task<IActionResult> Deactivate(string id)
        {
            var user = await FindTenantUser(id);
            if (user is null)
            {
                return NotFound();
            }

            user.IsActive = false;
            await userManager.UpdateAsync(user);
            await audit.LogAsync("User", id, "Deactivate", null, null, "Deactivated user.");
            return NoContent();
        }

        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id, ResetPasswordRequest request)
        {
            var user = await FindTenantUser(id);
            if (user is null)
            {
                return NotFound();
            }

            if (KnownDevelopmentCredentials.IsForbiddenProductionPassword(request.NewPassword))
            {
                return BadRequest(new { message = "This password is not allowed. Choose a unique password." });
            }

            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });
            }

            await audit.LogAsync("User", id, "ResetPassword", null, null, "Admin reset password.");
            return NoContent();
        }

        private async Task<ApplicationUser?> FindTenantUser(string id)
        {
            return await userManager.Users
                .Include(x => x.CareHomeAccess)
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantContext.TenantId);
        }

        private async Task<ActionResult?> ValidateHomes(List<int> careHomeIds)
        {
            if (careHomeIds.Count == 0)
            {
                return null;
            }

            var tenantId = tenantContext.TenantId;
            var validCount = await dbContext.CareHomes.CountAsync(x =>
                x.TenantId == tenantId && careHomeIds.Contains(x.Id));

            if (validCount != careHomeIds.Distinct().Count())
            {
                return BadRequest(new { message = "One or more care homes are not in this organisation." });
            }

            return null;
        }

        private async Task ReplaceHomes(string userId, List<int> careHomeIds)
        {
            var existing = dbContext.UserCareHomeAccess.Where(x => x.UserId == userId);
            dbContext.UserCareHomeAccess.RemoveRange(existing);
            foreach (var homeId in careHomeIds.Distinct())
            {
                dbContext.UserCareHomeAccess.Add(new UserCareHomeAccess { UserId = userId, CareHomeId = homeId });
            }

            await dbContext.SaveChangesAsync();
        }

        private async Task<UserDto> ToDto(ApplicationUser user)
        {
            var roles = await userManager.GetRolesAsync(user);
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email ?? "",
                DisplayName = user.DisplayName,
                IsActive = user.IsActive,
                Roles = roles.ToList(),
                CareHomeIds = user.CareHomeAccess.Select(x => x.CareHomeId).ToList()
            };
        }
    }
}

