const LEMONADE_BASE_URL = process.env.LEMONADE_BASE_URL || 'http://localhost:8000';
const LEMONADE_MODEL_NAME = process.env.LEMONADE_MODEL_NAME || 'Qwen3-VL-4B-Instruct-GGUF';

export interface LemonadeResponse {
  explanation: string;
  model_used: string;
}

/**
 * Calls Lemonade API to rephrase the explanation in friendly language.
 * REQUIRED: Throws error if VLM call fails - no fallback.
 */
export async function enhanceExplanation(
  originalExplanation: string
): Promise<LemonadeResponse> {
  const endpoint = `${LEMONADE_BASE_URL}/v1/chat/completions`;

  const prompt = `Rewrite this explanation in one clear sentence for a user: ${originalExplanation}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LEMONADE_MODEL_NAME,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Lemonade API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const enhancedExplanation = data.choices?.[0]?.message?.content?.trim();

  if (!enhancedExplanation) {
    throw new Error('Lemonade API returned empty response');
  }

  return {
    explanation: enhancedExplanation,
    model_used: LEMONADE_MODEL_NAME,
  };
}

