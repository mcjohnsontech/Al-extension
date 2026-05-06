/**
 * server/services/aiService.js
 *
 * Claude API integration via Anthropic SDK
 * Model: claude-opus-4-7 (most capable, recommended)
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = 'claude-opus-4-7';
const MAX_INPUT_CHARS = 12000;
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Build the system prompt and user message
 */
function buildSystemPrompt() {
  return `You are a webpage summarization assistant. Your task is to analyze web content and extract key information.

Always respond with ONLY a valid JSON object (no markdown, no code fences, no extra text):

{
  "bullets": ["...", "..."],
  "insights": ["...", "..."],
  "readingTime": number
}

Guidelines:
- bullets: 4–6 key points, each under 120 characters
- insights: 2–4 unique takeaways or observations, each under 120 characters
- readingTime: estimated reading time in minutes (integer >= 1)
- Be concise, factual, and avoid repetition
- Focus on actionable and important information`;
}

function buildUserMessage({ title, text }) {
  return `Summarize this webpage:

Title: ${title}

Content:
${text}`;
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
 * Extract JSON from text by finding matching braces
 */
function extractJSON(text) {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let braceCount = 0;
  let inString = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';

    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return text.slice(startIdx, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Parse Claude response safely
 */
function parseClaudeResponse(rawText) {
  if (!rawText) {
    throw new Error('Empty response from Claude');
  }

  let parsed;
  let cleaned = rawText.trim();

  // Strategy 1: Direct parse
  try {
    parsed = JSON.parse(cleaned);
    return extractFields(parsed);
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Remove markdown code blocks
  const withoutMarkdown = cleaned
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  try {
    parsed = JSON.parse(withoutMarkdown);
    return extractFields(parsed);
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 3: Extract JSON using brace matching
  const jsonStr = extractJSON(withoutMarkdown);
  if (jsonStr) {
    try {
      parsed = JSON.parse(jsonStr);
      return extractFields(parsed);
    } catch (e) {
      // Continue to fallback
    }
  }

  console.error('Failed to parse Claude response:', rawText.slice(0, 300));
  throw new Error(`Invalid JSON response from Claude: ${rawText.slice(0, 150)}`);
}

/**
 * Extract and validate fields from parsed JSON
 */
function extractFields(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Parsed response is not an object');
  }

  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.map(String).filter(Boolean)
    : [];

  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.map(String).filter(Boolean)
    : [];

  const readingTime =
    typeof parsed.readingTime === 'number'
      ? Math.max(1, Math.round(parsed.readingTime))
      : 1;

  return {
    bullets: bullets.length > 0 ? bullets : ['Summary generated - please review on the page'],
    insights: insights.length > 0 ? insights : ['Content summarization in progress'],
    readingTime,
  };
}

/**
 * Main summarization function using Claude API
 */
export async function summarizePage({ text, title }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  if (!text || text.length < 100) {
    throw new Error('Content too short to summarize');
  }

  const client = new Anthropic({ apiKey });
  const safeText = truncateText(text);

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserMessage({ title, text: safeText }),
        },
      ],
    }, {
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (response.stop_reason !== 'end_turn') {
      throw new Error(`Unexpected stop reason: ${response.stop_reason}`);
    }

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const rawText = textBlock.text;
    console.log('[Claude Response Length]', rawText.length, 'chars');
    console.log('[First 100 chars]', rawText.slice(0, 100));

    return parseClaudeResponse(rawText);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Claude API error:', err.message);
      throw new Error(`Claude API error: ${err.message}`);
    }
    throw err;
  }
}
