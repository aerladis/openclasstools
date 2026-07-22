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
// AI Provider: auto-detect Anthropic, Gemini (free), or OpenAI
// ============================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

function getProvider() {
    if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10 && ANTHROPIC_API_KEY !== 'your-api-key-here') {
        return 'anthropic';
    }
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

    // LingoParty real-time mobile classroom action (e.g., student rolling dice from phone or grading)
    socket.on('lingoAction', (data) => {
        if (!data || typeof data !== 'object') return;
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId) return;
        const game = activeGames.get(gameId);
        if (game) game.lastActivity = Date.now();
        socket.to(gameId).emit('lingoActionHost', { ...data, gameId });
    });

    // LingoParty real-time state sync from host to all mobile participants
    socket.on('lingoSync', (data) => {
        if (!data || typeof data !== 'object') return;
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId || !socket.isHost) return;
        const game = activeGames.get(gameId);
        if (game) game.lastActivity = Date.now();
        socket.to(gameId).emit('lingoSyncClient', { ...data, gameId });
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

const LINGOPARTY_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['riddle', 'scramble', 'pronunciation', 'association', 'grammar', 'speed', 'roleplay']
            },
            word: { type: 'string' },
            scrambledWord: { type: 'string' },
            targetWord: { type: 'string' },
            clue: { type: 'string' },
            prompt: { type: 'string' },
            answer: { type: 'string' }
        },
        required: ['type']
    }
};

async function callAnthropicProvider(prompt, options = {}) {
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    const { temperature = 0.9, maxOutputTokens = 4096 } = options;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: ANTHROPIC_MODEL,
                max_tokens: maxOutputTokens,
                temperature,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Anthropic API error:', errBody);

            let errType;
            try { errType = JSON.parse(errBody)?.error?.type; } catch { /* non-JSON error body */ }

            const err = new Error('AI generation service unavailable');
            // rate_limit_error is a short per-minute window and worth retrying;
            // auth/permission/invalid-request/not-found errors won't fix themselves.
            const permanentErrorTypes = ['authentication_error', 'permission_error', 'invalid_request_error', 'not_found_error'];
            err.retryable = !permanentErrorTypes.includes(errType);
            err.quotaExceeded = errType === 'rate_limit_error';
            throw err;
        }

        const data = await response.json();
        return data.content?.[0]?.text ?? '';
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('AI generation timed out');
        throw err;
    }
}

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

// ============================================
// Supabase Telemetry & Custom Teacher Key Support
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tomgxxgkhfviwbbvxzsl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'berkai2026';

function extractTeacherContext(req) {
    const customApiKey = req.headers['x-gemini-api-key'] || req.body?.apiKey || null;
    const teacherName = req.headers['x-teacher-name'] || req.body?.teacherName || 'Anonymous Teacher';
    return {
        customApiKey,
        teacherName,
        options: customApiKey ? { apiKey: customApiKey } : {}
    };
}

async function logGameSessionToSupabase(sessionData) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/game_sessions`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(sessionData)
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data?.[0] || null;
    } catch (err) {
        console.warn('[Supabase Telemetry] Session log skipped:', err.message);
        return null;
    }
}

async function logGameActivityToSupabase(logData) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/game_activity_logs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        });
    } catch (err) {
        console.warn('[Supabase Telemetry] Activity log skipped:', err.message);
    }
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
                'x-goog-api-key': options.apiKey || GEMINI_API_KEY
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

            let apiStatus;
            try { apiStatus = JSON.parse(errBody)?.error?.status; } catch { /* non-JSON error body */ }

            const err = new Error('AI generation service unavailable');
            // A daily project-wide quota (RESOURCE_EXHAUSTED) won't clear up within
            // a few seconds — retrying immediately just burns more of the same quota
            // for no benefit, so mark it non-retryable and fall back right away.
            err.retryable = apiStatus !== 'RESOURCE_EXHAUSTED';
            err.quotaExceeded = apiStatus === 'RESOURCE_EXHAUSTED';
            throw err;
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

            let errType;
            try { errType = JSON.parse(errBody)?.error?.type; } catch { /* non-JSON error body */ }

            const err = new Error('AI generation service unavailable');
            err.retryable = response.status !== 429 && errType !== 'insufficient_quota';
            err.quotaExceeded = response.status === 429 || errType === 'insufficient_quota';
            throw err;
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
    if (AI_PROVIDER === 'anthropic') return callAnthropicProvider(prompt, options);
    if (AI_PROVIDER === 'gemini') return callGemini(prompt, options);
    if (AI_PROVIDER === 'openai') return callOpenAIProvider(prompt);
    throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY (free), or OPENAI_API_KEY in .env');
}

async function callTextAI(prompt, options = {}) {
    const maxAttempts = 3;
    let lastErr;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await callAI(prompt, options);
        } catch (err) {
            lastErr = err;
            console.warn(`[AI Retry] callTextAI attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
            if (err.retryable === false) {
                console.warn('[AI Retry] Non-retryable error (quota exhausted) — skipping remaining attempts');
                break;
            }
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, attempt * 600));
            }
        }
    }

    throw lastErr;
}

