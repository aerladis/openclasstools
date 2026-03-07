/* ============================================
   HANGMAN – Game Logic
   ============================================ */

const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = typeof io !== 'undefined' ? io() : null;

if (socket) {
    socket.emit('hostJoin', gameId);

    socket.on('hostSendState', () => {
        // Admin joined, send current state and full word list
        emitGameState(gameActive ? 'playing' : (gameOverEl.style.display !== 'none' ? 'gameOver' : 'waiting'));
        socket.emit('syncWordList', { gameId, type: 'hangman', words: wordList });
    });

    socket.on('hostWordListUpdate', (data) => {
        if (data.words) {
            wordList = data.words;
            // Optionally clear used words if list changed significantly
        }
    });
}

function emitGameState(status = 'playing', won = false) {
    if (!socket) return;

    // Format revealed word
    const stateStr = [...currentWord].map(ch => {
        if (ch === ' ') return '  '; // Double space for visual separation
        return guessedLetters.has(ch) ? ch : '_';
    }).join(' ');

    socket.emit('hostUpdate', {
        gameId: gameId,
        game: 'Hangman',
        status: status,
        won: won,
        word: currentWord,
        category: currentCat,
        wrongCount: wrongCount,
        currentState: stateStr
    });
}

// ---- Default word list with categories ----
const DEFAULT_WORDS = [
    { word: "ELEPHANT", cat: "Animals" },
    { word: "GUITAR", cat: "Music" },
    { word: "PYRAMID", cat: "Landmarks" },
    { word: "CHOCOLATE", cat: "Food" },
    { word: "ASTRONAUT", cat: "Space" },
    { word: "VOLCANO", cat: "Nature" },
    { word: "LIBRARY", cat: "Places" },
    { word: "PENGUIN", cat: "Animals" },
    { word: "HURRICANE", cat: "Nature" },
    { word: "SAXOPHONE", cat: "Music" },
    { word: "KANGAROO", cat: "Animals" },
    { word: "ESPRESSO", cat: "Food" },
    { word: "TELESCOPE", cat: "Science" },
    { word: "MARATHON", cat: "Sports" },
    { word: "DIAMOND", cat: "Objects" },
    { word: "CROCODILE", cat: "Animals" },
    { word: "BUTTERFLY", cat: "Animals" },
    { word: "AVALANCHE", cat: "Nature" },
    { word: "SPAGHETTI", cat: "Food" },
    { word: "CHAMELEON", cat: "Animals" },
    { word: "PARACHUTE", cat: "Objects" },
    { word: "ISTANBUL", cat: "Cities" },
    { word: "ORIGAMI", cat: "Art" },
    { word: "DOLPHIN", cat: "Animals" },
    { word: "NEPTUNE", cat: "Space" },
    { word: "CINNAMON", cat: "Food" },
    { word: "BROCCOLI", cat: "Food" },
    { word: "UMBRELLA", cat: "Objects" },
    { word: "COMPASS", cat: "Objects" },
    { word: "GIRAFFE", cat: "Animals" },
    { word: "TREASURE", cat: "Adventure" },
    { word: "SKELETON", cat: "Science" },
    { word: "HYDROGEN", cat: "Science" },
    { word: "ORCHESTRA", cat: "Music" },
    { word: "CATHEDRAL", cat: "Places" },
    { word: "PLATINUM", cat: "Science" },
    { word: "SCORPION", cat: "Animals" },
    { word: "SANDWICH", cat: "Food" },
    { word: "MUSTARD", cat: "Food" },
    { word: "COCONUT", cat: "Food" },
    { word: "JUPITER", cat: "Space" },
    { word: "MERCURY", cat: "Space" },
    { word: "SATURN", cat: "Space" },
    { word: "RAINBOW", cat: "Nature" },
    { word: "PHOENIX", cat: "Mythology" },
    { word: "LABYRINTH", cat: "Mythology" },
    { word: "SAMURAI", cat: "History" },
    { word: "GLADIATOR", cat: "History" },
    { word: "ALGORITHM", cat: "Technology" },
    { word: "BLUETOOTH", cat: "Technology" },
    { word: "WIRELESS", cat: "Technology" },
    { word: "DINOSAUR", cat: "History" },
    { word: "FIREWORKS", cat: "Objects" },
    { word: "GONDOLA", cat: "Transport" },
    { word: "HAMMOCK", cat: "Objects" },
    { word: "AQUARIUM", cat: "Places" },
    { word: "BLIZZARD", cat: "Nature" },
    { word: "FLAMINGO", cat: "Animals" },
    { word: "CHEETAH", cat: "Animals" },
    { word: "MANGO", cat: "Food" },
    { word: "PISTACHIO", cat: "Food" },
    { word: "AVOCADO", cat: "Food" },
    { word: "PINEAPPLE", cat: "Food" },
    { word: "ICEBERG", cat: "Nature" },
    { word: "TORNADO", cat: "Nature" },
    { word: "GALAXY", cat: "Space" },
    { word: "ECLIPSE", cat: "Space" },
    { word: "WATERFALL", cat: "Nature" },
    { word: "ALPHABET", cat: "Language" },
    { word: "CHAMPION", cat: "Sports" },
    { word: "FORTRESS", cat: "Places" },
    { word: "KEYBOARD", cat: "Technology" },
    { word: "BACKPACK", cat: "Objects" },
    { word: "CALENDAR", cat: "Objects" },
    { word: "MOSQUITO", cat: "Animals" },
    { word: "TITANIUM", cat: "Science" },
    { word: "ISTANBUL", cat: "Cities" },
    { word: "AMAZON", cat: "Nature" },
    { word: "ATLANTIC", cat: "Geography" },
    { word: "PACIFIC", cat: "Geography" },
];

