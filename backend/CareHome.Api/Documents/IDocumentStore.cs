namespace CareHome.Api.Documents;

public interface IDocumentStore
{
    Task<string> SaveAsync(
        string relativeFolder,
        string fileName,
        byte[] content,
        CancellationToken cancellationToken = default);

    Task<byte[]?> ReadAsync(string relativePath, CancellationToken cancellationToken = default);

    string GetFullPath(string relativePath);
}