async function callJsonAI(prompt, responseJsonSchema, options = {}) {
    const { validate, ...aiOptions } = options;
    const maxAttempts = 3;
    let lastErr;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const text = await callAI(prompt, {
                ...aiOptions,
                responseJsonSchema
            });
            const parsed = parseModelJson(text);

            if (validate) {
                const validationError = validate(parsed);
                if (validationError) throw new Error(validationError);
            }

            return parsed;
        } catch (err) {
            lastErr = err;
            console.warn(`[AI Retry] callJsonAI attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
            if (err.retryable === false) {
                console.warn('[AI Retry] Non-retryable error (quota exhausted) — skipping remaining attempts');
                break;
            }
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, attempt * 600));
            }
        }
    }

    throw lastErr;
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

// Finds the substring starting at the first `openChar` and ending at its
// structurally-matching `closeChar`, tracking bracket depth and skipping
// over string literals so brackets inside quoted text (or trailing model
// commentary after the real JSON) can't throw off the match.
function extractBalancedJson(text, openChar, closeChar) {
    const start = text.indexOf(openChar);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < text.length; i++) {
        const ch = text[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (ch === '\\') {
            escapeNext = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (ch === openChar) {
            depth++;
        } else if (ch === closeChar) {
            depth--;
            if (depth === 0) {
                return text.slice(start, i + 1);
            }
        }
    }

    return null;
}

function parseModelJson(text) {
    const cleaned = cleanModelJsonText(text);

    try {
        return JSON.parse(cleaned);
    } catch (err) {
        const arrayJson = extractBalancedJson(cleaned, '[', ']');
        if (arrayJson) {
            try {
                return JSON.parse(arrayJson);
            } catch { /* fall through to object attempt */ }
        }

        const objectJson = extractBalancedJson(cleaned, '{', '}');
        if (objectJson) {
            try {
                return JSON.parse(objectJson);
            } catch { /* fall through to throw below */ }
        }

        throw new Error(`Invalid JSON response from model: ${err.message}`);
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

function sanitizeCEFR(level) {
    return sanitizeCefrLevel(level);
}

function getCEFRInstruction(cefr) {
    return buildWordGameCefrInstruction(cefr);
}

function jumbleWord(word) {
    const raw = String(word ?? '').toUpperCase().trim();
    const chars = raw.replace(/[^A-Z]/g, '').split('');
    if (chars.length < 2) return raw;
    let shuffled = [...chars];
    let attempts = 0;
    const targetStr = chars.join('');
    while (attempts < 25 && shuffled.join('') === targetStr) {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        attempts++;
    }
    return shuffled.join(' - ');
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
// Offline JSON Fallback Template Generator
// ============================================
function createFallbackQuestions(gameType, theme = 'General Knowledge', count = 20, options = {}) {
    const cleanTheme = theme || 'General English';

    if (gameType === 'lingoparty') {
        const templates = [
            {
                type: 'roleplay',
                prompt: `🎭 Roleplay Scenario: Narrate a 30-second mission log about "${cleanTheme}" as if reporting to mission control. Use at least 3 key vocabulary words!`,
                answer: `Key phrases: "Could you tell me...", "In my opinion...", "I suggest that..."`
            },
            {
                type: 'roleplay',
                prompt: `🎭 Roleplay Scenario: You are ordering or requesting assistance regarding "${cleanTheme}". Express your request clearly in English!`,
                answer: `Key phrases: "Excuse me, I need help with...", "How much does it cost?"`
            },
            {
                type: 'roleplay',
                prompt: `🎭 Roleplay Scenario: Narrate a mission log describing what you would do if you were an expert in "${cleanTheme}" for a day.`,
                answer: `Key phrases: "If I were...", "The first thing I would do is...", "I'd also..."`
            },
            {
                type: 'riddle',
                prompt: `🧩 Linguistic Riddle: I have keys but no locks. I have space but no room. You can enter, but you can't go outside. What am I?`,
                answer: 'A Keyboard'
            },
            {
                type: 'riddle',
                prompt: `🧩 Riddle: What gets wetter and wetter the more it dries?`,
                answer: 'A Towel'
            },
            {
                type: 'riddle',
                prompt: `🧩 Riddle: The more you take away from me, the bigger I become. What am I?`,
                answer: 'A Hole'
            },
            {
                type: 'scramble',
                scrambledWord: 'C-H-A-L-L-E-N-G-E',
                targetWord: 'CHALLENGE',
                clue: `A test of your abilities or skills related to ${cleanTheme}.`
            },
            {
                type: 'scramble',
                scrambledWord: 'V-O-C-A-B-U-L-A-R-Y',
                targetWord: 'VOCABULARY',
                clue: 'All the words known and used in a language.'
            },
            {
                type: 'scramble',
                scrambledWord: 'A-D-V-E-N-T-U-R-E',
                targetWord: 'ADVENTURE',
                clue: `An exciting or unusual experience related to ${cleanTheme}.`
            },
            {
                type: 'pronunciation',
                prompt: `🗣️ Pronunciation Challenge: Read out loud with clear accent: "The enthusiastic explorers discovered mysterious cosmic anomalies!"`
            },
            {
                type: 'pronunciation',
                prompt: `🗣️ Pronunciation Challenge: Read out loud clearly: "Thirty-three thrifty thinkers thought thoroughly about ${cleanTheme}."`
            },
            {
                type: 'pronunciation',
                prompt: `🗣️ Pronunciation Challenge: Read out loud with clear stress: "She carefully considered several unusual solutions."`
            },
            {
                type: 'association',
                prompt: `🔗 Word Association: Name 4 key vocabulary collocations associated with "${cleanTheme}".`,
                answer: `Valid collocations related to ${cleanTheme}`
            },
            {
                type: 'association',
                prompt: `🔗 Word Association: Name 3 adjectives that could describe "${cleanTheme}".`,
                answer: `Any 3 valid descriptive adjectives`
            },
            {
                type: 'association',
                prompt: `🔗 Word Association: Name 3 verbs commonly used when talking about "${cleanTheme}".`,
                answer: `Any 3 valid related verbs`
            },
            {
                type: 'grammar',
                prompt: `✍️ Grammar Trap: Correct the mistake: "She don't like to study grammar during the weekend."`,
                answer: 'She DOES NOT like to study grammar during the weekend.'
            },
            {
                type: 'grammar',
                prompt: `✍️ Grammar Trap: Fix the error: "If I was you, I will practice every day."`,
                answer: 'If I WERE you, I WOULD practice every day.'
            },
            {
                type: 'grammar',
                prompt: `✍️ Grammar Trap: Correct the mistake: "He have been study English for three years."`,
                answer: 'He HAS BEEN STUDYING English for three years.'
            },
            {
                type: 'speed',
                prompt: `☄️ Speed Relay: Name 3 items or verbs related to "${cleanTheme}" in under 15 seconds!`,
                answer: `Any 3 valid items for ${cleanTheme}`
            },
            {
                type: 'speed',
                prompt: `☄️ Speed Relay: Name 3 adjectives that describe "${cleanTheme}" in under 15 seconds!`,
                answer: `Any 3 valid adjectives for ${cleanTheme}`
            },
            {
                type: 'speed',
                prompt: `☄️ Speed Relay: Name 3 places associated with "${cleanTheme}" in under 15 seconds!`,
                answer: `Any 3 valid places related to ${cleanTheme}`
            }
        ];

        const shuffled = [...templates].sort(() => Math.random() - 0.5);
        const cards = [];
        for (let i = 0; i < count; i++) {
            const tmpl = shuffled[i % shuffled.length];
            cards.push({ ...tmpl });
        }
        return cards;
    }

    if (gameType === 'taboo') {
        const sampleTaboo = [
            { word: 'ASTRONAUT', forbidden: ['Space', 'Rocket', 'NASA', 'Suit', 'Moon'] },
            { word: 'TELESCOPE', forbidden: ['Look', 'Stars', 'Lens', 'Sky', 'Night'] },
            { word: 'DICTIONARY', forbidden: ['Book', 'Word', 'Meaning', 'Language', 'Define'] },
            { word: 'GUITAR', forbidden: ['Instrument', 'Music', 'Strings', 'Play', 'Song'] },
            { word: 'AIRPORT', forbidden: ['Plane', 'Fly', 'Luggage', 'Travel', 'Ticket'] },
            { word: 'SUMMER', forbidden: ['Hot', 'Sun', 'Season', 'Vacation', 'Beach'] },
            { word: 'COMPUTER', forbidden: ['Screen', 'Keyboard', 'Internet', 'Mouse', 'Code'] },
            { word: 'PYRAMID', forbidden: ['Egypt', 'Pharaoh', 'Ancient', 'Triangle', 'Tomb'] },
            { word: 'BICYCLE', forbidden: ['Pedal', 'Ride', 'Wheels', 'Helmet', 'Bike'] },
            { word: 'DOCTOR', forbidden: ['Hospital', 'Sick', 'Medicine', 'Patient', 'Cure'] }
        ];
        const cards = [];
        for (let i = 0; i < count; i++) {
            cards.push({ ...sampleTaboo[i % sampleTaboo.length] });
        }
        return cards;
    }

    if (gameType === 'hangman') {
        const wordsList = [
            'ASTRONAUT', 'EXPLORER', 'CHALLENGE', 'VICTORY', 'LANGUAGE',
            'COMMUNICATE', 'VOCABULARY', 'ADVENTURE', 'SUPERSTAR', 'KNOWLEDGE',
            'DISCOVERY', 'JOURNEY', 'CULTURE', 'HORIZON', 'PARTNER'
        ];
        const words = [];
        for (let i = 0; i < count; i++) {
            words.push(wordsList[i % wordsList.length]);
        }
        return words;
    }

    if (gameType === 'kelime') {
        const kelimeSamples = [
            { question: 'The natural satellite orbiting planet Earth', answer: 'MOON' },
            { question: 'A luminous celestial body visible in the night sky', answer: 'STAR' },
            { question: 'A structured system of communication used by humans', answer: 'LANGUAGE' },
            { question: 'An institution for educating students and gaining knowledge', answer: 'SCHOOL' },
            { question: 'A trophy awarded as a symbol of victory', answer: 'CUP' },
            { question: 'A group of players coming together to achieve a goal', answer: 'TEAM' },
            { question: 'An exciting and unusual experience or journey', answer: 'ADVENTURE' },
            { question: 'The accomplishment of an aim or goal', answer: 'SUCCESS' },
            { question: 'A vehicle designed to travel into outer space', answer: 'ROCKET' },
            { question: 'A massive system of stars, gas, and dust bound by gravity', answer: 'GALAXY' }
        ];
        const questions = [];
        for (let i = 0; i < count; i++) {
            questions.push({ ...kelimeSamples[i % kelimeSamples.length] });
        }
        return sortWordGameQuestionsByAnswerLength(questions);
    }

    if (gameType === 'millionaire') {
        const questions = [];
        for (let i = 1; i <= 15; i++) {
            questions.push({
                question: `[Level ${i}] Quiz Question about ${cleanTheme}: What is a primary concept of level ${i}?`,
                options: [`Correct Option ${i}`, `Distractor A`, `Distractor B`, `Distractor C`],
                correct: 0
            });
        }
        return questions;
    }

    if (gameType === 'who') {
        const characters = [
            'Albert Einstein', 'Cleopatra', 'Sherlock Holmes', 'Marie Curie', 'Leonardo da Vinci',
            'Harry Potter', 'Spider-Man', 'William Shakespeare', 'Taylor Swift', 'Elon Musk',
            'Isaac Newton', 'Amelia Earhart', 'Batman', 'Mozart', 'Galileo Galilei'
        ];
        return characters.slice(0, count);
    }

    if (gameType === 'hats') {
        return [
            { color: 'white', questions: [`What data and facts do we know about "${cleanTheme}"?`], starters: ['The data shows that...', 'One fact is...'] },
            { color: 'red', questions: [`How do you feel emotionally about "${cleanTheme}"?`], starters: ['I feel that...', 'My gut reaction is...'] },
            { color: 'black', questions: [`What risks or challenges could happen with "${cleanTheme}"?`], starters: ['The main risk is...', 'A potential problem is...'] },
            { color: 'yellow', questions: [`What are the positive benefits of "${cleanTheme}"?`], starters: ['One big benefit is...', 'This is good because...'] },
            { color: 'green', questions: [`What creative ideas can we invent for "${cleanTheme}"?`], starters: ['What if we...', 'A creative solution is...'] },
            { color: 'blue', questions: [`How can we summarize our learning on "${cleanTheme}"?`], starters: ['To summarize our findings...', 'Our next step is...'] }
        ];
    }

    if (gameType === 'flashcards') {
        const cards = [];
        const samples = [
            { word: 'adventure', meaning: 'macera' },
            { word: 'challenge', meaning: 'meydan okuma' },
            { word: 'discovery', meaning: 'keşif' },
            { word: 'knowledge', meaning: 'bilgi' },
            { word: 'victory', meaning: 'zafer' }
        ];
        for (let i = 0; i < count; i++) {
            cards.push({ ...samples[i % samples.length] });
        }
        return cards;
    }

    return [];
}

