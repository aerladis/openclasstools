/* ============================================
   Party Games – Express Server
   Serves static files + Gemini AI generation
   ============================================ */

import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8090;

const GEMINI_MODEL = 'gemini-2.5-flash';

// ---- Serve static files ----
app.use(express.static(__dirname));
app.use(express.json());

// ---- Helper: call Gemini ----
async function callGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
        throw new Error('GEMINI_API_KEY is not set in .env');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 4096
            }
        })
    });

    if (!response.ok) {
        const errBody = await response.text();
        console.error('Gemini API error:', errBody);
        throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ---- POST /api/generate (Who Am I? characters) ----
app.post('/api/generate', async (req, res) => {
    const { theme = 'iconic Turkish TV series characters', count = 50 } = req.body;

    const prompt = `Generate a list of EXACTLY ${count} well-known ${theme}. 
Return ONLY the character names, one per line, no numbering, no extra text, no explanations.`;

    try {
        const text = await callGemini(prompt);

        const names = text
            .split('\n')
            .map(l => l.replace(/^\d+[\.\)\-]\s*/, '').trim())
            .filter(l => l && !l.startsWith('---') && !l.startsWith('**'));

        const listContent = names.join('\n') + '\n';
        fs.writeFileSync(path.join(__dirname, 'list.txt'), listContent, 'utf-8');

        res.json({ success: true, count: names.length, characters: names });
    } catch (err) {
        console.error('Generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---- POST /api/generate-taboo (Taboo cards) ----
app.post('/api/generate-taboo', async (req, res) => {
    const { theme = 'general knowledge and pop culture', count = 30 } = req.body;

    const prompt = `Generate EXACTLY ${count} Taboo game cards about "${theme}".
For each card, provide a main word and exactly 5 forbidden words.
Return ONLY valid JSON — an array of objects with "word" and "forbidden" keys.
Example format:
[{"word":"Pizza","forbidden":["Cheese","Italian","Slice","Dough","Oven"]}]
No markdown, no code fences, no explanation — just the JSON array.`;

    try {
        let text = await callGemini(prompt);

        // Strip markdown code fences if present
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        const cards = JSON.parse(text);

        if (!Array.isArray(cards) || cards.length === 0) {
            throw new Error('Invalid response format');
        }

        // Validate structure
        const validCards = cards.filter(c =>
            c.word && Array.isArray(c.forbidden) && c.forbidden.length >= 3
        );

        res.json({ success: true, count: validCards.length, cards: validCards });
    } catch (err) {
        console.error('Taboo generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---- POST /api/generate-hangman (Hangman words) ----
app.post('/api/generate-hangman', async (req, res) => {
    const { theme = 'common English words', count = 20 } = req.body;

    const prompt = `Generate a list of EXACTLY ${count} words for a Hangman game about "${theme}".
Each word should be between 4 and 10 letters long.
Return ONLY the words, one per line, no numbering, no extra text, no explanations.`;

    try {
        const text = await callGemini(prompt);

        const words = text
            .split('\n')
            .map(l => l.trim().toUpperCase())
            .filter(l => l.length >= 4 && l.length <= 10 && /^[A-Z]+$/.test(l)); // Filter for valid word length and characters

        res.json({ success: true, count: words.length, words: words });
    } catch (err) {
        console.error('Hangman generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🎮 BerkAI Game Hub running → http://localhost:${PORT}`);
});
