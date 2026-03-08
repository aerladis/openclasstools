/* ============================================
   KELİME OYUNU LOGIC (SMARTBOARD)
   Self-contained with AI generation & wordlist control
   ============================================ */

// ============================================
// Game State
// ============================================
const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = typeof io !== 'undefined' ? io() : null;

let gameState = {
    questions: [],
    currentIndex: -1,
    currentWord: "",
    revealedLetters: [],
    currentScore: 0,
    potentialScore: 0,
    timeRemaining: 240,
    isTimerRunning: false,
    timerInterval: null
};

// ============================================
// DOM Elements
// ============================================
let questionText, lettersContainer, scoreDisplay, timerDisplay, waitingMsg;

// ============================================
// Particle Background
// ============================================
(function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let w, h, particles;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    const colors = ['rgba(14,165,233,.35)', 'rgba(99,102,241,.3)', 'rgba(168,85,247,.25)'];
    particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.5 + 1,
        dx: (Math.random() - .5) * .4,
        dy: (Math.random() - .5) * .4,
        c: colors[Math.floor(Math.random() * colors.length)]
    }));

    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.c;
            ctx.fill();
        }
        requestAnimationFrame(draw);
    }
    draw();
})();

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Create Game ID badge (fixed position like other games)
    const idDisplay = document.createElement('div');
    idDisplay.className = 'game-id-badge';
    idDisplay.textContent = `ID: ${gameId}`;
    document.body.appendChild(idDisplay);

    // Cache DOM elements
    questionText = document.getElementById('question-text');
    lettersContainer = document.getElementById('letters-container');
    scoreDisplay = document.getElementById('score-display');
    timerDisplay = document.getElementById('timer-display');
    waitingMsg = document.getElementById('waiting-msg');

    // Initialize displays
    updateTimerDisplay();
    if (scoreDisplay) scoreDisplay.textContent = '0';

    // Socket setup
    if (socket) {
        socket.emit('hostJoin', gameId, (response) => {
            if (response && response.success) {
                console.log('✅ Kelime Oyunu host connected:', response.gameId);
            } else {
                console.error('❌ Failed to join:', response?.error);
            }
        });

        // Admin requests state
        socket.on('hostSendState', () => {
            broadcastState();
        });

        // Admin sends commands
        socket.on('hostWordListUpdate', (data) => {
            if (data.questions) {
                gameState.questions = data.questions;
                console.log('📚 Wordlist updated:', data.questions.length, 'questions');
            }
        });

        // Handle admin actions
        socket.on('adminUpdate', (data) => {
            if (data.game !== 'Kelime Oyunu') return;
            handleAdminAction(data);
        });
    }

    // Initialize book upload if container exists
    initBookUpload();

    // AI Generation buttons
    const btnGenerateAI = document.getElementById('btn-generate-ai');
    const btnUseDefault = document.getElementById('btn-use-default');
    const themeInput = document.getElementById('theme-input');

    if (btnGenerateAI) {
        btnGenerateAI.addEventListener('click', async () => {
            const theme = themeInput ? themeInput.value.trim() : '';
            const success = await generateWithAI(theme, 20);
            if (success && waitingMsg) {
                waitingMsg.textContent = '✅ Sorular oluşturuldu! Admin panelinden oyunu başlatın.';
                waitingMsg.style.color = '#22c55e';
            }
        });
    }

    if (btnUseDefault) {
        btnUseDefault.addEventListener('click', () => {
            gameState.questions = [...DEFAULT_QUESTIONS];
            gameState.currentIndex = -1;
            if (waitingMsg) {
                waitingMsg.textContent = '✅ Varsayılan sorular yüklendi! Admin panelinden oyunu başlatın.';
                waitingMsg.style.color = '#22c55e';
            }
            broadcastState();
        });
    }
});

