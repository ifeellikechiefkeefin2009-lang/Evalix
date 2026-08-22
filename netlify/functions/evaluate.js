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
      accuracy: { type: Type.INTEGER, description: "Score 0-100 based on factual correctness. Penalize hallucinations, false claims, and logical inconsistencies heavily." },
      reasoning: { type: Type.INTEGER, description: "Score 0-100 evaluating logical coherence, depth, and step-by-step justification. Deduct for circular logic or unsupported leaps." },
      clarity: { type: Type.INTEGER, description: "Score 0-100 evaluating formatting, readability, tone, and conciseness." },
      completeness: { type: Type.INTEGER, description: "Score 0-100 measuring if all user prompt sub-questions were addressed." },
      overall: { type: Type.INTEGER, description: "Weighted average score (Accuracy: 40%, Reasoning: 30%, Completeness: 20%, Clarity: 10%)." },
      hasHallucinations: { type: Type.BOOLEAN, description: "True if the response contains made-up facts, false claims, or unverifiable assertions presented as fact." },
      hallucinations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of specific false claims, made-up facts, or hallucinations detected in the response."
      },
      logicalFlaws: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of logical fallacies, circular reasoning, or unsupported leaps in the response."
      },
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
    required: ["accuracy", "reasoning", "clarity", "completeness", "overall", "hasHallucinations", "hallucinations", "logicalFlaws", "feedback", "improvements"]
  };

  const systemInstruction = `You are Evalix, an EXTREMELY RIGOROUS AI evaluation system. Your purpose is to catch false, misleading, and hallucinated content.

YOUR PRIMARY GOAL: Detect and penalize HALLUCINATIONS, FALSE CLAIMS, and LOGICAL FALLACIES.

Scoring rules:

90-100: Excellent
- Factually accurate and verifiable
- Logically sound with clear reasoning
- Complete and well-structured
- No hallucinations or false claims

70-89: Good
- Mostly accurate with 1-2 minor factual issues
- Generally sound logic with minor gaps
- Addresses most of the prompt
- No significant hallucinations

40-69: Problematic
- Multiple factual errors OR unverifiable claims presented as fact
- Logical flaws or unsupported leaps
- Incomplete or confusing structure
- Some hallucinations or misleading statements

1-39: Seriously Flawed
- Multiple false claims, hallucinations, or contradictions
- Poor logical structure or reasoning
- Fails to address the prompt
- Contains misleading or dangerous misinformation

0: Completely False or Dangerous
- Entirely fabricated or hallucinated
- Contains dangerous misinformation
- Unrelated to the prompt
- Intentionally misleading

CRITICAL EVALUATION RULES:
1. DO NOT reward clear writing if the content is false. A well-written lie is still a lie.
2. Flag ANY unverifiable claims presented with certainty as potential hallucinations.
3. Check for logical consistency: do all parts of the response support each other?
4. If ground truth is provided, check EVERY claim against it. Mismatches = major deductions.
5. Penalize confident false answers MORE than uncertain correct answers.
6. Accuracy weight: 40% of overall score. If accuracy is low (below 30), overall cannot exceed 50.
7. If you detect hallucinations or false claims, accuracy MUST be below 50.
8. Reasoning score must reflect whether the logic supports the conclusion, not just clarity.`;

  const userPrompt = `
TASK: Evaluate this AI response for accuracy, reasoning, and truthfulness.

USER PROMPT: ${prompt}
${referenceContext ? `\nGROUND TRUTH / REFERENCE MATERIAL:\n${referenceContext}` : "\nNOTE: No ground truth provided. Evaluate based on factual accuracy and logical consistency."}

RESPONSE TO EVALUATE:
${response}

EVALUATION INSTRUCTIONS:
1. Identify any false claims, hallucinations, or unverifiable assertions.
2. Check logical consistency and soundness of reasoning.
3. Flag confidence in false information as a MAJOR issue.
4. Do not score based on writing quality alone; prioritize accuracy.
5. If you detect lies or hallucinations, the accuracy score must reflect this (below 50).
`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
        temperature: 0.1 // Low temperature for consistent, strict evaluation
      }
    });

    const evaluationResult = JSON.parse(result.text);

    // ENFORCE hard constraints post-processing
    // If hallucinations detected, accuracy cannot be high
    if (evaluationResult.hasHallucinations && evaluationResult.hallucinations.length > 0) {
      if (evaluationResult.accuracy > 45) {
        evaluationResult.accuracy = Math.max(20, evaluationResult.accuracy - 30);
      }
    }

    // If logical flaws detected, reasoning score must be penalized
    if (evaluationResult.logicalFlaws && evaluationResult.logicalFlaws.length > 0) {
      if (evaluationResult.reasoning > 50) {
        evaluationResult.reasoning = Math.max(20, evaluationResult.reasoning - 25);
      }
    }

    // Recalculate overall with accuracy weighting
    evaluationResult.overall = Math.round(
      (evaluationResult.accuracy * 0.4) +
      (evaluationResult.reasoning * 0.3) +
      (evaluationResult.completeness * 0.2) +
      (evaluationResult.clarity * 0.1)
    );

    // Hard cap: if accuracy is critically low, overall cannot be high
    if (evaluationResult.accuracy < 30) {
      evaluationResult.overall = Math.min(evaluationResult.overall, 40);
    }

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
