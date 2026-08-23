import { GoogleGenAI, Type } from "@google/genai";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle the evaluator endpoint
    if (url.pathname === "/evaluate" && request.method === "POST") {
      try {
        const data = await request.json();

        const response = (data.response || "").trim();
        const prompt =
          data.prompt ||
          "Evaluate this AI response for factual accuracy and truthfulness.";

        if (!response) {
          return Response.json(
            { error: "Missing response." },
            { status: 400 }
          );
        }

        const ai = new GoogleGenAI({
          apiKey: env.GEMINI_API_KEY
        });

        const evaluationSchema = {
          type: Type.OBJECT,
          properties: {
            accuracy: { type: Type.INTEGER },
            reasoning: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            completeness: { type: Type.INTEGER },
            overall: { type: Type.INTEGER },
            hasHallucinations: { type: Type.BOOLEAN },
            hallucinations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            logicalFlaws: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            feedback: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
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

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `
Evaluate this AI response.

USER PROMPT:
${prompt}

AI RESPONSE:
${response}

Be extremely strict about factual accuracy.

A confidently false answer should receive a very low accuracy score.
Do NOT reward an answer simply because it is long or well-written.
If the answer contains a clear hallucination, accuracy should be below 30.
`,
          config: {
            responseMimeType: "application/json",
            responseSchema: evaluationSchema,
            temperature: 0.1
          }
        });

        const evaluation = JSON.parse(result.text);

        // Hard safety check against obviously hallucinated answers.
        if (
          evaluation.hasHallucinations &&
          evaluation.hallucinations.length > 0
        ) {
          evaluation.accuracy = Math.min(
            evaluation.accuracy,
            30
          );
        }

        // Calculate overall ourselves.
        evaluation.overall = Math.round(
          evaluation.accuracy * 0.4 +
          evaluation.reasoning * 0.3 +
          evaluation.completeness * 0.2 +
          evaluation.clarity * 0.1
        );

        return Response.json(evaluation);
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            error: "Evaluation failed.",
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    // Serve the rest of your website normally.
    return env.ASSETS.fetch(request);
  }
};
