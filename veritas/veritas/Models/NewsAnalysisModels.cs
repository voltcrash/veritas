using System.Text.Json.Serialization;

namespace veritas.Models;

public sealed class NewsAnalysisRequest
{
    public string Mode { get; set; } = "text"; // "link" or "text"
    public string Input { get; set; } = string.Empty;
}

public sealed class NewsAnalysisResponse
{
    public string Verdict { get; set; } = "UNCERTAIN"; // GOOD / BAD / UNCERTAIN
    public double Confidence { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<string> Reasons { get; set; } = new();
    public List<NewsSource> Sources { get; set; } = new();
    public string Raw { get; set; } = string.Empty;
}

public sealed class NewsSource
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

// Shape we expect back from Gemini when asking for JSON.
internal sealed class GeminiAnalysisPayload
{
    [JsonPropertyName("verdict")]
    public string Verdict { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("reasons")]
    public List<string> Reasons { get; set; } = new();

    [JsonPropertyName("sources")]
    public List<GeminiSource> Sources { get; set; } = new();
}

internal sealed class GeminiSource
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