// ============================================
// API Endpoints
// ============================================

// ---- POST /api/generate (Who Am I? characters) ----
app.post('/api/generate', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'iconic characters';
    const count = sanitizeCount(req.body.count, 50);

    try {
        const prompt = loadPrompt('who_am_i', { count, theme });
        const text = await callTextAI(prompt);

        const names = text
            .split('\n')
            .map(l => l.replace(/^\d+[\.\)\-]\s*/, '').trim())
            .filter(l => l && !l.startsWith('---') && !l.startsWith('**'));

        if (names.length === 0) throw new Error('Empty list returned from AI');

        const listContent = names.join('\n') + '\n';
        fs.writeFileSync(path.join(__dirname, 'list.txt'), listContent, 'utf-8');

        res.json({ success: true, count: names.length, characters: names });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate fallback for theme "${theme}":`, err.message);
        const fallbackNames = createFallbackQuestions('who', theme, count);
        const listContent = fallbackNames.join('\n') + '\n';
        try { fs.writeFileSync(path.join(__dirname, 'list.txt'), listContent, 'utf-8'); } catch {}
        res.json({ success: true, count: fallbackNames.length, characters: fallbackNames, isFallback: true });
    }
});

// ---- POST /api/generate-taboo (Taboo cards) ----
app.post('/api/generate-taboo', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';
    const count = sanitizeCount(req.body.count, 30);

    try {
        const prompt = loadPrompt('taboo', { count, theme });
        const cards = await callJsonAI(prompt, TABOO_CARD_SCHEMA, {
            temperature: 0.7,
            validate: (result) => (!Array.isArray(result) || result.length === 0) ? 'Invalid response format' : null
        });

        const validCards = cards.filter(c =>
            c.word && Array.isArray(c.forbidden) && c.forbidden.length >= 3
        );

        if (validCards.length === 0) throw new Error('No valid Taboo cards parsed');

        res.json({ success: true, count: validCards.length, cards: validCards });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate-taboo fallback for theme "${theme}":`, err.message);
        const fallbackCards = createFallbackQuestions('taboo', theme, count);
        res.json({ success: true, count: fallbackCards.length, cards: fallbackCards, isFallback: true });
    }
});