let wordList = [...DEFAULT_WORDS];
const MAX_WRONG = 6;
const BODY_PARTS = ['hm-head', 'hm-body', 'hm-larm', 'hm-rarm', 'hm-lleg', 'hm-rleg'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---- DOM refs ----
const screenStart = document.getElementById('screen-start');
const screenGame = document.getElementById('screen-game');
const btnPlay = document.getElementById('btn-play');
const wordDisplay = document.getElementById('word-display');
const categoryHint = document.getElementById('category-hint');
const keyboard = document.getElementById('keyboard');
const gameOverEl = document.getElementById('game-over');
const gameOverIcon = document.getElementById('game-over-icon');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverWord = document.getElementById('game-over-word');
const btnPlayAgain = document.getElementById('btn-play-again');

// ---- Game state ----
let currentWord = '';
let currentCat = '';
let guessedLetters = new Set();
let wrongCount = 0;
let gameActive = false;
let usedWords = [];

// ---- Helpers ----
function showScreen(el) {
    [screenStart, screenGame].forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

function pickWord() {
    let available = wordList.filter(w => !usedWords.includes(w.word));
    if (available.length === 0) { usedWords = []; available = [...wordList]; }
    const pick = available[Math.floor(Math.random() * available.length)];
    usedWords.push(pick.word);
    return pick;
}

// ---- Build keyboard ----
function buildKeyboard() {
    keyboard.innerHTML = '';
    for (const l of LETTERS) {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.textContent = l;
        btn.dataset.letter = l;
        btn.addEventListener('click', () => handleGuess(l, btn));
        keyboard.appendChild(btn);
    }
}

// ---- Render word ----
function renderWord() {
    wordDisplay.innerHTML = '';
    for (const ch of currentWord) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';
        if (ch === ' ') {
            slot.classList.add('space');
        } else if (guessedLetters.has(ch)) {
            slot.textContent = ch;
            slot.classList.add('revealed');
        }
        wordDisplay.appendChild(slot);
    }
}

// ---- Reset gallows ----
function resetGallows() {
    BODY_PARTS.forEach(id => document.getElementById(id).classList.remove('visible'));
}

// ---- Handle guess ----
function handleGuess(letter, btn) {
    if (!gameActive || guessedLetters.has(letter)) return;
    guessedLetters.add(letter);
    btn.disabled = true;

    if (currentWord.includes(letter)) {
        btn.classList.add('correct');
        renderWord();
        // Check win
        const wordLetters = new Set(currentWord.replace(/ /g, '').split(''));
        const allGuessed = [...wordLetters].every(l => guessedLetters.has(l));
        if (allGuessed) {
            endGame(true);
        } else {
            emitGameState('playing');
        }
    } else {
        btn.classList.add('wrong');
        document.getElementById(BODY_PARTS[wrongCount]).classList.add('visible');
        wrongCount++;
        if (wrongCount >= MAX_WRONG) {
            endGame(false);
        } else {
            emitGameState('playing');
        }
    }
}

// ---- Physical keyboard support ----
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    const letter = e.key.toUpperCase();
    if (LETTERS.includes(letter) && !guessedLetters.has(letter)) {
        const btn = keyboard.querySelector(`[data-letter="${letter}"]`);
        if (btn && !btn.disabled) handleGuess(letter, btn);
    }
});

