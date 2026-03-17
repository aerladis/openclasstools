/* ============================================
   Party Games – Express Server (Secure)
   Serves static files + Gemini AI generation
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
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:8090", "http://play.berkaybilge.space"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 8090;
const GEMINI_MODEL = 'gemini-2.5-flash';

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
// Helper: call Gemini (Text)
// ============================================

async function callGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here' || apiKey.length < 10) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 4096
                }
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
        if (err.name === 'AbortError') {
            throw new Error('AI generation timed out');
        }
        throw err;
    }
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

// ============================================
// API Endpoints
// ============================================

// ---- POST /api/generate (Who Am I? characters) ----
app.post('/api/generate', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'iconic characters';
    const count = sanitizeCount(req.body.count, 50);

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
app.post('/api/generate-taboo', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';
    const count = sanitizeCount(req.body.count, 30);

    const prompt = `Generate EXACTLY ${count} Taboo game cards about "${theme}".
For each card, provide a main word and exactly 5 forbidden words.
Return ONLY valid JSON — an array of objects with "word" and "forbidden" keys.
Example format:
[{"word":"Pizza","forbidden":["Cheese","Italian","Slice","Dough","Oven"]}]
No markdown, no code fences, no explanation — just the JSON array.`;

    try {
        const cards = parseModelJson(await callGemini(prompt));

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

    const prompt = `Generate a list of EXACTLY ${count} words for a Hangman game about "${theme}".
Each word should be between 4 and 10 letters long.
Return ONLY the words, one per line, no numbering, no extra text, no explanations.`;

    try {
        const text = await callGemini(prompt);

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

    const prompt = `Generate EXACTLY ${count} English word game questions for "Word Game" about "${theme}" for ELT classes.

Each question should have:
- A question in English
- An answer (single word, uppercase, no spaces)
- Answers should be 3-12 letters
- Questions should vary in difficulty
- Use clue-based prompts that help learners understand vocabulary meaning, use, category, synonym, antonym, function, or context
- Prefer practical classroom vocabulary over niche trivia
- Keep clues unambiguous and suitable for the answer length
- Make the answer a meaningful target vocabulary item students might study in class
- Keep clue sentences as simple as the CEFR target requires
- Example: for A1, write very simple clues like "It is an animal. It is big and gray."
${cefrInstruction}

Return ONLY valid JSON array:
[
  {
    "question": "What is the capital of France?",
    "answer": "PARIS"
  }
]

No markdown, no explanation, just the JSON array.`;

    try {
        const questions = parseModelJson(await callGemini(prompt));

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

    const prompt = `Generate EXACTLY 15 multiple-choice quiz questions for "Who Wants to Be a Millionaire" about "${theme}".

Requirements:
- Questions 1-5: Easy difficulty
- Questions 6-10: Medium difficulty  
- Questions 11-15: Hard difficulty
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question (use 0-based index)
- Questions should get progressively harder
- Make sure correct answers are accurate

Return ONLY valid JSON in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 2
  }
]

No markdown, no explanation, just the JSON array. Ensure all 15 questions are included.`;

    try {
        const questions = parseModelJson(await callGemini(prompt));

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
});
