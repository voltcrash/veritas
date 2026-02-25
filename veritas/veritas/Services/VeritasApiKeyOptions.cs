namespace veritas.Services;

/// <summary>
/// Optional API key for /api/analyze (Role-Based Access Control).
/// When set, only requests that send this key (X-Veritas-Key or Authorization: Bearer) are allowed.
/// When not set, the API remains open for local/dev use.
/// </summary>
public sealed class VeritasApiKeyOptions
{
    public string? ClientApiKey { get; set; }
}
