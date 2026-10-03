using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.ReportViewer.Storage;

public sealed class ReportsSettings
{
    public const string SectionName = "Reports";

    /// <summary>Storage account name, e.g. <c>storttbcicentralus</c>. Set by Bicep as an app setting.</summary>
    [Required]
    public string StorageAccount { get; set; } = null!;

    [Required]
    public string Container { get; set; } = null!;

    public Uri ContainerUri => new($"https://{StorageAccount.Trim()}.blob.core.windows.net/{Container}");
}
