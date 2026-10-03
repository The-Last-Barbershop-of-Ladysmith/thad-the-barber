using ThadTheBarber.ReportViewer.Features.Reports;
using ThadTheBarber.ReportViewer.Infrastructure;
using ThadTheBarber.ReportViewer.Storage;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddReportStore(builder.Configuration);

WebApplication app = builder.Build();

app.UseReportHeaders();
app.MapReportEndpoints();

await app.RunAsync();
