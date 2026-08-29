using System.Text;
using CareHome.Api.Audit;
using CareHome.Api.Billing;
using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Documents;
using CareHome.Api.Email;
using CareHome.Api.Export;
using CareHome.Api.Security;
using CareHome.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddControllers(options =>
{
    var policy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    options.Filters.Add(new AuthorizeFilter(policy));
    options.Filters.Add<ReadOnlyGuardFilter>();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
            ?? ["http://localhost:4200"];

        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' was not found."
    );

builder.Services.AddDbContext<CareHomeDbContext>(options =>
{
    options.UseSqlServer(connectionString);
});

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddEntityFrameworkStores<CareHomeDbContext>()
    .AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? "DEVELOPMENT-ONLY-CHANGE-ME-TO-A-LONG-SECRET-KEY";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "CareHomeApi",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "CareHomeWeb",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddScoped<ITenantContext, HttpTenantContext>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<UserAccessService>();
builder.Services.AddScoped<TenantProvisioningService>();
builder.Services.AddScoped<DocumentSequenceService>();
builder.Services.AddScoped<RateCalculator>();
builder.Services.AddScoped<InvoiceTemplateResolver>();
builder.Services.AddScoped<BillingService>();
builder.Services.AddScoped<CreditNoteService>();
builder.Services.AddScoped<InvoicePdfService>();
builder.Services.AddScoped<IDocumentStore, LocalDocumentStore>();
builder.Services.AddScoped<IEmailSender, ConfigurableEmailSender>();
builder.Services.AddScoped<Sage50ColumnMap>();
builder.Services.AddScoped<SageExportService>();
builder.Services.AddScoped<MiscChargeImportService>();
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<IdentitySeeder>();
builder.Services.AddScoped<DevelopmentMasterDataSeeder>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("Startup");

    try
    {
        var identitySeeder = scope.ServiceProvider.GetRequiredService<IdentitySeeder>();
        await identitySeeder.SeedAsync();

        var dataSeeder = scope.ServiceProvider.GetRequiredService<DevelopmentMasterDataSeeder>();
        await dataSeeder.SeedAsync();
    }
    catch (Exception ex)
    {
        logger.LogWarning(
            ex,
            "Startup seed skipped. Apply database migrations before running the API.");
    }
}

app.Run();