// ---- POST /api/generate-hangman (Hangman words) ----
app.post('/api/generate-hangman', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'common words';
    const count = sanitizeCount(req.body.count, 20);

    try {
        const prompt = loadPrompt('hangman', { count, theme });
        const text = await callTextAI(prompt);

        const words = text
            .split('\n')
            .map(l => l.trim().toUpperCase())
            .filter(l => l.length >= 4 && l.length <= 10 && /^[A-Z]+$/.test(l));

        if (words.length === 0) throw new Error('No valid Hangman words parsed');

        res.json({ success: true, count: words.length, words: words });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate-hangman fallback for theme "${theme}":`, err.message);
        const fallbackWords = createFallbackQuestions('hangman', theme, count);
        res.json({ success: true, count: fallbackWords.length, words: fallbackWords, isFallback: true });
    }
});

// ---- POST /api/generate-kelime (Word Game questions) ----
app.post('/api/generate-kelime', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';
    const count = sanitizeCount(req.body.count, 30);
    const cefrLevel = sanitizeCefrLevel(req.body.cefrLevel);
    const cefrInstruction = buildWordGameCefrInstruction(cefrLevel);

    try {
        const prompt = loadPrompt('kelime', { count, theme, cefrInstruction: cefrInstruction || '' });
        const questions = await callJsonAI(prompt, WORD_GAME_SCHEMA, {
            temperature: 0.7,
            validate: (result) => !Array.isArray(result) ? 'Invalid response format' : null
        });

        const validQuestions = sortWordGameQuestionsByAnswerLength(questions.filter(q =>
            q.question && 
            q.answer && 
            q.answer.length >= 3 && 
            q.answer.length <= 12
        ).map(q => ({
            question: q.question,
            answer: q.answer.toUpperCase().trim()
        })).slice(0, count));

        if (validQuestions.length === 0) throw new Error('No valid Word Game questions parsed');

        res.json({ success: true, count: validQuestions.length, questions: validQuestions });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate-kelime fallback for theme "${theme}":`, err.message);
        const fallbackQuestions = createFallbackQuestions('kelime', theme, count);
        res.json({ success: true, count: fallbackQuestions.length, questions: fallbackQuestions, isFallback: true });
    }
});

