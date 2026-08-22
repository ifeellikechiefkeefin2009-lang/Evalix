exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Only POST requests are allowed."
      })
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const response = (data.response || "").trim();

    if (!response) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "No response was provided."
        })
      };
    }

    const text = response.toLowerCase();

    let accuracy = 100;
    let clarity = 100;
    let completeness = 100;
    const feedback = [];

    // Basic factual-error detection
    if (
      text.includes("capital of france") &&
      text.includes("london")
    ) {
      accuracy -= 50;
      feedback.push("Possible factual error: London is not the capital of France.");
    }

    // Clarity
    if (response.length < 20) {
      clarity -= 30;
      feedback.push("The response is very short and may need more explanation.");
    }

    // Completeness
    if (response.length < 50) {
      completeness -= 20;
      feedback.push("The response could use more detail.");
    }

    // Avoid scores below zero
    accuracy = Math.max(0, accuracy);
    clarity = Math.max(0, clarity);
    completeness = Math.max(0, completeness);

    const overall = Math.round(
      (accuracy + clarity + completeness) / 3
    );

    if (feedback.length === 0) {
      feedback.push("No obvious problems were detected.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        overall,
        accuracy,
        clarity,
        completeness,
        feedback
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Evalix could not evaluate the response."
      })
    };
  }
};
