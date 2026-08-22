// lib/evaluator.js
// Deterministic evaluator shared by server and tests.

function clampNumber(value, min = 0, max = 100) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function evaluate(responseText = "") {
  const text = String(responseText);
  const len = text.length;

  const completeness = Math.min(100, Math.round((len / 1000) * 100));
  const sentenceCount = Math.max(1, text.split(/[.!?]+/).filter(s => s.trim()).length);
  const clarity = Math.min(100, Math.round((sentenceCount / 6) * 100));

  const uncertainWords = ["might", "maybe", "could", "probably", "possibly", "seems", "suggests", "appear"];
  const lowered = text.toLowerCase();
  let uncertaintyScore = 100;
  uncertainWords.forEach(w => {
    if (lowered.includes(" " + w + " ") || lowered.startsWith(w + " ")) uncertaintyScore -= 8;
  });
  uncertaintyScore = clampNumber(uncertaintyScore, 10, 100);

  const claims = (text.match(/\b\d{4}\b/g) || []).length + (text.match(/https?:\/\//g) || []).length;
  let accuracy = 80 - Math.min(40, claims * 8);
  accuracy = Math.round((accuracy * (uncertaintyScore / 100)));
  accuracy = clampNumber(accuracy, 10, 100);

  const overall = Math.round((accuracy + clarity + completeness) / 3);

  const feedback = [];
  if (completeness < 40) feedback.push("Response is short — it may be missing important details.");
  if (clarity < 50) feedback.push("The response is somewhat unclear — consider simplifying sentences.");
  if (accuracy < 60) feedback.push("The response contains uncertain language or many unstated claims; verify facts and sources.");
  if (feedback.length === 0) feedback.push("No major issues detected by the evaluator. This is only a heuristic.");

  return {
    overall,
    accuracy,
    clarity,
    completeness,
    feedback,
  };
}

module.exports = { evaluate };