// ============================================
// Admin Action Handler
// ============================================
function handleAdminAction(data) {
    if (waitingMsg) waitingMsg.style.display = 'none';

    switch (data.action) {
        case 'NEW_QUESTION':
            loadQuestion(data.index || 0);
            break;
        case 'NEXT_QUESTION':
            nextQuestion();
            break;
        case 'PREV_QUESTION':
            prevQuestion();
            break;
        case 'REVEAL_LETTER':
            revealRandomLetter();
            break;
        case 'REVEAL_SPECIFIC':
            revealLetter(data.index);
            break;
        case 'TOGGLE_TIMER':
            toggleTimer();
            break;
        case 'RESET_TIMER':
            resetTimer();
            break;
        case 'CORRECT_ANSWER':
            handleCorrectAnswer();
            break;
        case 'PASS_QUESTION':
            handlePassQuestion();
            break;
        case 'ADD_POINTS':
            addPoints(data.points || 0);
            break;
    }

    broadcastState();
}

// ============================================
// Question Management
// ============================================
function loadQuestion(index) {
    if (gameState.questions.length === 0) {
        if (questionText) questionText.textContent = "Soru listesi boş! Admin panelinden soru ekleyin.";
        return;
    }

    if (index < 0) index = 0;
    if (index >= gameState.questions.length) index = gameState.questions.length - 1;

    gameState.currentIndex = index;
    const q = gameState.questions[index];
    
    gameState.currentWord = q.answer.toUpperCase().trim();
    gameState.revealedLetters = new Array(gameState.currentWord.length).fill(false);
    gameState.potentialScore = gameState.currentWord.length * 100;

    if (questionText) questionText.textContent = q.question;
    
    stopTimer();
    gameState.timeRemaining = 240;
    updateTimerDisplay();
    renderLetters();
}

function nextQuestion() {
    loadQuestion(gameState.currentIndex + 1);
}

function prevQuestion() {
    loadQuestion(gameState.currentIndex - 1);
}

// ============================================
// Letter Reveal Logic
// ============================================
function revealRandomLetter() {
    if (!gameState.currentWord) return;

    const hiddenIndices = [];
    gameState.revealedLetters.forEach((isRevealed, index) => {
        if (!isRevealed) hiddenIndices.push(index);
    });

    if (hiddenIndices.length > 0) {
        const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
        revealLetter(randomIndex);
    }
}

function revealLetter(index) {
    if (index < 0 || index >= gameState.currentWord.length) return;
    if (gameState.revealedLetters[index]) return;

    gameState.revealedLetters[index] = true;
    gameState.potentialScore = Math.max(0, gameState.potentialScore - 100);
    renderLetters();
    broadcastState();
}

function renderLetters() {
    if (!lettersContainer) return;
    lettersContainer.innerHTML = '';

    if (!gameState.currentWord) return;

    for (let i = 0; i < gameState.currentWord.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';

        if (gameState.revealedLetters[i]) {
            slot.textContent = gameState.currentWord[i];
            slot.classList.add('revealed');
        }

        slot.addEventListener('click', () => revealLetter(i));
        lettersContainer.appendChild(slot);
    }
}

// ============================================
// Timer Logic
// ============================================
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    if (!timerDisplay) return;
    timerDisplay.textContent = formatTime(gameState.timeRemaining);

    if (gameState.timeRemaining <= 30) {
        timerDisplay.classList.add('warning');
    } else {
        timerDisplay.classList.remove('warning');
    }
}

function startTimer() {
    if (gameState.isTimerRunning || gameState.timeRemaining <= 0) return;
    
    gameState.isTimerRunning = true;
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();

        if (gameState.timeRemaining <= 0) {
            stopTimer();
            broadcastState();
        }
    }, 1000);
}

function stopTimer() {
    if (!gameState.isTimerRunning) return;
    
    gameState.isTimerRunning = false;
    clearInterval(gameState.timerInterval);
}

