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

  let accuracy = 100;
  let clarity = 100;
  let completeness = 100;

  let feedback = [];

  const text = response.toLowerCase();


  // Detect obviously fake statements
  const falseClaims = [
    "earth is flat",
    "moon is made of cheese",
    "cats can fly",
    "water is dry",
    "sun is cold"
  ];

  falseClaims.forEach(claim => {
    if (text.includes(claim)) {
      accuracy -= 40;
      feedback.push(
        "⚠️ Possible false claim detected: " + claim
      );
    }
  });


  // Detect weak answers
  if (response.length < 30) {
    completeness -= 30;
    feedback.push(
      "⚠️ Answer is too short. Add more explanation."
    );
  }


  // Detect explanation quality
  if (
    !text.includes("because") &&
    !text.includes("since") &&
    response.length > 60
  ) {
    clarity -= 15;
    feedback.push(
      "💡 Consider explaining WHY your answer is true."
    );
  }


  // Detect uncertainty
  if (
    text.includes("maybe") ||
    text.includes("probably") ||
    text.includes("i think")
  ) {
    accuracy -= 10;
    feedback.push(
      "⚠️ Response shows uncertainty."
    );
  }


  accuracy = Math.max(0, accuracy);
  clarity = Math.max(0, clarity);
  completeness = Math.max(0, completeness);


  const overall = Math.round(
    (accuracy + clarity + completeness) / 3
  );


  if (feedback.length === 0) {
    feedback.push(
      "✅ Response looks strong."
    );
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

};
