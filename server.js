/* ============================================
   Party Games – Express Server (Secure)
   Serves static files + AI-powered game generation
   ============================================ */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Security: Configure CORS
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            "http://localhost:8090",
            "http://play.metrix.dpdns.org",
            "https://play.metrix.dpdns.org"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 8090;

// ============================================
// AI Provider: auto-detect Gemini (free) or OpenAI
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

function getProvider() {
    if (GEMINI_API_KEY && GEMINI_API_KEY.length > 10 && GEMINI_API_KEY !== 'your-api-key-here') {
        return 'gemini';
    }
    if (OPENAI_API_KEY && OPENAI_API_KEY.length > 10 && OPENAI_API_KEY !== 'your-api-key-here') {
        return 'openai';
    }
    return null;
}

const AI_PROVIDER = getProvider();


function createTraceId(prefix = 'req') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeError(err) {
    if (!err) return { message: 'Unknown error' };

    return {
        name: err.name,
        message: err.message,
        code: err.code,
        status: err.status,
        stack: err.stack
    };
}

// ============================================
// Security Middleware
// ============================================

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// Rate limiting middleware
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests
const RATE_WINDOW = 60 * 1000; // 1 minute

function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    } else {
        const data = requestCounts.get(ip);
        if (now > data.resetTime) {
            data.count = 1;
            data.resetTime = now + RATE_WINDOW;
        } else {
            data.count++;
        }
        
        if (data.count > RATE_LIMIT) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
    }
    next();
}

app.use(rateLimitMiddleware);

// Request size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// Session Tracking
// ============================================

const activeGames = new Map(); // gameId -> { hostSocketId, createdAt, lastActivity, type }
const MAX_GAME_AGE = 24 * 60 * 60 * 1000; // 24 hours
const MAX_GAMES = 1000; // Maximum concurrent games

