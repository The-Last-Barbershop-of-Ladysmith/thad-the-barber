using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.ReportViewer.Storage;
using ThadTheBarber.ReportViewer.Tests.Fakes;

namespace ThadTheBarber.ReportViewer.Tests;

/// <summary>Hosts the viewer over a <see cref="FakeReportStore"/>, so tests never touch Azure.</summary>
public sealed class ViewerFactory : WebApplicationFactory<Program>
{
    internal static readonly Dictionary<string, string> Blobs = new()
    {
        ["pr/7/100/e2e/index.html"] = "<h1>e2e</h1>",
        ["pr/7/100/lighthouse/home.report.html"] = "<h1>home</h1>",
        ["pr/7/100/lighthouse/book.report.html"] = "<h1>book</h1>",
        ["pr/7/100/coverage/index.html"] = "<h1>coverage</h1>",
        ["pr/7/100/coverage/styles.css"] = "body {}",
        ["pr/7/99/e2e/index.html"] = "<h1>older run</h1>",
        ["pr/12/250/e2e/index.html"] = "<h1>newer PR</h1>",
        ["deploy/dev/300/smoke/index.html"] = "<h1>smoke</h1>",
    };

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Reports:StorageAccount", "storexample");
        builder.ConfigureTestServices(services => services.AddSingleton<IReportStore>(new FakeReportStore(Blobs)));
    }
}
