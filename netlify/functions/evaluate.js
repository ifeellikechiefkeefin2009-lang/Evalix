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
  let clarity = 100;
  let completeness = 100;

  let feedback = [];


  // IMPOSSIBLE / FALSE CLAIM DETECTOR

  const falseClaims = [
    "moon is made of cheese",
    "cats can fly",
    "earth is flat",
    "sun is cold",
    "water is dry",
    "humans can breathe underwater without equipment",
    "gravity does not exist",
    "the earth is the center of the universe"
  ];


  falseClaims.forEach(claim => {

    if (text.includes(claim)) {

      accuracy -= 70;

      feedback.push(
        "❌ False or impossible claim detected: " + claim
      );

    }

  });



  // ABSURD COMBINATION DETECTOR

  const absurdWords = [
    "magic",
    "teleport",
    "unicorn",
    "dragon",
    "time travel",
    "invisible"
  ];


  let absurdCount = 0;

  absurdWords.forEach(word => {

    if (text.includes(word)) {
      absurdCount++;
    }

  });


  if (absurdCount >= 2) {

    accuracy -= 40;

    feedback.push(
      "❌ Response contains multiple unrealistic concepts."
    );

  }



  // TOO SHORT

  if (response.length < 40) {

    completeness -= 35;

    feedback.push(
      "⚠️ Answer needs more explanation."
    );

  }



  // NO REASONING

  if (
    response.length > 80 &&
    !text.includes("because") &&
    !text.includes("since") &&
    !text.includes("therefore")
  ) {

    clarity -= 20;

    feedback.push(
      "💡 Add reasoning or evidence to support the answer."
    );

  }



  // RANDOM / NONSENSE DETECTOR

  const words = text.split(" ");

  const uniqueWords = new Set(words);

  if (words.length > 10 &&
      uniqueWords.size / words.length < 0.4) {

    clarity -= 30;

    feedback.push(
      "⚠️ Response may contain repetitive or unclear wording."
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
      "✅ Response appears reasonable."
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
