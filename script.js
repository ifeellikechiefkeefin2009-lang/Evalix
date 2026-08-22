const button = document.querySelector("#evaluate");
const textarea = document.querySelector("#response");

const result = document.createElement("div");
result.id = "result";
document.body.appendChild(result);

button.addEventListener("click", function () {
  const response = textarea.value.trim();

  if (response === "") {
    result.innerHTML = `
      <div class="score-card">
        <h2>Please enter an AI response first.</h2>
      </div>
    `;
    return;
  }

  // Starting scores
  let accuracy = 100;
  let clarity = 100;
  let completeness = 100;

  let feedback = [];

  // ACCURACY CHECK
  if (
    response.toLowerCase().includes("london") &&
    response.toLowerCase().includes("capital of france")
  ) {
    accuracy -= 50;
    feedback.push("⚠️ Possible factual error detected.");
  }

  // CLARITY CHECK
  if (response.length < 20) {
    clarity -= 30;
    feedback.push("⚠️ The response is very short.");
  }

  // COMPLETENESS CHECK
  if (response.length < 50) {
    completeness -= 20;
    feedback.push("⚠️ The response could use more detail.");
  }

  // Keep scores between 0 and 100
  accuracy = Math.max(0, accuracy);
  clarity = Math.max(0, clarity);
  completeness = Math.max(0, completeness);

  // Overall score
  const overall = Math.round(
    (accuracy + clarity + completeness) / 3
  );

  // If there are no problems
  if (feedback.length === 0) {
    feedback.push("✅ No obvious problems detected.");
  }

  // Display results
  result.innerHTML = `
    <div class="score-card">

      <h2>Overall Score</h2>

      <div class="score-number">
        ${overall}/100
      </div>

      <div class="score-bar">
        <div 
          class="score-fill" 
          style="width: ${overall}%">
        </div>
      </div>

      <p>🎯 Accuracy: ${accuracy}/100</p>

      <p>💡 Clarity: ${clarity}/100</p>

      <p>📚 Completeness: ${completeness}/100</p>

      <p>${feedback.join("<br><br>")}</p>

    </div>
  `;
});
