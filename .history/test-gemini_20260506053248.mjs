// Full summarize pipeline test with correct model
import { config } from 'dotenv';
config();

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Title: AI Test\n\nContent: Artificial intelligence is transforming how we work and live. Machine learning models enable computers to recognize patterns in vast datasets. Natural language processing allows machines to understand and generate human language. These technologies are being applied in healthcare, finance, and education.' }] }],
    system_instruction: { parts: [{ text: 'Respond ONLY with valid JSON: {"bullets":["..."],"insights":["..."],"readingTime":1}' }] },
    generationConfig: { temperature: 0.3, maxOutputTokens: 512, responseMimeType: 'application/json' },
  }),
});

console.log('Status:', res.status);
const data = await res.json();
if (data.error) { console.error('Error:', data.error); process.exit(1); }
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
console.log('Response:', text);
console.log('✅ Gemini 1.5 flash working!');