// ---- POST /api/generate-millionaire (Millionaire questions) ----
app.post('/api/generate-millionaire', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'general knowledge';

    try {
        const prompt = loadPrompt('millionaire', { theme });
        const questions = await callJsonAI(prompt, MILLIONAIRE_SCHEMA, {
            temperature: 0.6,
            validate: (result) => (!Array.isArray(result) || result.length < 10)
                ? 'Invalid response format - expected at least 10 questions'
                : null
        });

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
        console.warn(`[AI Fallback] /api/generate-millionaire fallback for theme "${theme}":`, err.message);
        const fallbackQuestions = createFallbackQuestions('millionaire', theme, 15);
        res.json({ success: true, count: fallbackQuestions.length, questions: fallbackQuestions, isFallback: true });
    }
});

// ---- POST /api/generate-hats (6 Thinking Hats prompts) ----
app.post('/api/generate-hats', apiRateLimit, async (req, res) => {
    const topic = sanitizeTheme(req.body.topic) || 'general topic';
    const cefrLevel = sanitizeCefrLevel(req.body.cefrLevel);

    try {
        let cefrInstruction = '';
        if (cefrLevel) {
            const levelGuides = {
                'A1': 'Use very simple words and very short sentences.',
                'A2': 'Use simple everyday English. Short clear sentences.',
                'B1': 'Use clear, standard English. Moderate sentence length.',
                'B1+': 'Use intermediate English with some complexity.',
                'B2': 'Use richer vocabulary and more complex sentences.',
                'C1': 'Use precise, nuanced language.'
            };
            cefrInstruction = `CEFR Level: ${cefrLevel}. Guidance: ${levelGuides[cefrLevel] || levelGuides['B1']}`;
        }

        const prompt = `You are an ELT specialist. Generate discussion content for a "6 Thinking Hats" activity about "${topic}".
${cefrInstruction}

Return ONLY valid JSON array with 6 objects for colors: white, red, black, yellow, green, blue. Format:
[
  { "color": "white", "questions": ["Question 1?"], "starters": ["I know that..."] }
]`;

        const parsed = await callJsonAI(prompt, THINKING_HATS_SCHEMA, {
            temperature: 0.7,
            validate: (result) => (!Array.isArray(result) || result.length < 6)
                ? 'Invalid response format — expected 6 hat objects'
                : null
        });

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

        const hats = colorOrder.map(color => ({
            color,
            questions: colorMap[color]?.questions || [],
            starters: colorMap[color]?.starters || []
        }));

        res.json({ success: true, topic, hats });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate-hats fallback for topic "${topic}":`, err.message);
        const fallbackHats = createFallbackQuestions('hats', topic, 6);
        res.json({ success: true, topic, hats: fallbackHats, isFallback: true });
    }
});

// ---- POST /api/generate-flashcards (Vocabulary Flashcards) ----
app.post('/api/generate-flashcards', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'daily vocabulary';
    const count = sanitizeCount(req.body.count, 20);

    try {
        const prompt = loadPrompt('flashcards', { count, theme });
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

        if (validCards.length === 0) throw new Error('No valid flashcards parsed');

        res.json({ success: true, count: validCards.length, cards: validCards });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate-flashcards fallback for theme "${theme}":`, err.message);
        const fallbackCards = createFallbackQuestions('flashcards', theme, count);
        res.json({ success: true, count: fallbackCards.length, cards: fallbackCards, isFallback: true });
    }
});

