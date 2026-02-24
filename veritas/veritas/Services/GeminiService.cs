using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using veritas.Models;

namespace veritas.Services;

public sealed class GeminiOptions
{
    public string ApiKey { get; set; } = string.Empty;
    /// <summary>
    /// OpenRouter model name, e.g. \"openai/gpt-oss-120b:free\".
    /// </summary>
    public string Model { get; set; } = "openai/gpt-oss-120b:free";
}

public sealed class GeminiService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;

    public GeminiService(HttpClient httpClient, IOptions<GeminiOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<NewsAnalysisResponse> AnalyzeAsync(NewsAnalysisRequest request, CancellationToken cancellationToken = default)
    {
        var content = await BuildContentAsync(request, cancellationToken);

        var prompt =
            """
            You are Veritas, an AI misinformation detector.

            Classify the following news content as one of:
            - GOOD  : factually accurate / trustworthy
            - BAD   : misinformation, disinformation, or clearly misleading
            - UNCERTAIN : unclear or mixed; not enough reliable evidence either way

            Requirements:
            - Think step by step but ONLY return JSON in the following shape:
              {
                "verdict": "GOOD" | "BAD" | "UNCERTAIN",
                "confidence": number between 0 and 1,
                "summary": "short 1–2 sentence summary of what this news claims",
                "reasons": [
                  "reason 1",
                  "reason 2"
                ],
                "sources": [
                  {
                    "name": "FactCheck.org",
                    "url": "https://www.factcheck.org/..."
                  }
                ]
              }
            - \"sources\" must list specific, reputable sites you relied on
              (fact-checkers, major news orgs, scientific bodies). Include
              direct URLs whenever possible.
            - Do not add any extra keys.
            - Do not include any explanation outside the JSON.
            """;

        var body = new
        {
            model = _options.Model,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = prompt
                },
                new
                {
                    role = "user",
                    content = $"CONTENT TO ANALYZE:\n{content}"
                }
            },
            // Make results as stable/consistent as possible between calls.
            temperature = 0.0,
            top_p = 0.1,
            response_format = new
            {
                type = "json_object"
            }
        };

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return new NewsAnalysisResponse
            {
                Verdict = "UNCERTAIN",
                Summary = "Gemini API key is not configured on the server.",
                Reasons = new List<string>
                {
                    "Set Gemini:ApiKey in configuration or as an environment variable."
                }
            };
        }

        using var requestMessage = new HttpRequestMessage(
            HttpMethod.Post,
            "https://openrouter.ai/api/v1/chat/completions")
        {
            Content = JsonContent.Create(body)
        };
        requestMessage.Headers.Add("Authorization", $"Bearer {_options.ApiKey}");
        requestMessage.Headers.Add("HTTP-Referer", "https://localhost");
        requestMessage.Headers.Add("X-Title", "Veritas");

        using var response = await _httpClient.SendAsync(requestMessage, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorText = await response.Content.ReadAsStringAsync(cancellationToken);
            return new NewsAnalysisResponse
            {
                Verdict = "UNCERTAIN",
                Summary = "Unable to reach the verification engine.",
                Reasons = new List<string>
                {
                    $"HTTP {(int)response.StatusCode} from Gemini API.",
                    string.IsNullOrWhiteSpace(errorText)
                        ? "No error body returned."
                        : Truncate(errorText, 500)
                }
            };
        }

        string text;
        GeminiAnalysisPayload? payload = null;
        try
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var jsonDoc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            var root = jsonDoc.RootElement;

            // OpenRouter returns an error payload with an 'error' object when
            // something is wrong (invalid model, key, etc.). Surface that
            // instead of a generic \"no choice\" message.
            if (!root.TryGetProperty("choices", out var choices) ||
                choices.ValueKind != JsonValueKind.Array ||
                choices.GetArrayLength() == 0)
            {
                if (root.TryGetProperty("error", out var errorElement))
                {
                    var msg = errorElement.TryGetProperty("message", out var msgEl)
                        ? msgEl.GetString()
                        : errorElement.GetRawText();

                    return new NewsAnalysisResponse
                    {
                        Verdict = "UNCERTAIN",
                        Summary = msg ?? "Verification engine returned an error.",
                        Raw = root.GetRawText()
                    };
                }

                return new NewsAnalysisResponse
                {
                    Verdict = "UNCERTAIN",
                    Summary = "Verification engine returned an unexpected response.",
                    Raw = root.GetRawText()
                };
            }

            var message = choices[0].GetProperty("message");
            text = message.GetProperty("content").GetString() ?? string.Empty;

            payload = JsonSerializer.Deserialize<GeminiAnalysisPayload>(
                text,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            return new NewsAnalysisResponse
            {
                Verdict = "UNCERTAIN",
                Summary = "Verification engine returned an invalid response.",
                Reasons = new List<string> { ex.Message },
                Raw = string.Empty
            };
        }

        if (payload is null)
        {
            return new NewsAnalysisResponse
            {
                Verdict = "UNCERTAIN",
                Summary = "Verification engine returned an unexpected format.",
                Raw = text
            };
        }

        var verdict = payload.Verdict?.Trim().ToUpperInvariant();
        if (verdict is not ("GOOD" or "BAD" or "UNCERTAIN"))
        {
            verdict = "UNCERTAIN";
        }

        return new NewsAnalysisResponse
        {
            Verdict = verdict!,
            Confidence = clamp(payload.Confidence),
            Summary = payload.Summary?.Trim() ?? string.Empty,
            Reasons = payload.Reasons?.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim()).ToList()
                      ?? new List<string>(),
            Sources = payload.Sources?
                          .Where(s => !string.IsNullOrWhiteSpace(s.Url) || !string.IsNullOrWhiteSpace(s.Name))
                          .Select(s => new NewsSource
                          {
                              Name = s.Name?.Trim() ?? string.Empty,
                              Url = s.Url?.Trim() ?? string.Empty
                          }).ToList()
                      ?? new List<NewsSource>(),
            Raw = text
        };
    }

    private async Task<string> BuildContentAsync(NewsAnalysisRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Input))
        {
            return "No content provided.";
        }

        var mode = request.Mode?.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(mode) || mode == "auto")
        {
            mode = LooksLikeUrl(request.Input) ? "link" : "text";
        }

        if (mode == "link")
        {
            // Try to fetch the HTML for the link, then strip tags to get readable text.
            try
            {
                var html = await _httpClient.GetStringAsync(request.Input, cancellationToken);
                var text = ExtractTextFromHtml(html);
                if (!string.IsNullOrWhiteSpace(text))
                {
                    return $"Source URL: {request.Input}\n\nExtracted page text:\n{text}";
                }
            }
            catch
            {
                // Swallow and fall back to URL only.
            }

            return $"Source URL (failed to fetch HTML): {request.Input}";
        }

        // Text mode – pass the text as-is.
        return request.Input;
    }

    private static string ExtractTextFromHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;

        // Drop scripts and styles.
        var withoutScripts = Regex.Replace(html, "<script[\\s\\S]*?</script>", " ", RegexOptions.IgnoreCase);
        var withoutStyles = Regex.Replace(withoutScripts, "<style[\\s\\S]*?</style>", " ", RegexOptions.IgnoreCase);
        var noTags = Regex.Replace(withoutStyles, "<.*?>", " ");
        var decoded = WebUtility.HtmlDecode(noTags);
        var collapsed = Regex.Replace(decoded, "\\s+", " ");
        return Truncate(collapsed.Trim(), 8000); // Keep prompt reasonably sized.
    }

    private static string Truncate(string value, int max)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= max) return value;
        return value[..max] + "…";
    }

    private static double clamp(double v) => v switch
    {
        < 0 => 0,
        > 1 => 1,
        _ => v
    };

    private static bool LooksLikeUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        if (Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri))
        {
            return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;
        }
        return false;
    }
}