// Cleanup old games periodically
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [gameId, data] of activeGames.entries()) {
        const lastSeenAt = data.lastActivity || data.createdAt;
        if (now - lastSeenAt > MAX_GAME_AGE) {
            activeGames.delete(gameId);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired games`);
    }
}, 60 * 60 * 1000); // Every hour

// ============================================
// Socket.IO Connection Handling
// ============================================

io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Host joins a game room
    socket.on('hostJoin', (gameId, callback) => {
        if (!gameId || typeof gameId !== 'string' || !/^[A-Z0-9]{4}$/i.test(gameId)) {
            if (callback) callback({ success: false, error: 'Invalid game ID format' });
            return;
        }
        
        const upperGameId = gameId.toUpperCase();
        const existingGame = activeGames.get(upperGameId);
        const now = Date.now();
        
        // Check if another host already controls this game
        if (existingGame) {
            if (existingGame.hostSocketId !== socket.id) {
                // Check if existing host is still connected
                const hostSocket = io.sockets.sockets.get(existingGame.hostSocketId);
                if (hostSocket && hostSocket.connected) {
                    if (callback) callback({ 
                        success: false, 
                        error: 'Game ID already in use by another host',
                        gameId: upperGameId
                    });
                    return;
                }
            }
        }
        
        // Register/Update this game
        activeGames.set(upperGameId, {
            hostSocketId: socket.id,
            createdAt: existingGame?.createdAt || now,
            lastActivity: now,
            type: existingGame?.type || 'unknown',
            disconnectedAt: null
        });
        
        socket.join(upperGameId);
        socket.gameId = upperGameId;
        socket.isHost = true;
        
        console.log(`🎮 Host joined game: ${upperGameId}`);
        if (callback) callback({ success: true, gameId: upperGameId });
    });

    // Admin joins a game room
    socket.on('adminJoin', (gameId, callback) => {
        if (!gameId || typeof gameId !== 'string' || !/^[A-Z0-9]{4}$/i.test(gameId)) {
            if (callback) callback({ success: false, error: 'Invalid game ID format' });
            return;
        }
        
        const upperGameId = gameId.toUpperCase();
        
        // Check if game exists
        if (!activeGames.has(upperGameId)) {
            if (callback) callback({ success: false, error: 'Game not found' });
            return;
        }

        const game = activeGames.get(upperGameId);
        game.lastActivity = Date.now();
        
        socket.join(upperGameId);
        socket.gameId = upperGameId;
        socket.isAdmin = true;
        
        console.log(`📱 Admin joined game: ${upperGameId}`);
        if (callback) callback({ success: true, message: `Joined ${upperGameId}` });
    });

    // Host broadcasts updates to admins
    socket.on('hostUpdate', (data) => {
        if (!data || typeof data !== 'object') return;
        
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId) return;
        
        // Update game type if provided
        if (data.type && activeGames.has(gameId)) {
            const game = activeGames.get(gameId);
            game.type = data.type;
            game.lastActivity = Date.now();
        }
        
        socket.to(gameId).emit('adminUpdate', { ...data, gameId });
    });

    // Admin requests current state from host
    socket.on('requestState', (gameId) => {
        if (!gameId || typeof gameId !== 'string') return;
        
        const upperGameId = gameId.toUpperCase();
        if (!socket.gameId || socket.gameId !== upperGameId || !socket.isAdmin) return;

        const game = activeGames.get(upperGameId);
        if (game) game.lastActivity = Date.now();
        
        socket.to(upperGameId).emit('hostSendState');
    });

    // Host syncs word list to admins
    socket.on('syncWordList', (data) => {
        if (!data || typeof data !== 'object') return;
        
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId || !socket.isHost) return;
        
        // Update game type
        if (data.type && activeGames.has(gameId)) {
            const game = activeGames.get(gameId);
            game.type = data.type;
            game.lastActivity = Date.now();
        }
        
        socket.to(gameId).emit('adminWordListSync', { ...data, gameId });
    });

    // Admin updates the word list on the host
    socket.on('updateWordListAdmin', (data) => {
        if (!data || typeof data !== 'object') return;
        
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId || !socket.isAdmin) return;

        const game = activeGames.get(gameId);
        if (game) game.lastActivity = Date.now();
        
        socket.to(gameId).emit('hostWordListUpdate', { ...data, gameId });
    });

    // Admin sends commands to host (for Kelime Oyunu and similar games)
    socket.on('adminUpdateHost', (data) => {
        if (!data || typeof data !== 'object') return;
        
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId || !socket.isAdmin) return;

        const game = activeGames.get(gameId);
        if (game) game.lastActivity = Date.now();
        
        socket.to(gameId).emit('adminUpdate', { ...data, gameId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
        
        // If host disconnects, mark game for cleanup but keep it briefly for reconnection
        if (socket.isHost && socket.gameId) {
            const game = activeGames.get(socket.gameId);
            if (game && game.hostSocketId === socket.id) {
                // Preserve the game so the host can reconnect without losing the room state.
                game.disconnectedAt = Date.now();
                game.lastActivity = Date.now();
                console.log(`⏳ Host disconnected from ${socket.gameId}, preserving game until inactivity cleanup`);
            }
        }
    });
});

// ============================================
// API Rate Limiting (stricter for AI endpoints)
// ============================================

const apiRequestCounts = new Map();
const API_RATE_LIMIT = 10; // requests per 15 min
const API_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function apiRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!apiRequestCounts.has(ip)) {
        apiRequestCounts.set(ip, { count: 1, resetTime: now + API_RATE_WINDOW });
    } else {
        const data = apiRequestCounts.get(ip);
        if (now > data.resetTime) {
            data.count = 1;
            data.resetTime = now + API_RATE_WINDOW;
        } else {
            data.count++;
        }
        
        if (data.count > API_RATE_LIMIT) {
            return res.status(429).json({ 
                error: 'API rate limit exceeded. Maximum 10 AI generations per 15 minutes.' 
            });
        }
    }
    next();
}

// ============================================
// Helper: call AI (auto-routes to Gemini or OpenAI)
// ============================================

const TABOO_CARD_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            word: { type: 'string' },
            forbidden: {
                type: 'array',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
            }
        },
        required: ['word', 'forbidden']
    }
};

const WORD_GAME_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            question: { type: 'string' },
            answer: { type: 'string' }
        },
        required: ['question', 'answer']
    }
};

const MILLIONAIRE_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            question: { type: 'string' },
            options: {
                type: 'array',
                items: { type: 'string' },
                minItems: 4,
                maxItems: 4
            },
            correct: {
                type: 'integer',
                minimum: 0,
                maximum: 3
            }
        },
        required: ['question', 'options', 'correct']
    }
};

const THINKING_HATS_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            color: {
                type: 'string',
                enum: ['white', 'red', 'black', 'yellow', 'green', 'blue']
            },
            questions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 3
            },
            starters: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 4
            }
        },
        required: ['color', 'questions', 'starters']
    }
};

function buildGeminiGenerationConfig(options = {}) {
    const {
        temperature = 0.9,
        maxOutputTokens = 4096,
        responseJsonSchema
    } = options;

    const generationConfig = {
        temperature,
        maxOutputTokens
    };

    if (responseJsonSchema) {
        generationConfig.responseMimeType = 'application/json';
        generationConfig.responseJsonSchema = responseJsonSchema;
    }

    return generationConfig;
}

async function callGemini(prompt, options = {}) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const generationConfig = buildGeminiGenerationConfig(options);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Gemini API error:', errBody);
            throw new Error('AI generation service unavailable');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('AI generation timed out');
        throw err;
    }
}

async function callOpenAIProvider(prompt) {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that generates game content. Always respond with the exact format requested. Do not include markdown code fences or extra commentary.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.9,
                max_tokens: 4096
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text();
            console.error('OpenAI API error:', errBody);
            throw new Error('AI generation service unavailable');
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? '';
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('AI generation timed out');
        throw err;
    }
}

async function callAI(prompt, options = {}) {
    if (AI_PROVIDER === 'gemini') return callGemini(prompt, options);
    if (AI_PROVIDER === 'openai') return callOpenAIProvider(prompt);
    throw new Error('No AI provider configured. Set GEMINI_API_KEY (free) or OPENAI_API_KEY in .env');
}

async function callTextAI(prompt, options = {}) {
    return callAI(prompt, options);
}

async function callJsonAI(prompt, responseJsonSchema, options = {}) {
    const text = await callAI(prompt, {
        ...options,
        responseJsonSchema
    });

    return parseModelJson(text);
}

function cleanModelJsonText(text) {
    return String(text ?? '')
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function parseModelJson(text) {
    const cleaned = cleanModelJsonText(text);

    try {
        return JSON.parse(cleaned);
    } catch {
        const arrayStart = cleaned.indexOf('[');
        const arrayEnd = cleaned.lastIndexOf(']');

        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
        }

        const objectStart = cleaned.indexOf('{');
        const objectEnd = cleaned.lastIndexOf('}');

        if (objectStart >= 0 && objectEnd > objectStart) {
            return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
        }

        throw new Error('Invalid JSON response from model');
    }
}

// ============================================
// Validation Helpers
// ============================================

function sanitizeTheme(theme) {
    if (!theme || typeof theme !== 'string') return '';
    return theme.trim().slice(0, 100).replace(/[<>"']/g, '');
}

function sanitizeCount(count, max = 100) {
    const num = parseInt(count, 10);
    if (isNaN(num) || num < 1) return 1;
    if (num > max) return max;
    return num;
}

function sanitizeCefrLevel(level) {
    const normalized = String(level ?? '').trim().toUpperCase();
    return ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'].includes(normalized) ? normalized : '';
}

function buildWordGameCefrInstruction(cefrLevel) {
    if (!cefrLevel) {
        return `
- Keep the language broadly accessible for mixed-level English learners
- Keep clue sentences short, direct, and easy to process`;
    }

    return `
CEFR target: ${cefrLevel}
- Match both the target word AND the clue wording to CEFR ${cefrLevel}
- The explanation/clue itself must fit the CEFR level, not just the answer
- Keep clues classroom-safe, unambiguous, and useful for English language teaching
- Avoid using words in the clue that are harder than the target CEFR level
- Do not make the clue language more advanced than necessary
- Prefer definition-style, simple paraphrase, function, category, synonym, antonym, or context clues
- For A1 use very short, very simple clues with common words and basic sentence patterns
- For A2 use simple everyday English and short direct explanations
- For B1 use clear sentence-level paraphrases and familiar school/everyday vocabulary
- For B1+ use intermediate but still clear clues with modest abstraction and natural paraphrasing
- For B2 use richer paraphrases and broader academic/general-interest vocabulary, but keep clues readable
- For C1 allow precise and more abstract wording, but keep the clue solvable and concise`;
}

function sortWordGameQuestionsByAnswerLength(questions) {
    return [...questions].sort((left, right) => {
        const leftAnswer = String(left.answer ?? '');
        const rightAnswer = String(right.answer ?? '');
        const lengthDiff = leftAnswer.length - rightAnswer.length;

        if (lengthDiff !== 0) return lengthDiff;

        return leftAnswer.localeCompare(rightAnswer) || String(left.question ?? '').localeCompare(String(right.question ?? ''));
    });
}

function loadPrompt(key, replacements = {}) {
    try {
        const promptsPath = path.join(__dirname, 'prompts.json');
        const promptsData = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
        let promptTemplate = promptsData[key] || '';
        for (const [k, v] of Object.entries(replacements)) {
            promptTemplate = promptTemplate.split(`{${k}}`).join(v);
        }
        return promptTemplate;
    } catch (err) {
        console.error(`Error loading prompt key "${key}" from prompts.json:`, err);
        throw err;
    }
}

// ============================================
// API Endpoints
// ============================================

// ---- POST /api/generate (Who Am I? characters) ----
app.post('/api/generate', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'iconic characters';
    const count = sanitizeCount(req.body.count, 50);

    const prompt = loadPrompt('who_am_i', { count, theme });

    try {
        const text = await callTextAI(prompt);

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
app.post('/api/generate-taboo', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';
    const count = sanitizeCount(req.body.count, 30);

    const prompt = loadPrompt('taboo', { count, theme });

    try {
        const cards = await callJsonAI(prompt, TABOO_CARD_SCHEMA, { temperature: 0.7 });

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
app.post('/api/generate-hangman', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'common words';
    const count = sanitizeCount(req.body.count, 20);

    const prompt = loadPrompt('hangman', { count, theme });

    try {
        const text = await callTextAI(prompt);

        const words = text
            .split('\n')
            .map(l => l.trim().toUpperCase())
            .filter(l => l.length >= 4 && l.length <= 10 && /^[A-Z]+$/.test(l));

        res.json({ success: true, count: words.length, words: words });
    } catch (err) {
        console.error('Hangman generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---- POST /api/generate-kelime (Word Game questions) ----
app.post('/api/generate-kelime', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';
    const count = sanitizeCount(req.body.count, 30);
    const cefrLevel = sanitizeCefrLevel(req.body.cefrLevel);
    const cefrInstruction = buildWordGameCefrInstruction(cefrLevel);

    const prompt = loadPrompt('kelime', { count, theme, cefrInstruction: cefrInstruction || '' });

    try {
        const questions = await callJsonAI(prompt, WORD_GAME_SCHEMA, { temperature: 0.7 });

        if (!Array.isArray(questions)) {
            throw new Error('Invalid response format');
        }

        // Validate and clean
        const validQuestions = sortWordGameQuestionsByAnswerLength(questions.filter(q =>
            q.question && 
            q.answer && 
            q.answer.length >= 3 && 
            q.answer.length <= 12
        ).map(q => ({
            question: q.question,
            answer: q.answer.toUpperCase().trim()
        })).slice(0, count));

        res.json({ success: true, count: validQuestions.length, questions: validQuestions });
    } catch (err) {
        console.error('Kelime generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---- POST /api/generate-millionaire (Millionaire questions) ----
app.post('/api/generate-millionaire', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';

    const prompt = loadPrompt('millionaire', { theme });

    try {
        const questions = await callJsonAI(prompt, MILLIONAIRE_SCHEMA, { temperature: 0.6 });

        if (!Array.isArray(questions) || questions.length < 10) {
            throw new Error('Invalid response format - expected at least 10 questions');
        }

        // Validate structure
        const validQuestions = questions.filter(q =>
            q.question && 
            Array.isArray(q.options) && 
            q.options.length === 4 &&
            typeof q.correct === 'number' &&
            q.correct >= 0 && 
            q.correct <= 3
        ).slice(0, 15);

        if (validQuestions.length < 10) {
            throw new Error('Not enough valid questions');
        }

        res.json({ success: true, count: validQuestions.length, questions: validQuestions });
    } catch (err) {
        console.error('Millionaire generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---- POST /api/generate-hats (6 Thinking Hats prompts) ----
app.post('/api/generate-hats', apiRateLimit, async (req, res) => {
    const topic = sanitizeTheme(req.body.topic) || 'general topic';
    const cefrLevel = sanitizeCefrLevel(req.body.cefrLevel);

    let cefrInstruction = '';
    if (cefrLevel) {
        const levelGuides = {
            'A1': 'Use very simple words and very short sentences. Use present simple tense. Example starters: "I think...", "It is...", "I feel..."',
            'A2': 'Use simple everyday English. Short clear sentences. Basic connectors (and, but, because). Example starters: "I believe that...", "The problem is...", "One good thing is..."',
            'B1': 'Use clear, standard English. Moderate sentence length. Common academic words. Example starters: "In my opinion...", "One advantage is...", "We should consider..."',
            'B1+': 'Use intermediate English with some complexity. Natural paraphrasing. Example starters: "From my perspective...", "It could be argued that...", "An alternative would be..."',
            'B2': 'Use richer vocabulary and more complex sentences. Academic register is acceptable. Example starters: "Taking into account...", "One significant concern is...", "Evidence suggests that..."',
            'C1': 'Use precise, nuanced language. Abstract concepts are fine. Sophisticated connectors. Example starters: "One could argue that...", "A critical consideration is...", "This raises the question of..."'
        };
        cefrInstruction = `
CEFR Level: ${cefrLevel}
Language guidance: ${levelGuides[cefrLevel] || levelGuides['B1']}
- ALL questions and sentence starters MUST match this CEFR level
- Do NOT use vocabulary or grammar structures above this level
- Sentence starters should scaffold student output at this level`;
    } else {
        cefrInstruction = `
- Use broadly accessible English suitable for mixed-level ELT classrooms
- Keep questions clear and direct
- Provide simple but varied sentence starters`;
    }

    const prompt = `You are an ELT (English Language Teaching) specialist. Generate discussion content for a "6 Thinking Hats" classroom activity about "${topic}".
${cefrInstruction}

For EACH of the 6 hats below, generate:
- 2-3 discussion questions specific to "${topic}" that match the hat's thinking style
- 3-4 sentence starters that students can use to begin their responses

The 6 hats are:
1. WHITE (Facts & Data) – objective information, statistics, what we know
2. RED (Feelings & Emotions) – gut reactions, feelings, no justification needed
3. BLACK (Caution & Risks) – dangers, problems, what could go wrong
4. YELLOW (Benefits & Optimism) – advantages, positive outcomes, why it works
5. GREEN (Creativity & Ideas) – new ideas, alternatives, creative solutions
6. BLUE (Process & Summary) – organize discussion, summarize, next steps

Return ONLY valid JSON in this exact format:
[
  {
    "color": "white",
    "questions": ["Question 1?", "Question 2?"],
    "starters": ["I know that...", "The data shows...", "One fact is..."]
  },
  {
    "color": "red",
    "questions": ["Question 1?", "Question 2?"],
    "starters": ["I feel...", "My reaction is...", "This makes me feel..."]
  },
  {
    "color": "black",
    "questions": ["Question 1?", "Question 2?"],
    "starters": ["The risk is...", "One problem is...", "I am worried that..."]
  },
  {
    "color": "yellow",
    "questions": ["Question 1?", "Question 2?"],
    "starters": ["One benefit is...", "This is good because...", "The advantage is..."]
  },
  {
    "color": "green",
    "questions": ["Question 1?", "Question 2?"],
    "starters": ["What if we...", "A new idea is...", "We could try..."]
  },
  {
    "color": "blue",
    "questions": ["Question 1?", "Question 2?"],
    "starters": ["To summarize...", "Our next step is...", "We have learned that..."]
  }
]

No markdown, no explanation, just the JSON array with exactly 6 objects.`;

    try {
        const parsed = await callJsonAI(prompt, THINKING_HATS_SCHEMA, { temperature: 0.7 });

        if (!Array.isArray(parsed) || parsed.length < 6) {
            throw new Error('Invalid response format — expected 6 hat objects');
        }

        // Map by color to ensure correct order
        const colorOrder = ['white', 'red', 'black', 'yellow', 'green', 'blue'];
        const colorMap = {};
        for (const item of parsed) {
            if (item.color && Array.isArray(item.questions)) {
                colorMap[item.color.toLowerCase()] = {
                    questions: item.questions.slice(0, 3),
                    starters: (item.starters || []).slice(0, 4)
                };
            }
        }

        // Build ordered array (fallback to empty if a color is missing)
        const hats = colorOrder.map(color => ({
            color,
            questions: colorMap[color]?.questions || [],
            starters: colorMap[color]?.starters || []
        }));

        res.json({ success: true, topic, hats });
    } catch (err) {
        console.error('Hats generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---- POST /api/generate-flashcards (Vocabulary Flashcards) ----
app.post('/api/generate-flashcards', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'daily vocabulary';
    const count = sanitizeCount(req.body.count, 20);

    const prompt = loadPrompt('flashcards', { count, theme });

    try {
        const cards = parseModelJson(await callGemini(prompt));

        if (!Array.isArray(cards)) {
            throw new Error('Invalid response format - expected array of cards');
        }

        const validCards = cards.filter(c =>
            c.word && typeof c.word === 'string' && c.word.trim().length > 0 &&
            c.meaning && typeof c.meaning === 'string' && c.meaning.trim().length > 0
        ).map(c => ({
            word: c.word.trim(),
            meaning: c.meaning.trim()
        })).slice(0, count);

        res.json({ success: true, count: validCards.length, cards: validCards });
    } catch (err) {
        console.error('Flashcards generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        activeGames: activeGames.size
    });
});

// Redirect /admin to /admin.html for convenience
app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

// ---- Serve static files (after API routes) ----
app.use(express.static(__dirname));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    const traceId = createTraceId('srv');
    console.error(`[trace:${traceId}] Server error`, {
        method: req?.method,
        path: req?.originalUrl,
        error: serializeError(err)
    });
    res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
    console.log(`🎮 BerkAI Game Hub running → http://localhost:${PORT}`);
    console.log(`🔒 Security: Rate limiting enabled, CORS configured`);
    console.log(`📊 Max concurrent games: ${MAX_GAMES}`);
    if (AI_PROVIDER === 'gemini') {
        console.log(`🤖 AI Provider: Gemini (${GEMINI_MODEL}) — FREE`);
    } else if (AI_PROVIDER === 'openai') {
        console.log(`🤖 AI Provider: OpenAI (${OPENAI_MODEL}) — paid`);
    } else {
        console.log(`⚠️  No AI key configured! Set GEMINI_API_KEY (free) or OPENAI_API_KEY in .env`);
    }
});
