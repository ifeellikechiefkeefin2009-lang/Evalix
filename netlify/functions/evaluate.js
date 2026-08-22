import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const handler = async (event) => {
  const data = JSON.parse(event.body || "{}");
  const { prompt, response, referenceContext } = data;

  if (!prompt || !response) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields: 'prompt' and 'response'." })
    };
  }

  // Define the output schema for structured evaluation
  const evaluationSchema = {
    type: Type.OBJECT,
    properties: {
      accuracy: { type: Type.INTEGER, description: "Score 0-100 based on factual correctness against reference or common ground truth." },
      reasoning: { type: Type.INTEGER, description: "Score 0-100 evaluating logical coherence, depth, and step-by-step justification." },
      clarity: { type: Type.INTEGER, description: "Score 0-100 evaluating formatting, readability, tone, and conciseness." },
      completeness: { type: Type.INTEGER, description: "Score 0-100 measuring if all user prompt sub-questions were addressed." },
      overall: { type: Type.INTEGER, description: "Weighted average score (Accuracy: 40%, Reasoning: 30%, Completeness: 20%, Clarity: 10%)." },
      feedback: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of constructive feedback points or flagged issues."
      },
      improvements: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Actionable suggestions to improve the response."
      }
    },
    required: ["accuracy", "reasoning", "clarity", "completeness", "overall", "feedback", "improvements"]
  };

  const systemInstruction = `You are Evalix, an expert LLM Evaluator engine.
Evaluate the provided output based on the user prompt and optional reference ground-truth text.
Be strict, objective, and unbiased. Ensure output scores strictly follow the provided schema rules.`;

  const userPrompt = `
USER PROMPT: ${prompt}
${referenceContext ? `REFERENCE GROUND TRUTH: ${referenceContext}` : ""}
RESPONSE TO EVALUATE: ${response}
`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
        temperature: 0.1 // Low temperature ensures consistent, deterministic scoring
      }
    });

    const evaluationResult = JSON.parse(result.text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evaluationResult)
    };
  } catch (error) {
    console.error("Evalix Evaluation Failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process evaluation." })
    };
  }
};
