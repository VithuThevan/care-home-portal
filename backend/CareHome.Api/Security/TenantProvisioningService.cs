using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Security
{
    public class TenantProvisioningService(
        CareHomeDbContext dbContext,
        UserManager<ApplicationUser> userManager)
    {
        public async Task<Tenant> ProvisionAsync(
            TenantProvisionRequest request,
            CancellationToken cancellationToken = default)
        {
            var now = DateTimeOffset.UtcNow;
            var tenant = new Tenant
            {
                PublicId = Guid.NewGuid(),
                Name = request.Name.Trim(),
                TradingName = NullIfEmpty(request.TradingName),
                RegistrationNumber = NullIfEmpty(request.RegistrationNumber),
                Address = NullIfEmpty(request.Address),
                Phone = NullIfEmpty(request.Phone),
                Email = NullIfEmpty(request.Email),
                Website = NullIfEmpty(request.Website),
                IsActive = request.IsActive,
                CreatedAt = now,
                Settings = new TenantSettings
                {
                    CurrencyCode = "GBP",
                    CurrencySymbol = "£",
                    TimeZoneId = "Europe/London",
                    InvoicePrefix = "INV-",
                    CreditNotePrefix = "CN-",
                    NumberLength = 4,
                    PaymentTermsDays = 30
                }
            };

            dbContext.Tenants.Add(tenant);
            await dbContext.SaveChangesAsync(cancellationToken);

            foreach (var category in DefaultInvoiceCategories.All)
            {
                dbContext.InvoiceCategories.Add(new InvoiceCategory
                {
                    TenantId = tenant.Id,
                    Code = category.Code,
                    Name = category.Name,
                    Description = category.Description,
                    IsActive = true
                });
            }

            dbContext.DocumentSequences.Add(new DocumentSequence
            {
                TenantId = tenant.Id,
                DocumentType = DocumentTypes.Invoice,
                Prefix = tenant.Settings.InvoicePrefix,
                NumberLength = tenant.Settings.NumberLength,
                NextValue = 1
            });

            dbContext.DocumentSequences.Add(new DocumentSequence
            {
                TenantId = tenant.Id,
                DocumentType = DocumentTypes.CreditNote,
                Prefix = tenant.Settings.CreditNotePrefix,
                NumberLength = tenant.Settings.NumberLength,
                NextValue = 1
            });

            await dbContext.SaveChangesAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(request.AdminEmail)
                && !string.IsNullOrWhiteSpace(request.AdminPassword))
            {
                var user = new ApplicationUser
                {
                    TenantId = tenant.Id,
                    UserName = request.AdminEmail.Trim(),
                    Email = request.AdminEmail.Trim(),
                    EmailConfirmed = true,
                    DisplayName = string.IsNullOrWhiteSpace(request.AdminDisplayName)
                        ? request.Name.Trim() + " Admin"
                        : request.AdminDisplayName.Trim(),
                    IsActive = true
                };

                var created = await userManager.CreateAsync(user, request.AdminPassword);
                if (!created.Succeeded)
                {
                    throw new InvalidOperationException(
                        string.Join(" ", created.Errors.Select(e => e.Description)));
                }

                await userManager.AddToRoleAsync(user, AppRoles.TenantAdmin);
            }

            return tenant;
        }

        private static string? NullIfEmpty(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }

    public class TenantProvisionRequest
    {
        public string Name { get; set; } = string.Empty;

        public string? TradingName { get; set; }

        public string? RegistrationNumber { get; set; }

        public string? Address { get; set; }

        public string? Phone { get; set; }

        public string? Email { get; set; }

        public string? Website { get; set; }

        public bool IsActive { get; set; } = true;

        public string? AdminEmail { get; set; }

        public string? AdminPassword { get; set; }

        public string? AdminDisplayName { get; set; }
    }
}

