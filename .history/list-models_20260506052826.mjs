import { config } from 'dotenv';
config();

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;

const res = await fetch(url);
const data = await res.json();

if (data.models) {
  console.log('Available models:');
  data.models.forEach(m => console.log(`  - ${m.name}`));
} else {
  console.error('Error:', data);
}
