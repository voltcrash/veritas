using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
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
builder.Services.Configure<VeritasApiKeyOptions>(builder.Configuration.GetSection("Veritas"));
builder.Services.AddHttpClient<GeminiService>();

var app = builder.Build();

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();
    app.UseHttpsRedirection();
    app.UseHsts();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(veritas.Client._Imports).Assembly);

// API endpoint for news analysis (optional API key = RBAC: authenticated vs anonymous).
app.MapPost("/api/analyze", async (
    NewsAnalysisRequest request,
    HttpContext httpContext,
    GeminiService gemini,
    IOptions<VeritasApiKeyOptions> apiKeyOptions,
    CancellationToken ct) =>
{
    var clientKey = apiKeyOptions.Value.ClientApiKey;
    if (!string.IsNullOrWhiteSpace(clientKey))
    {
        var key = httpContext.Request.Headers["X-Veritas-Key"].FirstOrDefault()
                  ?? httpContext.Request.Headers.Authorization.FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
        if (string.IsNullOrEmpty(key) || !string.Equals(key.Trim(), clientKey, StringComparison.Ordinal))
            return Results.Json(new { error = "Unauthorized. Provide a valid X-Veritas-Key or Authorization: Bearer key." }, statusCode: 401);
    }

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