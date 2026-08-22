const button = document.querySelector("#evaluate");
const textarea = document.querySelector("#response");

const result = document.createElement("div");
result.id = "result";
document.body.appendChild(result);

button.addEventListener("click", function () {
  const response = textarea.value.trim();

  let accuracy = 100;
  let clarity = 100;
  let completeness = 100;

  if (response === "") {
    result.textContent = "Please enter an AI response first.";
    return;
  }

  let feedback = [];

  if (
    response.toLowerCase().includes("london") &&
    response.toLowerCase().includes("capital of france")
  ) {
    accuracy -= 50;
    feedback.push("The response contains a factual error.");
  }

  if (response.length < 20) {
    clarity -= 20;
    feedback.push("The response is very short.");
  }

  if (response.length < 50) {
    completeness -= 20;
    feedback.push("The response may need more detail.");
  }

  if (feedback.length === 0) {
    feedback.push("The response looks good!");
  }

  const overall = Math.round(
    (accuracy + clarity + completeness) / 3
  );

  result.innerHTML =
    "<h2>Overall Score: " + overall + "/100</h2>" +
    "<p>Accuracy: " + accuracy + "/100</p>" +
    "<p>Clarity: " + clarity + "/100</p>" +
    "<p>Completeness: " + completeness + "/100</p>" +
    "<p>" + feedback.join("<br>") + "</p>";
});
