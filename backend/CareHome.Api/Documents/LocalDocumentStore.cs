namespace CareHome.Api.Documents;

public class LocalDocumentStore(IConfiguration configuration, IWebHostEnvironment environment) : IDocumentStore
{
    public async Task<string> SaveAsync(
        string relativeFolder,
        string fileName,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        var safeFolder = SanitizeRelativeFolder(relativeFolder);
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName) || safeName.Contains("..", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Invalid document file name.");
        }

        var root = GetRoot();
        var folder = Path.GetFullPath(Path.Combine(root, safeFolder));
        EnsureInsideRoot(root, folder);
        Directory.CreateDirectory(folder);

        var fullPath = Path.Combine(folder, safeName);
        EnsureInsideRoot(root, fullPath);
        await File.WriteAllBytesAsync(fullPath, content, cancellationToken);

        return Path.Combine(safeFolder, safeName).Replace('\\', '/');
    }

    public async Task<byte[]?> ReadAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var fullPath = GetFullPath(relativePath);
        if (!File.Exists(fullPath))
        {
            return null;
        }

        return await File.ReadAllBytesAsync(fullPath, cancellationToken);
    }

    public string GetFullPath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)
            || relativePath.Contains("..", StringComparison.Ordinal)
            || Path.IsPathRooted(relativePath))
        {
            throw new InvalidOperationException("Invalid document path.");
        }

        var root = GetRoot();
        var fullPath = Path.GetFullPath(
            Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        EnsureInsideRoot(root, fullPath);
        return fullPath;
    }

    private static string SanitizeRelativeFolder(string relativeFolder)
    {
        if (string.IsNullOrWhiteSpace(relativeFolder)
            || relativeFolder.Contains("..", StringComparison.Ordinal)
            || Path.IsPathRooted(relativeFolder))
        {
            throw new InvalidOperationException("Invalid document folder.");
        }

        var parts = relativeFolder
            .Replace('\\', '/')
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(Path.GetFileName)
            .Where(part => !string.IsNullOrWhiteSpace(part) && part != "." && part != "..")
            .Cast<string>()
            .ToArray();

        if (parts.Length == 0)
        {
            throw new InvalidOperationException("Invalid document folder.");
        }

        return Path.Combine(parts);
    }

    private static void EnsureInsideRoot(string root, string candidate)
    {
        var normalizedRoot = Path.GetFullPath(root)
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            + Path.DirectorySeparatorChar;
        var normalizedCandidate = Path.GetFullPath(candidate);
        if (!normalizedCandidate.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(normalizedCandidate.TrimEnd(Path.DirectorySeparatorChar),
                Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar),
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Document path is outside the storage root.");
        }
    }

    private string GetRoot()
    {
        var configured = configuration["DocumentStorage:RootPath"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return Path.GetFullPath(configured);
        }

        return Path.Combine(environment.ContentRootPath, "App_Data", "documents");
    }
}
