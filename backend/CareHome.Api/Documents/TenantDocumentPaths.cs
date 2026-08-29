namespace CareHome.Api.Documents;

public static class TenantDocumentPaths
{
    public static string Folder(Guid tenantPublicId, string documentKind)
    {
        var kind = Path.GetFileName(documentKind);
        if (string.IsNullOrWhiteSpace(kind) || kind.Contains("..", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Invalid document kind.");
        }

        return Path.Combine("tenants", tenantPublicId.ToString("D"), kind);
    }
}
