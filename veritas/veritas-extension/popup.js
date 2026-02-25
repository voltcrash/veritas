const API_BASE = "https://localhost:7262"; // change in prod
const ANALYZE_URL = `${API_BASE}/api/analyze`;

const inputEl = document.getElementById("input");
const analyzeBtn = document.getElementById("analyzeBtn");
const charCountEl = document.getElementById("charCount");

const resultEl = document.getElementById("result");
const verdictPill = document.getElementById("verdictPill");
const confidenceLabel = document.getElementById("confidenceLabel");
const confidenceBar = document.getElementById("confidenceBar");
const summaryEl = document.getElementById("summary");
const reasonsEl = document.getElementById("reasons");
const sourcesBlockEl = document.getElementById("sourcesBlock");
const sourcesEl = document.getElementById("sources");
const errorEl = document.getElementById("error");

function setVerdictPill(verdict) {
  const v = (verdict || "").toUpperCase();
  verdictPill.className = "pill";

  if (v === "GOOD") {
    verdictPill.classList.add("good");
    verdictPill.textContent = "Credible";
  } else if (v === "BAD") {
    verdictPill.classList.add("bad");
    verdictPill.textContent = "Misleading";
  } else if (v === "UNCERTAIN") {
    verdictPill.textContent = "Inconclusive";
  } else if (v === "ERROR") {
    verdictPill.textContent = "Error";
  } else {
    verdictPill.textContent = verdict || "Unknown";
  }
}

function renderResult(data) {
  if (!data) return;

  errorEl.textContent = "";

  setVerdictPill(data.verdict);
  const conf = typeof data.confidence === "number" ? data.confidence : 0;
  const pct = Math.round(Math.max(0, Math.min(1, conf)) * 100);
  confidenceLabel.textContent = `${pct}% confidence`;
  confidenceBar.style.width = `${pct}%`;

  summaryEl.textContent = data.summary || "";

  reasonsEl.innerHTML = "";
  if (Array.isArray(data.reasons) && data.reasons.length > 0) {
    data.reasons.forEach(r => {
      if (!r) return;
      const li = document.createElement("li");
      li.textContent = r;
      reasonsEl.appendChild(li);
    });
  }

  sourcesEl.innerHTML = "";
  if (Array.isArray(data.sources) && data.sources.length > 0) {
    sourcesBlockEl.style.display = "";
    data.sources.forEach(src => {
      if (!src) return;
      const li = document.createElement("li");
      const name = (src.name || "").trim();
      const url = (src.url || "").trim();
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = name || url;
        li.appendChild(a);
      } else if (name) {
        li.textContent = name;
      }
      sourcesEl.appendChild(li);
    });
  } else {
    sourcesBlockEl.style.display = "none";
  }

  resultEl.style.display = "flex";
}

function renderError(message) {
  setVerdictPill("ERROR");
  confidenceLabel.textContent = "0% confidence";
  confidenceBar.style.width = "0%";
  summaryEl.textContent = "";
  reasonsEl.innerHTML = "";
  sourcesEl.innerHTML = "";
  sourcesBlockEl.style.display = "none";
  errorEl.textContent = message || "Unexpected error.";
  resultEl.style.display = "flex";
}

async function analyze() {
  const text = inputEl.value.trim();
  if (!text) return;

  analyzeBtn.disabled = true;
  analyzeBtn.querySelector(".analyze-btn-text").textContent = "Analyzing…";
  resultEl.style.display = "none";

  try {
    const res = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "auto",
        input: text
      })
    });

    if (!res.ok) {
      const body = await res.text();
      renderError(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      return;
    }

    const data = await res.json();
    renderResult(data);
  } catch (err) {
    renderError(err && err.message ? err.message : String(err));
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector(".analyze-btn-text").textContent = "Analyze";
  }
}

function updateCharCount() {
  charCountEl.textContent = inputEl.value.length.toString();
}

// Prefill with current tab URL if possible
document.addEventListener("DOMContentLoaded", () => {
  updateCharCount();

  if (chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs && tabs[0];
      if (tab && tab.url && !tab.url.startsWith("chrome://")) {
        inputEl.value = tab.url;
        updateCharCount();
      }
    });
  }

  inputEl.addEventListener("input", updateCharCount);
  analyzeBtn.addEventListener("click", analyze);
});