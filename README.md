# Veritas - News Verifier 🕵️‍♂️📰

**Lightning-fast news verification right in your browser. Fight misinformation with a click.**


Veritas is a browser extension that helps you instantly verify the credibility of any news link or story. Powered by a local AI backend, it analyzes text or URLs and gives you a verdict in seconds-so you can trust what you read, *anywhere on the web*.


## Features

- **One-click verification:** Paste a link or news text and get instant credibility analysis.
- **Visual verdicts:** "Good News," "Bad News," or "Uncertain" status with confidence level.
- **AI-powered insights:** Quick summaries and reasons behind each verdict.
- **Source transparency:** See which sources were checked, with direct links.

---

## Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/yourname/veritas.git
cd veritas
```

### 2. Set Up the Backend

- Configure your `.env` in `veritas/veritas/.env` with your AI API key and model.

### 3. Run the Backend

```bash
cd veritas
dotnet run
```

### 4. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode."
3. Click "Load unpacked" and select `veritas/veritas-extension/`.

---

## Usage

- Click the Veritas icon in your browser.
- Paste a link or any news text, then click **Analyze**.
- Review the verdict, confidence, and checked sources.
