// script.js
// Improved frontend evaluation with robust error handling and a local fallback when /evaluate isn't available.

const button = document.querySelector("#evaluate");
const textarea = document.querySelector("#response");
const result = document.querySelector("#result");

if (!button || !textarea || !result) {
  console.error("Missing required DOM elements: #evaluate, #response, or #result");
}

button.addEventListener("click", async function () {
  const responseText = textarea.value.trim();

  if (!responseText) {
    renderMessage("Please enter an AI response first.");
    return;
  }

  // Disable button to prevent duplicate requests
  button.disabled = true;
  const originalButtonText = button.textContent;
  button.textContent = "Evaluating...";

  // Show temporary UI
  renderMessage("Evaluating...");

  try {
    // Try calling the server endpoint first. If it fails, we'll fall back to a local evaluator.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let data;

    try {
      const res = await fetch("/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Evaluate this AI response for factual accuracy and truthfulness.",
          response: responseText,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Server returned non-2xx. Attempt to parse useful error info, otherwise fallback.
        try {
          const errData = await res.json();
          console.warn("Server error:", errData);
        } catch (e) {
          console.warn("Server returned non-JSON error, status:", res.status);
        }

        throw new Error("Server evaluation unavailable (status: " + res.status + ")");
      }

      // Parse JSON safely
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Invalid JSON from server");
      }

    } catch (networkErr) {
      // Network error, timeout, or server not present — fall back to local evaluator
      console.warn("Falling back to local evaluator:", networkErr.message);
      data = localEvaluate(responseText);
    }

    renderResult(data);
  } catch (err) {
    renderError(err.message || "Evaluation failed.");
  } finally {
    button.disabled = false;
    button.textContent = originalButtonText;
  }
});

function renderMessage(message) {
  result.innerHTML = "";
  const card = document.createElement("div");
  card.className = "score-card";
  const h2 = document.createElement("h2");
  h2.textContent = message;
  card.appendChild(h2);
  result.appendChild(card);
}

function renderError(message) {
  result.innerHTML = "";
  const card = document.createElement("div");
  card.className = "score-card";
  const h2 = document.createElement("h2");
  h2.textContent = "Something went wrong 😭";
  const p = document.createElement("p");
  p.textContent = message;
  card.appendChild(h2);
  card.appendChild(p);
  result.appendChild(card);
}

function renderResult(data) {
  // Ensure numeric bounds
  const overall = clampNumber(data.overall, 0, 100);
  const accuracy = clampNumber(data.accuracy, 0, 100);
  const clarity = clampNumber(data.clarity, 0, 100);
  const completeness = clampNumber(data.completeness, 0, 100);
  const feedback = Array.isArray(data.feedback) ? data.feedback : (data.feedback ? [String(data.feedback)] : []);

  result.innerHTML = "";
  const card = document.createElement("div");
  card.className = "score-card";

  const h2 = document.createElement("h2");
  h2.textContent = "Overall Score";
  card.appendChild(h2);

  const scoreNumber = document.createElement("div");
  scoreNumber.className = "score-number";
  scoreNumber.textContent = overall + "/100";
  card.appendChild(scoreNumber);

  const scoreBar = document.createElement("div");
  scoreBar.className = "score-bar";
  const scoreFill = document.createElement("div");
  scoreFill.className = "score-fill";
  scoreFill.style.width = overall + "%";
  scoreBar.appendChild(scoreFill);
  card.appendChild(scoreBar);

  const accP = document.createElement("p");
  accP.textContent = `🎯 Accuracy: ${accuracy}/100`;
  card.appendChild(accP);

  const clarityP = document.createElement("p");
  clarityP.textContent = `💡 Clarity: ${clarity}/100`;
  card.appendChild(clarityP);

  const compP = document.createElement("p");
  compP.textContent = `📚 Completeness: ${completeness}/100`;
  card.appendChild(compP);

  if (feedback.length) {
    const hr = document.createElement("hr");
    hr.style.opacity = "0.08";
    hr.style.margin = "18px 0";
    card.appendChild(hr);

    feedback.forEach((f) => {
      const fp = document.createElement("p");
      fp.textContent = f;
      card.appendChild(fp);
    });
  } else {
    const no = document.createElement("p");
    no.textContent = "No feedback available";
    card.appendChild(no);
  }

  result.appendChild(card);
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// A very small, deterministic local evaluator to provide usable results when no server is available.
function localEvaluate(text) {
  const len = text.length;
  // Basic heuristics — these are not a substitute for real evaluation, but keep the UI usable.
  const completeness = Math.min(100, Math.round((len / 1000) * 100));
  const clarity = Math.min(100, Math.round((Math.max(1, text.split(/[.!?]+/).filter(s => s.trim()).length) / 6) * 100));

  // Penalize for hedging/uncertainty words which may suggest low factual confidence
  const uncertainWords = ["might", "maybe", "could", "probably", "possibly", "seems", "suggests", "appear"]; 
  const lowered = text.toLowerCase();
  let uncertaintyScore = 100;
  uncertainWords.forEach(w => { if (lowered.includes(" " + w + " ") || lowered.startsWith(w + " ")) uncertaintyScore -= 8; });
  uncertaintyScore = clampNumber(uncertaintyScore, 10, 100);

  // Simple accuracy heuristic: looks for numbers, dates, or urls — presence doesn't guarantee accuracy but suggests claims
  const claims = (text.match(/\b\d{4}\b/g) || []).length + (text.match(/https?:\/\//g) || []).length;
  let accuracy = 80 - Math.min(40, claims * 8);
  accuracy = Math.round((accuracy * (uncertaintyScore / 100)));
  accuracy = clampNumber(accuracy, 10, 100);

  const overall = Math.round((accuracy + clarity + completeness) / 3);

  const feedback = [];
  if (completeness < 40) feedback.push("Response is short — it may be missing important details.");
  if (clarity < 50) feedback.push("The response is somewhat unclear — consider simplifying sentences.");
  if (accuracy < 60) feedback.push("The response contains uncertain language or many unstated claims; verify facts and sources.");
  if (feedback.length === 0) feedback.push("No major issues detected by the local evaluator. This is only a heuristic.");

  return {
    overall,
    accuracy,
    clarity,
    completeness,
    feedback,
  };
}