// ---- Start game ----
function startGame() {
    const pick = pickWord();
    currentWord = pick.word;
    currentCat = pick.cat;
    guessedLetters = new Set();
    wrongCount = 0;
    gameActive = true;

    resetGallows();
    buildKeyboard();
    renderWord();
    categoryHint.textContent = currentCat ? `Category: ${currentCat}` : '';
    gameOverEl.style.display = 'none';
    showScreen(screenGame);
    emitGameState('playing');
}

// ---- End game ----
function endGame(won) {
    gameActive = false;
    // Reveal all letters
    const slots = wordDisplay.querySelectorAll('.letter-slot:not(.space)');
    const letters = currentWord.replace(/ /g, '').split('');
    slots.forEach((slot, i) => { slot.textContent = letters[i]; slot.classList.add('revealed'); });

    // Disable all keys
    keyboard.querySelectorAll('.key-btn').forEach(b => b.disabled = true);

    emitGameState('gameOver', won);

    setTimeout(() => {
        gameOverIcon.textContent = won ? '🎉' : '💀';
        gameOverTitle.textContent = won ? 'You Won!' : 'Game Over';
        gameOverWord.textContent = currentWord;
        gameOverEl.style.display = '';
    }, 600);
}

// ---- Events ----
btnPlay.addEventListener('click', startGame);
btnPlayAgain.addEventListener('click', () => {
    gameOverEl.style.display = 'none';
    startGame();
});

// ---- AI Generation ----
const btnGenerate = document.getElementById('btn-generate');
const wordTheme = document.getElementById('word-theme');
const wordCount = document.getElementById('word-count');
const generateStatus = document.getElementById('generate-status');

btnGenerate.addEventListener('click', async () => {
    const theme = wordTheme.value.trim();
    const count = parseInt(wordCount.value, 10) || 20;
    if (!theme) return;

    btnGenerate.disabled = true;
    btnGenerate.classList.add('loading');
    generateStatus.textContent = 'Generating words…';
    generateStatus.className = 'generate-status';

    try {
        const res = await fetch('/api/generate-hangman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');

        if (data.words && data.words.length > 0) {
            wordList = data.words.map(w => typeof w === 'string' ? { word: w, cat: theme } : w);
            usedWords = [];
            generateStatus.textContent = `✓ Generated ${data.words.length} words!`;
            generateStatus.className = 'generate-status success';

            // Sync new list to admin
            if (socket) {
                socket.emit('syncWordList', { gameId, type: 'hangman', words: wordList });
            }
        } else {
            throw new Error('No words returned');
        }
    } catch (err) {
        generateStatus.textContent = `✗ ${err.message}`;
        generateStatus.className = 'generate-status error';
    } finally {
        btnGenerate.disabled = false;
        btnGenerate.classList.remove('loading');
    }
});

// ---- Game ID UI ----
document.addEventListener('DOMContentLoaded', () => {
    const idDisplay = document.createElement('div');
    idDisplay.className = 'game-id-badge';
    idDisplay.textContent = `Game ID: ${gameId}`;
    document.body.appendChild(idDisplay);

    // Sync initial word list to admin if already connected
    if (socket) socket.emit('syncWordList', { gameId, type: 'hangman', words: wordList });
});

// ---- Particle background ----
(function () {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let w, h, pts;
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();
    const C = ['rgba(168,85,247,.35)', 'rgba(99,102,241,.3)', 'rgba(236,72,153,.25)'];
    pts = Array.from({ length: 60 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 2.5 + 1,
        dx: (Math.random() - .5) * .4, dy: (Math.random() - .5) * .4,
        c: C[Math.floor(Math.random() * C.length)]
    }));
    (function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.c; ctx.fill();
        }
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 120) {
                ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
                ctx.strokeStyle = `rgba(168,85,247,${.12 * (1 - d / 120)})`; ctx.lineWidth = .6; ctx.stroke();
            }
        }
        requestAnimationFrame(draw);
    })();
})();