// ---- POST /api/generate-lingoparty (Interactive Board Game Deck) ----
app.post('/api/generate-lingoparty', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'General English';
    const count = sanitizeCount(req.body.count, 24);
    const cefr = sanitizeCEFR(req.body.cefr);
    const cefrInstruction = getCEFRInstruction(cefr);
    const { customApiKey, teacherName, options } = extractTeacherContext(req);

    try {
        const prompt = loadPrompt('lingoparty', { count, theme, cefrInstruction });
        const cards = await callJsonAI(prompt, LINGOPARTY_SCHEMA, {
            ...options,
            temperature: 0.7,
            validate: (result) => (!Array.isArray(result) || result.length === 0)
                ? 'Invalid response format - expected array of challenge objects'
                : null
        });

        const validTypes = ['riddle', 'scramble', 'pronunciation', 'association', 'grammar', 'speed', 'roleplay'];
        const validCards = cards.filter(c => c && typeof c === 'object' && c.type && validTypes.includes(c.type)).map(c => {
            if (c.type === 'riddle') {
                return {
                    type: 'riddle',
                    prompt: String(c.prompt || 'Solve the linguistic riddle.').trim(),
                    answer: String(c.answer || 'Answer').trim()
                };
            } else if (c.type === 'scramble') {
                const targetWord = String(c.targetWord || c.word || 'WORD').toUpperCase().trim();
                const scrambledWord = jumbleWord(targetWord);
                return {
                    type: 'scramble',
                    scrambledWord,
                    targetWord,
                    clue: String(c.clue || c.prompt || 'Unscramble the letters to reveal the target word.').trim()
                };
            } else if (c.type === 'pronunciation') {
                return {
                    type: 'pronunciation',
                    prompt: String(c.prompt || 'Read this sentence out loud clearly.').trim()
                };
            } else if (c.type === 'association') {
                return {
                    type: 'association',
                    prompt: String(c.prompt || 'Name 3 words associated with the topic.').trim(),
                    answer: String(c.answer || 'Valid collocations').trim()
                };
            } else if (c.type === 'grammar') {
                return {
                    type: 'grammar',
                    prompt: String(c.prompt || 'Correct the error in the sentence.').trim(),
                    answer: String(c.answer || 'Correct sentence.').trim()
                };
            } else if (c.type === 'speed') {
                return {
                    type: 'speed',
                    prompt: String(c.prompt || 'Name 3 words related to the topic in 15 seconds.').trim(),
                    answer: String(c.answer || 'Any 3 valid words').trim()
                };
            } else {
                return {
                    type: 'roleplay',
                    prompt: String(c.prompt || 'Have a short 30-second dialogue about the topic.').trim(),
                    answer: String(c.answer || 'Key dialogue phrases').trim()
                };
            }
        });

        if (validCards.length === 0) throw new Error('No valid LingoParty cards parsed');

        const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
        logGameSessionToSupabase({
            game_type: 'lingoparty',
            game_id: gameId,
            teacher_name: teacherName,
            theme,
            cefr_level: cefr,
            teams_count: 3,
            team_names: ['Dragons', 'Rockets', 'Androids'],
            question_count: validCards.length,
            custom_api_key_used: !!customApiKey
        });

        res.json({ success: true, gameId, count: validCards.length, cards: validCards });
    } catch (err) {
        console.warn(`[AI Fallback] /api/generate-lingoparty fallback for theme "${theme}":`, err.message);
        const fallbackCards = createFallbackQuestions('lingoparty', theme, count, { cefr });
        res.json({ success: true, count: fallbackCards.length, cards: fallbackCards, isFallback: true });
    }
});

