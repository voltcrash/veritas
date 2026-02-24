using veritas.Client.Pages;
using veritas.Components;
using veritas.Models;
using veritas.Services;

var builder = WebApplication.CreateBuilder(args);

LoadDotEnv(builder.Configuration);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddHttpClient<GeminiService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(veritas.Client._Imports).Assembly);

// API endpoint for news analysis.
app.MapPost("/api/analyze", async (NewsAnalysisRequest request, GeminiService gemini, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Input))
    {
        return Results.BadRequest(new { error = "Input is required." });
    }

    var result = await gemini.AnalyzeAsync(request, ct);
    return Results.Ok(result);
});

app.Run();

static void LoadDotEnv(ConfigurationManager config)
{
    try
    {
        // Use the current working directory so this works consistently
        // when running via 'dotnet run', IDE, or hot reload.
        var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
        if (!File.Exists(envPath))
        {
            return;
        }

        var data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        foreach (var rawLine in File.ReadAllLines(envPath))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrEmpty(line) || line.StartsWith("#", StringComparison.Ordinal))
            {
                continue;
            }

            var idx = line.IndexOf('=', StringComparison.Ordinal);
            if (idx <= 0)
            {
                continue;
            }

            var key = line[..idx].Trim();
            var value = line[(idx + 1)..].Trim();
            if (key.Length == 0)
            {
                continue;
            }

            data[key] = value;
        }

        if (data.Count > 0)
        {
            config.AddInMemoryCollection(data);
        }
    }
    catch
    {
        // If .env loading fails, we silently fall back to normal configuration.
    }
}