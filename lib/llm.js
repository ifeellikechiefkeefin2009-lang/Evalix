const fetch = global.fetch;

async function evaluateWithOpenAI(responseText) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const systemPrompt = `You are Evalix, a service that evaluates AI-generated responses. Your job is to return a JSON object ONLY with the following fields: overall, accuracy, clarity, completeness (all numbers 0-100), and feedback (an array of short strings). Do not include any extra text or explanation.`;

  const userPrompt = `Evaluate this AI response for factual accuracy, clarity, and completeness. Return JSON only. Response:\n\n"""\n${responseText}\n"""`;

  const body = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0,
    max_tokens: 500
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const assistant = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!assistant) throw new Error('OpenAI returned no assistant content');

  let parsed;
  try {
    parsed = JSON.parse(assistant);
  } catch (e) {
    // Try to extract JSON substring
    const match = assistant.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (e2) {
        throw new Error('Failed to parse JSON from OpenAI response');
      }
    } else {
      throw new Error('OpenAI response not JSON');
    }
  }

  // Validate and normalize fields
  const clamp = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const result = {
    overall: clamp(parsed.overall),
    accuracy: clamp(parsed.accuracy),
    clarity: clamp(parsed.clarity),
    completeness: clamp(parsed.completeness),
    feedback: Array.isArray(parsed.feedback) ? parsed.feedback.map(String) : (parsed.feedback ? [String(parsed.feedback)] : [])
  };

  return result;
}

module.exports = { evaluateWithOpenAI };