// ---- Admin Telemetry API Endpoints ----
app.get('/api/admin/telemetry', async (req, res) => {
    try {
        const sessionsRes = await fetch(`${SUPABASE_URL}/rest/v1/game_sessions?select=*&order=created_at.desc&limit=100`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const sessions = await sessionsRes.json();

        const totalSessions = Array.isArray(sessions) ? sessions.length : 0;
        const customKeySessions = Array.isArray(sessions) ? sessions.filter(s => s.custom_api_key_used).length : 0;
        const customKeyUsagePct = totalSessions > 0 ? Math.round((customKeySessions / totalSessions) * 100) : 0;
        
        const teacherNames = new Set(Array.isArray(sessions) ? sessions.map(s => s.teacher_name).filter(Boolean) : []);
        const totalAIContentGenerated = Array.isArray(sessions) ? sessions.reduce((acc, s) => acc + (s.question_count || 0), 0) : 0;

        res.json({
            success: true,
            sessions: Array.isArray(sessions) ? sessions : [],
            overview: {
                totalSessions,
                totalAIContentGenerated,
                activeTeachersCount: teacherNames.size,
                customKeyUsagePct
            }
        });
    } catch (err) {
        console.error('Admin telemetry fetch error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch telemetry data' });
    }
});

app.get('/api/admin/session-logs/:gameId', async (req, res) => {
    const { gameId } = req.params;
    try {
        const logsRes = await fetch(`${SUPABASE_URL}/rest/v1/game_activity_logs?game_id=eq.${gameId}&order=created_at.asc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const logs = await logsRes.json();
        res.json({ success: true, logs: Array.isArray(logs) ? logs : [] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch session logs' });
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

// ---- Serve static files (React + Vite build & legacy html) ----
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
}
app.use(express.static(__dirname));

// SPA Wildcard Route (serves React app for client-side routes like /lingoparty)
app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
        return next();
    }
    const indexHtmlPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
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
    if (AI_PROVIDER === 'anthropic') {
        console.log(`🤖 AI Provider: Anthropic (${ANTHROPIC_MODEL}) — paid`);
    } else if (AI_PROVIDER === 'gemini') {
        console.log(`🤖 AI Provider: Gemini (${GEMINI_MODEL}) — FREE`);
    } else if (AI_PROVIDER === 'openai') {
        console.log(`🤖 AI Provider: OpenAI (${OPENAI_MODEL}) — paid`);
    } else {
        console.log(`⚠️  No AI key configured! Set ANTHROPIC_API_KEY, GEMINI_API_KEY (free), or OPENAI_API_KEY in .env`);
    }
});
