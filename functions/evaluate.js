import { GoogleGenAI, Type } from "@google/genai";

export async function onRequest(context) {
  try {
    const ai = new GoogleGenAI({
      apiKey: context.env.GEMINI_API_KEY
    });

    const data = await context.request.json().catch(() => ({}));

    const {
      prompt = "Evaluate this AI response for factual accuracy and truthfulness.",
      response,
      referenceContext
    } = data;

    if (!response) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: 'response'."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        accuracy: {
          type: Type.INTEGER,
          description: "Factual correctness from 0-100."
        },
        reasoning: {
          type: Type.INTEGER,
          description: "Logical reasoning quality from 0-100."
        },
        clarity: {
          type: Type.INTEGER,
          description: "Clarity and readability from 0-100."
        },
        completeness: {
          type: Type.INTEGER,
          description: "How completely the response answers the prompt from 0-100."
        },
        overall: {
          type: Type.INTEGER,
          description: "Overall score from 0-100."
        },
        hasHallucinations: {
          type: Type.BOOLEAN,
          description: "Whether the response contains hallucinations."
        },
        hallucinations: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        logicalFlaws: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        feedback: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        improvements: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      },
      required: [
        "accuracy",
        "reasoning",
        "clarity",
        "completeness",
        "overall",
        "hasHallucinations",
        "hallucinations",
        "logicalFlaws",
        "feedback",
        "improvements"
      ]
    };

    const systemInstruction = `
You are Evalix, an extremely rigorous AI evaluation system.

Your primary goal is to detect false claims, hallucinations,
logical errors, and misleading information.

IMPORTANT:
- Do not reward an answer simply because it sounds confident.
- A confidently false answer should receive a very low accuracy score.
- Do not use response length as a substitute for accuracy.
- Judge the actual factual content.
- If the response directly contradicts known facts, accuracy should be very low.
- If the response is nonsense or fabricated, accuracy should generally be below 30.
- If hallucinations are detected, accuracy must be below 50.

Scoring:

90-100 = Excellent
70-89 = Good
40-69 = Problematic
1-39 = Seriously flawed
0 = Completely false, dangerous, or unrelated

Accuracy is the most important factor.

Overall weighting:
Accuracy 40%
Reasoning 30%
Completeness 20%
Clarity 10%
`;

    const userPrompt = `
Evaluate this AI response.

USER PROMPT:
${prompt}

${
  referenceContext
    ? `GROUND TRUTH / REFERENCE:
${referenceContext}`
    : "No ground truth was provided. Use established factual knowledge."
}

AI RESPONSE:
${response}

Evaluate the response based on factual correctness, reasoning,
completeness, and clarity.

Be especially strict about hallucinations and fabricated explanations.
`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
        temperature: 0.1
      }
    });

    const evaluationResult = JSON.parse(result.text);

    if (
      evaluationResult.hasHallucinations &&
      evaluationResult.hallucinations.length > 0
    ) {
      evaluationResult.accuracy = Math.min(
        evaluationResult.accuracy,
        30
      );
    }

    if (
      evaluationResult.logicalFlaws &&
      evaluationResult.logicalFlaws.length > 0
    ) {
      evaluationResult.reasoning = Math.min(
        evaluationResult.reasoning,
        50
      );
    }

    evaluationResult.overall = Math.round(
      evaluationResult.accuracy * 0.4 +
      evaluationResult.reasoning * 0.3 +
      evaluationResult.completeness * 0.2 +
      evaluationResult.clarity * 0.1
    );

    return new Response(
      JSON.stringify(evaluationResult),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("Evalix Evaluation Failed:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process evaluation.",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