function toggleTimer() {
    if (gameState.isTimerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

function resetTimer() {
    stopTimer();
    gameState.timeRemaining = 240;
    updateTimerDisplay();
}

// ============================================
// Scoring
// ============================================
function handleCorrectAnswer() {
    stopTimer();
    gameState.revealedLetters = new Array(gameState.currentWord.length).fill(true);
    gameState.currentScore += gameState.potentialScore;
    gameState.potentialScore = 0;
    
    if (scoreDisplay) scoreDisplay.textContent = gameState.currentScore;
    renderLetters();
}

function handlePassQuestion() {
    stopTimer();
    gameState.revealedLetters = new Array(gameState.currentWord.length).fill(true);
    gameState.potentialScore = 0;
    renderLetters();
}

function addPoints(points) {
    gameState.currentScore += points;
    if (scoreDisplay) scoreDisplay.textContent = gameState.currentScore;
}

// ============================================
// State Broadcasting
// ============================================
function broadcastState() {
    if (!socket) return;

    const currentQ = gameState.questions[gameState.currentIndex];

    socket.emit('hostUpdate', {
        gameId: gameId,
        game: 'Kelime Oyunu',
        type: 'kelime',
        currentIndex: gameState.currentIndex,
        totalQuestions: gameState.questions.length,
        currentWord: gameState.currentWord,
        question: currentQ ? currentQ.question : '',
        revealedLetters: gameState.revealedLetters,
        revealedCount: gameState.revealedLetters.filter(r => r).length,
        score: gameState.currentScore,
        potentialScore: gameState.potentialScore,
        timeRemaining: gameState.timeRemaining,
        isTimerRunning: gameState.isTimerRunning
    });

    // Also sync wordlist for admin editing
    socket.emit('syncWordList', {
        gameId: gameId,
        type: 'kelime',
        questions: gameState.questions
    });
}

// ============================================
// Book Upload Integration
// ============================================
function initBookUpload() {
    const container = document.getElementById('book-upload-container');
    if (!container || typeof BookUploadComponent === 'undefined') return;

    const bookUpload = new BookUploadComponent('book-upload-container', {
        gameType: 'kelime',
        onExtract: (data) => generateFromBook(data),
        onError: (error) => console.error('Book upload error:', error),
        onLoading: () => {}
    });
}

async function generateFromBook(data) {
    console.log('Generating Kelime Oyunu questions from book:', data.topicData.title);

    try {
        const response = await fetch('/api/generate-from-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: data.content,
                gameType: 'kelime',
                count: 20
            })
        });

        if (!response.ok) throw new Error('Failed to generate from book');

        const result = await response.json();
        if (result.success && result.questions && result.questions.length > 0) {
            gameState.questions = result.questions;
            gameState.currentIndex = -1;
            
            if (waitingMsg) {
                waitingMsg.textContent = `${result.questions.length} soru yüklendi! Admin panelinden başlatın.`;
                waitingMsg.style.display = 'block';
            }

            broadcastState();
        }
    } catch (err) {
        console.error('Book generation error:', err);
        alert('Soru oluşturma başarısız. Lütfen tekrar deneyin.');
    }
}

// ============================================
// AI Generation (Direct)
// ============================================
async function generateWithAI(theme, count = 20) {
    console.log('Generating AI questions for theme:', theme);

    try {
        const response = await fetch('/api/generate-kelime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count })
        });

        if (!response.ok) throw new Error('Failed to generate');

        const result = await response.json();
        if (result.success && result.questions && result.questions.length > 0) {
            gameState.questions = result.questions;
            gameState.currentIndex = -1;
            
            if (waitingMsg) {
                waitingMsg.textContent = `${result.questions.length} soru yüklendi! Admin panelinden başlatın.`;
                waitingMsg.style.display = 'block';
            }

            broadcastState();
            return true;
        }
    } catch (err) {
        console.error('AI generation error:', err);
        return false;
    }
}

// ============================================
// Default Questions (Fallback)
// ============================================
const DEFAULT_QUESTIONS = [
    { question: "Türkiye'nin başkenti neresidir?", answer: "ANKARA" },
    { question: "Dünyanın en büyük okyanusu hangisidir?", answer: "PASIFIK" },
    { question: "2 + 2 kaç eder?", answer: "DORT" },
    { question: "Güneş sisteminizdeki en büyük gezegen hangisidir?", answer: "JUPITER" },
    { question: "Su formülü nedir?", answer: "H2O" },
    { question: "Dünya üzerindeki en yüksek dağ hangisidir?", answer: "EVEREST" },
    { question: "Türkiye'nin en kalabalık şehri hangisidir?", answer: "ISTANBUL" },
    { question: "Yüzde 50'nin kesir gösterimi nedir?", answer: "1/2" },
    { question: "İnsan vücudundaki en büyük organ hangisidir?", answer: "DERI" },
    { question: "Türkiye'nin en uzun nehri hangisidir?", answer: "KIZILIRMAK" }
];

// Load defaults on startup
gameState.questions = [...DEFAULT_QUESTIONS];
