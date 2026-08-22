const button = document.querySelector("#evaluate");
const textarea = document.querySelector("#response");
const result = document.querySelector("#result");

button.addEventListener("click", async function () {
  const response = textarea.value.trim();

  if (!response) {
    result.innerHTML = `
      <div class="score-card">
        <h2>Please enter an AI response first.</h2>
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="score-card">
      <h2>Evaluating...</h2>
    </div>
  `;

  try {
    const request = await fetch("/.netlify/functions/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        response: response
      })
    });

    const data = await request.json();

    if (!request.ok) {
      throw new Error(data.error || "Evaluation failed.");
    }

    result.innerHTML = `
      <div class="score-card">

        <h2>Overall Score</h2>

        <div class="score-number">
          ${data.overall}/100
        </div>

        <div class="score-bar">
          <div
            class="score-fill"
            style="width: ${data.overall}%">
          </div>
        </div>

        <p>🎯 Accuracy: ${data.accuracy}/100</p>

        <p>💡 Clarity: ${data.clarity}/100</p>

        <p>📚 Completeness: ${data.completeness}/100</p>

        <p>
          ${data.feedback.join("<br><br>")}
        </p>

      </div>
    `;

  } catch (error) {
    result.innerHTML = `
      <div class="score-card">
        <h2>Something went wrong 😭</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
});
