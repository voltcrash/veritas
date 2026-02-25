// popup.js
const API_BASE = "https://localhost:7262";
const ANALYZE_URL = `${API_BASE}/api/analyze`;

// When the server requires API key auth (Veritas:ClientApiKey in .env), set the same key here.
// Leave empty if the server does not require a key.
const VERITAS_CLIENT_API_KEY = "";

const analyzeScreen = document.getElementById("analyzeScreen");
const resultScreen  = document.getElementById("resultScreen");
const analyzingUrl  = document.getElementById("analyzingUrl");
const retryBtn      = document.getElementById("retryBtn");
const resultCard    = document.getElementById("resultCard");
const ringProgress  = document.getElementById("ringProgress");
const ringPct       = document.getElementById("ringPct");
const verdictPill   = document.getElementById("verdictPill");
const summaryEl     = document.getElementById("summary");
const reasonsBlock  = document.getElementById("reasonsBlock");
const reasonsList   = document.getElementById("reasonsList");
const sourcesBlock  = document.getElementById("sourcesBlock");
const sourcesList   = document.getElementById("sourcesList");
const errorText     = document.getElementById("errorText");

const CIRCUMFERENCE = 314.159;

/** Normalize API response: backend may send PascalCase (Verdict, Reliability, etc.). */
function normalizeResponse(data) {
  if (!data || typeof data !== "object") return data;
  return {
    verdict:     data.verdict     ?? data.Verdict,
    reliability: data.reliability ?? data.Reliability,
    summary:     data.summary     ?? data.Summary,
    reasons:     data.reasons     ?? data.Reasons ?? [],
    sources:     (data.sources ?? data.Sources ?? []).map(s => ({
      name: (s && (s.name ?? s.Name)) ?? "",
      url:  (s && (s.url ?? s.Url)) ?? "",
    })),
  };
}

function setRing(score) {
  const clamped = Math.max(0, Math.min(100, score));
  ringProgress.style.strokeDashoffset = (
    CIRCUMFERENCE * (1 - clamped / 100)
  ).toFixed(3);
  ringPct.textContent = Math.round(clamped).toString();
}

const VERDICT_MAP = {
  GOOD:      { label: "Credible",     cls: "good" },
  BAD:       { label: "Misleading",   cls: "bad" },
  UNCERTAIN: { label: "Inconclusive", cls: "uncertain" },
  ERROR:     { label: "Error",        cls: "error" },
};

function applyVerdict(verdict) {
  const v    = (verdict || "").toUpperCase();
  const info = VERDICT_MAP[v] ?? { label: verdict || "Unknown", cls: "" };
  resultCard.className  = `result-card${info.cls ? ` verdict-${info.cls}` : ""}`;
  verdictPill.className = `pill${info.cls ? ` ${info.cls}` : ""}`;
  verdictPill.textContent = info.label;
}

function transitionToResult() {
  analyzeScreen.classList.add("exit");
  analyzeScreen.addEventListener(
    "animationend",
    () => {
      analyzeScreen.style.display = "none";
      resultScreen.classList.add("visible");
    },
    { once: true }
  );
}

function populateResult(data) {
  errorText.style.display = "none";
  applyVerdict(data.verdict);
  setRing(0);
  summaryEl.textContent = data.summary || "";

  // Reasons
  reasonsList.innerHTML = "";
  const reasons = (data.reasons ?? []).filter(Boolean);
  if (reasons.length) {
    reasons.forEach(r => {
      const row = document.createElement("div");
      row.className = "reason-item";
      const dot = document.createElement("span");
      dot.className = "reason-dot";
      const txt = document.createElement("span");
      txt.textContent = r;
      row.appendChild(dot);
      row.appendChild(txt);
      reasonsList.appendChild(row);
    });
    reasonsBlock.style.display = "";
  } else {
    reasonsBlock.style.display = "none";
  }

  // Sources
  sourcesList.innerHTML = "";
  const sources = (data.sources ?? []).filter(Boolean);
  if (sources.length) {
    sources.forEach(src => {
      const name = (src.name || "").trim();
      const url  = (src.url  || "").trim();
      if (!name && !url) return;
      const chip = document.createElement("div");
      chip.className = "source-chip";
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = name || url;
        chip.appendChild(a);
      } else {
        chip.textContent = name;
      }
      sourcesList.appendChild(chip);
    });
    sourcesBlock.style.display = "";
  } else {
    sourcesBlock.style.display = "none";
  }
}

function showResult(data) {
  populateResult(data);
  transitionToResult();
  // fill ring after transition settles
  const score = typeof data.reliability === "number" ? data.reliability : 0;
  setTimeout(() => setRing(score), 520);
}

function showError(message) {
  applyVerdict("ERROR");
  setRing(0);
  summaryEl.textContent      = message || "Unexpected error.";
  reasonsBlock.style.display = "none";
  sourcesBlock.style.display = "none";
  errorText.style.display    = "none";
  transitionToResult();
}

function resetToAnalyze() {
  analyzeScreen.style.display = "";
  analyzeScreen.classList.remove("exit");
  resultScreen.classList.remove("visible");
  runAnalysis();
}

const FETCH_TIMEOUT_MS = 35000;

async function runAnalysis() {
  setRing(0);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url  = tabs?.[0]?.url ?? "";

    if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
      showError("Can't analyze this page — try a regular web page.");
      return;
    }

    analyzingUrl.textContent =
      url.length > 52 ? url.slice(0, 52) + "…" : url;

    const headers = { "Content-Type": "application/json" };
    if (VERITAS_CLIENT_API_KEY) headers["X-Veritas-Key"] = VERITAS_CLIENT_API_KEY;

    const res = await fetch(ANALYZE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "auto", input: url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      showError(`HTTP ${res.status}: ${body.slice(0, 120)}`);
      return;
    }

    const raw = await res.json();
    const data = normalizeResponse(raw);
    showResult(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      showError("Request timed out. Check that the Veritas server is running at " + API_BASE);
    } else {
      showError(err?.message ?? String(err));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  retryBtn.addEventListener("click", resetToAnalyze);
  runAnalysis();
});