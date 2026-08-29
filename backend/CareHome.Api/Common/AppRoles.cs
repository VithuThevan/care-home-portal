namespace CareHome.Api.Common;

public static class AppRoles
{
    public const string PlatformAdmin = "PlatformAdmin";
    public const string TenantAdmin = "TenantAdmin";
    public const string Administrator = "Administrator";
    public const string LocationManager = "LocationManager";
    public const string ReadOnly = "ReadOnly";

    /// <summary>Legacy role name mapped to PlatformAdmin on login/seed.</summary>
    public const string SuperAdmin = "SuperAdmin";

    public static readonly string[] All =
    [
        PlatformAdmin,
        TenantAdmin,
        Administrator,
        LocationManager,
        ReadOnly
    ];

    public static readonly string[] TenantOperators =
    [
        TenantAdmin,
        Administrator,
        LocationManager,
        ReadOnly
    ];

    public static readonly string[] CanManageTenantUsers =
    [
        TenantAdmin,
        Administrator
    ];

    public static readonly string[] TenantWrite =
    [
        TenantAdmin,
        Administrator,
        LocationManager
    ];
}
