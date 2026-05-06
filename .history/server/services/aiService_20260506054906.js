/**
 * server/services/aiService.js
 *
 * Calls the Google Gemini API using the key stored in GEMINI_API_KEY.
 * Uses gemini-1.5-flash — fast, accurate, and available on the free tier.
 * No SDK required — plain fetch to the REST endpoint.
 *
 * Free tier: https://aistudio.google.com/app/apikey
 */

const GEMINI_MODEL    = 'gemini-1.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

/**
 * System instruction that forces the model to return strict JSON.
 */
const SYSTEM_INSTRUCTION = `
You are a webpage summarization assistant. 
Given a page title and its text content, respond ONLY with a valid JSON object 
(no markdown, no code fences, no extra text) in this exact shape:
{
  "bullets":     ["...", "..."],
  "insights":    ["...", "..."],
  "readingTime": <number>
}
Rules:
- bullets: 4–6 key points, each a single complete sentence under 120 chars.
- insights: 2–4 notable observations or takeaways, each under 120 chars.
- readingTime: estimated minutes to read the full article (integer >= 1).
- Output ONLY the JSON object. Nothing else.
`.trim();

/**
 * Summarize page content via Gemini.
 *
 * @param {{ text: string, title: string }} pageContent
 * @returns {Promise<{ bullets: string[], insights: string[], readingTime: number }>}
 */
export async function summarizePage({ text, title }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Title: ${title}\n\nContent:\n${text}`,
          },
        ],
      },
    ],
    generation_config: {
      temperature:      0.3,
      max_output_tokens: 1024,
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data    = await response.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!rawJson) {
    throw new Error('Gemini returned an empty response.');
  }

  // Parse — Gemini with responseMimeType:application/json returns clean JSON
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    // Fallback: strip any accidental markdown fences
    const cleaned = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Gemini returned non-JSON: ${rawJson.slice(0, 120)}`);
    }
  }

  const bullets     = Array.isArray(parsed.bullets)  ? parsed.bullets.map(String)  : [];
  const insights    = Array.isArray(parsed.insights) ? parsed.insights.map(String) : [];
  const readingTime = typeof parsed.readingTime === 'number' ? Math.max(1, parsed.readingTime) : 1;

  return { bullets, insights, readingTime };
}
