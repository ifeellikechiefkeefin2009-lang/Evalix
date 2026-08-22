exports.handler = async function (event) {

  const data = JSON.parse(event.body || "{}");
  const response = (data.response || "").trim();

  if (!response) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "No response provided."
      })
    };
  }


  const text = response.toLowerCase();

  let accuracy = 100;
  let reasoning = 100;
  let clarity = 100;
  let completeness = 100;

  let feedback = [];
  let improvements = [];


  // Detect obvious misinformation

  const badClaims = [
    "moon is made of cheese",
    "earth is flat",
    "cats can fly",
    "sun is cold",
    "water is dry",
    "gravity does not exist"
  ];


  badClaims.forEach(claim => {

    if (text.includes(claim)) {

      accuracy -= 70;

      feedback.push(
        "❌ Possible false information: " + claim
      );

      improvements.push(
        "Replace unsupported claims with verified information."
      );

    }

  });



  // Reasoning check

  if (
    response.length > 80 &&
    !text.includes("because") &&
    !text.includes("since") &&
    !text.includes("therefore")
  ) {

    reasoning -= 25;

    feedback.push(
      "⚠️ The answer gives information but little reasoning."
    );

    improvements.push(
      "Explain why the answer is correct."
    );

  }



  // Clarity check

  if (response.length < 40) {

    clarity -= 30;

    feedback.push(
      "⚠️ The answer is too short."
    );

    improvements.push(
      "Add more details and examples."
    );

  }



  // Completeness check

  if (response.length < 100) {

    completeness -= 20;

    feedback.push(
      "⚠️ More supporting details would improve this answer."
    );

  }



  // Positive feedback

  if (feedback.length === 0) {

    feedback.push(
      "✅ Answer appears clear and reasonable."
    );

  }



  accuracy = Math.max(0, accuracy);
  reasoning = Math.max(0, reasoning);
  clarity = Math.max(0, clarity);
  completeness = Math.max(0, completeness);



  const overall = Math.round(
    (accuracy + reasoning + clarity + completeness) / 4
  );


  return {

    statusCode: 200,

    body: JSON.stringify({

      overall,

      scores: {
        accuracy,
        reasoning,
        clarity,
        completeness
      },

      feedback,

      improvements

    })

  };

};
