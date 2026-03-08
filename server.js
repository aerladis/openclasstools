/* ============================================
   Party Games – Express Server (Secure)
   Serves static files + Gemini AI generation
   With file upload, OCR, and topic extraction
   ============================================ */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

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
const GEMINI_VISION_MODEL = 'gemini-2.5-flash'; // Vision-capable model

// ============================================
// File Upload Configuration
// ============================================

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'book-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 5 // Max 5 files at once
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
        }
    }
});

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

const activeGames = new Map(); // gameId -> { hostSocketId, createdAt, type }
const MAX_GAME_AGE = 24 * 60 * 60 * 1000; // 24 hours
const MAX_GAMES = 1000; // Maximum concurrent games

// Cleanup old games periodically
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [gameId, data] of activeGames.entries()) {
        if (now - data.createdAt > MAX_GAME_AGE) {
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
        
        // Check if another host already controls this game
        if (activeGames.has(upperGameId)) {
            const existing = activeGames.get(upperGameId);
            if (existing.hostSocketId !== socket.id) {
                // Check if existing host is still connected
                const hostSocket = io.sockets.sockets.get(existing.hostSocketId);
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
            createdAt: Date.now(),
            type: 'unknown'
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
        
        socket.to(gameId).emit('hostWordListUpdate', { ...data, gameId });
    });

    // Admin sends commands to host (for Kelime Oyunu and similar games)
    socket.on('adminUpdateHost', (data) => {
        if (!data || typeof data !== 'object') return;
        
        const gameId = data.gameId?.toUpperCase();
        if (!gameId || !socket.gameId || socket.gameId !== gameId || !socket.isAdmin) return;
        
        socket.to(gameId).emit('adminUpdate', { ...data, gameId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
        
        // If host disconnects, mark game for cleanup but keep it briefly for reconnection
        if (socket.isHost && socket.gameId) {
            const game = activeGames.get(socket.gameId);
            if (game && game.hostSocketId === socket.id) {
                // Keep game alive for 5 minutes in case host reconnects
                game.disconnectedAt = Date.now();
                console.log(`⏳ Host disconnected from ${socket.gameId}, keeping game alive for 5min`);
                
                setTimeout(() => {
                    const currentGame = activeGames.get(socket.gameId);
                    if (currentGame && currentGame.disconnectedAt) {
                        // Check if a new host has taken over
                        const newHostSocket = io.sockets.sockets.get(currentGame.hostSocketId);
                        if (!newHostSocket || !newHostSocket.connected) {
                            activeGames.delete(socket.gameId);
                            console.log(`🗑️ Game ${socket.gameId} cleaned up after host timeout`);
                        }
                    }
                }, 5 * 60 * 1000);
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

// ============================================
// Helper: call Gemini Vision (Image Analysis)
// ============================================

async function callGeminiVision(imageBase64, mimeType, prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here' || apiKey.length < 10) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout for images

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Gemini Vision API error:', errBody);
            throw new Error('Image analysis service unavailable');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('Image analysis timed out');
        }
        throw err;
    }
}

// ============================================
// Helper: Extract Topics from Book Content
// ============================================

async function extractTopicsFromContent(content, gameType) {
    const prompt = `Analyze this text extracted from a book or educational material and extract relevant topics for a "${gameType}" game.

Extracted Text:
"""
${content.slice(0, 3000)}
"""

Based on this content, generate a JSON object with these fields:
- "title": A catchy title for the game topic (max 50 chars)
- "description": Brief description of what the content is about (max 100 chars)
- "themes": Array of 3-5 specific theme suggestions for AI generation
- "keyTerms": Array of 8-15 important terms/names/concepts from the text
- "difficulty": "easy", "medium", or "hard" based on content complexity

Return ONLY valid JSON, no markdown, no explanation.

Example format:
{
  "title": "Photosynthesis Explained",
  "description": "How plants convert sunlight into energy",
  "themes": ["Plant Biology", "Cellular Processes", "Ecosystem Energy Flow"],
  "keyTerms": ["chlorophyll", "mitochondria", "glucose", "carbon dioxide"],
  "difficulty": "medium"
}`;

    try {
        const text = await callGemini(prompt);
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err) {
        console.error('Topic extraction error:', err);
        return {
            title: 'Custom Topic',
            description: 'Topics from uploaded material',
            themes: ['General Knowledge'],
            keyTerms: content.split(/\s+/).filter(w => w.length > 4).slice(0, 10),
            difficulty: 'medium'
        };
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

// ============================================
// File Upload & OCR Endpoints
// ============================================

// POST /api/upload-book - Upload book screenshots/images
app.post('/api/upload-book', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const gameType = req.body.gameType || 'general';
        const extractedTexts = [];

        // Process each uploaded file with Gemini Vision
        for (const file of req.files) {
            try {
                // Read file as base64
                const imageBuffer = fs.readFileSync(file.path);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = file.mimetype;

                // Use Gemini Vision to extract text
                const extractionPrompt = `Extract all readable text from this image. If it's a book page, extract the main content. If it contains educational material, preserve the key terms and concepts. Return only the extracted text, no explanations.`;

                const extractedText = await callGeminiVision(base64Image, mimeType, extractionPrompt);
                extractedTexts.push(extractedText);

                // Clean up uploaded file
                fs.unlinkSync(file.path);
            } catch (err) {
                console.error(`Error processing file ${file.filename}:`, err);
                // Clean up on error
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        if (extractedTexts.length === 0) {
            return res.status(500).json({ error: 'Failed to extract text from images' });
        }

        // Combine all extracted text
        const combinedContent = extractedTexts.join('\n\n---\n\n');

        // Extract topics based on game type
        const topicData = await extractTopicsFromContent(combinedContent, gameType);

        res.json({
            success: true,
            extractedText: combinedContent.slice(0, 500) + (combinedContent.length > 500 ? '...' : ''),
            topicData,
            filesProcessed: extractedTexts.length
        });

    } catch (err) {
        console.error('Upload processing error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/generate-from-book - Generate game content from book text
app.post('/api/generate-from-book', apiRateLimit, async (req, res) => {
    try {
        const { content, gameType, theme, count = 15 } = req.body;
        
        if (!content || !gameType) {
            return res.status(400).json({ error: 'Content and gameType are required' });
        }

        let result;
        
        switch (gameType) {
            case 'millionaire':
                result = await generateMillionaireFromBook(content, theme, count);
                break;
            case 'whoami':
                result = await generateWhoAmIFromBook(content, count);
                break;
            case 'taboo':
                result = await generateTabooFromBook(content, count);
                break;
            case 'hangman':
                result = await generateHangmanFromBook(content, count);
                break;
            case 'kelime':
                result = await generateKelimeFromBook(content, count);
                break;
            default:
                return res.status(400).json({ error: 'Unknown game type' });
        }

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Generation from book error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Game Content Generation from Book
// ============================================

async function generateMillionaireFromBook(content, theme, count) {
    const prompt = `Based on this educational content, create EXACTLY ${count} quiz questions for "Who Wants to Be a Millionaire".

Content:
"""
${content.slice(0, 4000)}
"""

Theme: ${theme || 'General Knowledge'}

Requirements:
- Questions 1-5: Easy (basic facts from content)
- Questions 6-10: Medium (understanding concepts)
- Questions 11-15: Hard (application/analysis)
- Each question has exactly 4 options
- Only ONE correct answer per question
- Questions must be based ONLY on the provided content

Return ONLY valid JSON array:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0
  }
]`;

    let text = await callGemini(prompt);
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const questions = JSON.parse(text);
    
    return { questions: questions.slice(0, count) };
}

async function generateWhoAmIFromBook(content, count) {
    const prompt = `Based on this educational content, extract ${count} important characters, people, historical figures, or entities mentioned.

Content:
"""
${content.slice(0, 4000)}
"""

Return ONLY a list of names, one per line. No descriptions, no numbering.

Example:
Albert Einstein
Marie Curie
Isaac Newton`;

    const text = await callGemini(prompt);
    const characters = text
        .split('\n')
        .map(l => l.replace(/^\d+[\.\)\-]\s*/, '').trim())
        .filter(l => l && l.length > 2 && l.length < 50);
    
    return { characters: characters.slice(0, count) };
}

async function generateTabooFromBook(content, count) {
    const prompt = `Based on this educational content, create ${count} Taboo game cards using key terms from the text.

Content:
"""
${content.slice(0, 4000)}
"""

For each card, provide:
- Main word (key term from content)
- 5 forbidden words (related terms that can't be said)

Return ONLY valid JSON:
[
  {
    "word": "Photosynthesis",
    "forbidden": ["chlorophyll", "sunlight", "plants", "energy", "leaves"]
  }
]`;

    let text = await callGemini(prompt);
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const cards = JSON.parse(text);
    
    return { cards: cards.slice(0, count) };
}

async function generateHangmanFromBook(content, count) {
    const prompt = `Based on this educational content, extract ${count} important words (4-12 letters) that represent key concepts.

Content:
"""
${content.slice(0, 4000)}
"""

Return ONLY a list of words, one per line. Only words with 4-12 letters, no proper nouns with spaces.

Example:
atom
molecule
cell
growth`;

    const text = await callGemini(prompt);
    const words = text
        .split('\n')
        .map(l => l.trim().toUpperCase())
        .filter(l => l.length >= 4 && l.length <= 12 && /^[A-Z]+$/.test(l));
    
    return { words: words.slice(0, count) };
}

async function generateKelimeFromBook(content, count) {
    const prompt = `Based on this educational content, create EXACTLY ${count} Turkish word game questions for "Kelime Oyunu".

Content:
"""
${content.slice(0, 4000)}
"""

Requirements:
- Questions should be in Turkish
- Answers should be single words (3-12 letters, UPPERCASE)
- Questions based on the content provided
- Vary difficulty level

Return ONLY valid JSON array:
[
  {
    "question": "Soru metni?",
    "answer": "CEVAP"
  }
]

No markdown, no explanation, just the JSON array.`;

    let text = await callGemini(prompt);
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const questions = JSON.parse(text);
    
    return { 
        questions: questions.slice(0, count).map(q => ({
            question: q.question,
            answer: q.answer.toUpperCase().trim()
        }))
    };
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

// ---- POST /api/generate-kelime (Kelime Oyunu questions) ----
app.post('/api/generate-kelime', apiRateLimit, async (req, res) => {
    const theme = sanitizeTheme(req.body.theme) || 'genel kültür';
    const count = sanitizeCount(req.body.count, 30);

    const prompt = `Generate EXACTLY ${count} Turkish word game questions for "Kelime Oyunu" about "${theme}".

Each question should have:
- A question in Turkish
- An answer (single word or short phrase, uppercase, no spaces if possible)
- Answers should be 3-12 letters
- Questions should vary in difficulty

Return ONLY valid JSON array:
[
  {
    "question": "Türkiye'nin başkenti neresidir?",
    "answer": "ANKARA"
  }
]

No markdown, no explanation, just the JSON array.`;

    try {
        let text = await callGemini(prompt);
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        const questions = JSON.parse(text);

        if (!Array.isArray(questions)) {
            throw new Error('Invalid response format');
        }

        // Validate and clean
        const validQuestions = questions.filter(q =>
            q.question && 
            q.answer && 
            q.answer.length >= 3 && 
            q.answer.length <= 12
        ).map(q => ({
            question: q.question,
            answer: q.answer.toUpperCase().trim()
        })).slice(0, count);

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
        let text = await callGemini(prompt);

        // Strip markdown code fences if present
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        const questions = JSON.parse(text);

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

// ---- Serve static files (after API routes) ----
app.use(express.static(__dirname));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
    console.log(`🎮 BerkAI Game Hub running → http://localhost:${PORT}`);
    console.log(`🔒 Security: Rate limiting enabled, CORS configured`);
    console.log(`📊 Max concurrent games: ${MAX_GAMES}`);
    console.log(`📁 File uploads: Enabled (max 10MB)`);
});
