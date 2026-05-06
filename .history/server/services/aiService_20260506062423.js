
/**
 * server/services/aiService.js
 *
 * Gemini API integration (free-tier friendly)
 * Model: gemini-1.5-flash
 */

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

const MAX_INPUT_CHARS = 12000;
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Prompt template (unified — more reliable than systemInstruction)
 */
function buildPrompt({ title, text }) {
  return `
You are a webpage summarization assistant.

Return ONLY a valid JSON object (no markdown, no code fences, no extra text):

{
  "bullets": ["...", "..."],
  "insights": ["...", "..."],
  "readingTime": number
}

Rules:
- bullets: 4–6 key points, each under 120 characters
- insights: 2–4 key observations, each under 120 characters
- readingTime: estimated minutes (integer >= 1)
- Be concise, factual, and avoid repetition

Title: ${title}

Content:
${text}
`.trim();
}

/**
 * Safely truncate large content
 */
function truncateText(text) {
  if (!text) return '';
  return text.length > MAX_INPUT_CHARS
    ? text.slice(0, MAX_INPUT_CHARS)
    : text;
}

/**
 * Parse Gemini response safely
 */
function parseGeminiResponse(rawText) {
  if (!rawText) {
    throw new Error('Empty response from Gemini');
  }

  let parsed;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    // محاولة تنظيف الرد (fallback)
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Invalid JSON from Gemini: ${rawText.slice(0, 150)}`);
    }
  }

  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.map(String)
    : [];

  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.map(String)
    : [];

  const readingTime =
    typeof parsed.readingTime === 'number'
      ? Math.max(1, parsed.readingTime)
      : 1;

  if (!bullets.length || !insights.length) {
    throw new Error('Gemini returned incomplete summary structure');
  }

  return { bullets, insights, readingTime };
}

/**
 * Main summarization function
 */
export async function summarizePage({ text, title }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  if (!text || text.length < 100) {
    throw new Error('Content too short to summarize');
  }

  const safeText = truncateText(text);

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildPrompt({ title, text: safeText }),
          },
        ],
      },
    ],
    generation_config: {
      temperature: 0.3,
      max_output_tokens: 1024,
      response_mime_type: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('Gemini request timed out');
    }

    throw new Error(`Network error: ${err.message}`);
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error('Gemini API error:', errorBody);

    throw new Error(
      `Gemini API error ${response.status}: ${errorBody.slice(0, 200)}`
    );
  }

  const data = await response.json();

  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return parseGeminiResponse(rawText);
}
