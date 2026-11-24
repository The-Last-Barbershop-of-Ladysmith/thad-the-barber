namespace ThadTheBarber.Api.Tests.TestSupport;

public static class RepoFiles
{
    public static string Read(params string[] pathFromRepoRoot)
    {
        DirectoryInfo? directory = new(AppContext.BaseDirectory);
        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "infra")))
        {
            directory = directory.Parent;
        }

        string root = directory?.FullName ?? throw new DirectoryNotFoundException("No infra folder above the test output.");
        return File.ReadAllText(Path.Combine([root, .. pathFromRepoRoot]));
    }
}
