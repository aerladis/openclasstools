/* ============================================
   WHO WANTS TO BE A MILLIONAIRE
   Game Logic with Socket.IO Integration
   ============================================ */

// ============================================
// Book Upload Component
// ============================================

let bookUploadComponent = null;

function initBookUpload() {
    const container = document.getElementById('book-upload-container');
    if (!container) return;
    
    bookUploadComponent = new BookUploadComponent('book-upload-container', {
        gameType: 'millionaire',
        onExtract: (data) => {
            // Use extracted topic for game generation
            generateFromBook(data);
        },
        onError: (error) => {
            showNotification(error, 'error');
        },
        onLoading: (isLoading) => {
            // Handle loading state if needed
        }
    });
}

async function generateFromBook(data) {
    showScreen('loading');
    elements.loadingText.textContent = `Generating questions about "${data.topicData.title}"...`;

    try {
        const response = await fetch('/api/generate-from-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: data.content,
                gameType: 'millionaire',
                theme: data.topicData.title,
                count: 15
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate from book');
        }

        const result = await response.json();
        
        if (result.success && result.questions && result.questions.length >= 10) {
            startGame(result.questions.slice(0, 15));
        } else {
            throw new Error('Invalid question data');
        }
    } catch (err) {
        console.error('Book generation error:', err);
        alert('Failed to generate from book. Using default questions.');
        startGame(DEFAULT_QUESTIONS);
    }
}

// ============================================
// Game Data & Constants
// ============================================

const PRIZE_LADDER = [
    100, 200, 300, 500, 1000,
    2000, 4000, 8000, 16000, 32000,
    64000, 125000, 250000, 500000, 1000000
];

const SAFE_HAVEN_INDICES = [0, 5, 10]; // $100, $1000, $32000
const QUESTION_TIME = 30; // seconds

// ============================================
// Game State
// ============================================

let gameState = {
    questions: [],
    currentLevel: 0, // 0-14
    lifelines: {
        fiftyFifty: { used: false },
        phoneFriend: { used: false },
        askAudience: { used: false }
    },
    timer: null,
    timeRemaining: QUESTION_TIME,
    gameActive: false,
    selectedAnswer: null,
    isProcessing: false
};

// ============================================
// Socket.IO Setup
// ============================================

const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = typeof io !== 'undefined' ? io() : null;

if (socket) {
    socket.emit('hostJoin', gameId, (response) => {
        if (response && response.success) {
            console.log('✅ Millionaire host connected:', response.gameId);
        } else {
            console.error('❌ Failed to join:', response?.error);
        }
    });

    // Admin requests current state
    socket.on('hostSendState', () => {
        emitGameState();
    });

    // Admin sends commands (unified handler)
    socket.on('adminUpdate', (data) => {
        if (data.game !== 'Who Wants to Be a Millionaire') return;
        
        switch (data.action) {
            case 'USE_LIFELINE':
                if (data.lifeline) {
                    useLifeline(data.lifeline);
                }
                break;
            case 'TOGGLE_TIMER':
                toggleTimer();
                break;
            case 'START_GAME':
                if (data.questions && data.questions.length > 0) {
                    startGame(data.questions);
                } else {
                    startGame();
                }
                break;
            case 'NEXT_QUESTION':
                // For millionaire, next question is handled by answer selection
                // But admin can force next level
                if (gameState.gameActive && gameState.currentLevel < 14) {
                    gameState.currentLevel++;
                    loadQuestion();
                }
                break;
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
    });
}

// Debounced emit function to reduce Socket.IO traffic
let emitTimeout = null;
function emitGameState() {
    if (!socket || !gameState.gameActive) return;
    
    // Clear pending emit
    clearTimeout(emitTimeout);
    
    // Debounce by 100ms to batch rapid updates
    emitTimeout = setTimeout(() => {
        const currentQuestion = gameState.questions[gameState.currentLevel];
        const currentPrize = gameState.currentLevel > 0 ? PRIZE_LADDER[gameState.currentLevel - 1] : 0;

        socket.emit('hostUpdate', {
            gameId: gameId,
            type: 'millionaire',
            game: 'Who Wants to Be a Millionaire',
            level: gameState.currentLevel + 1,
            prize: currentPrize,
            targetPrize: PRIZE_LADDER[gameState.currentLevel],
            question: currentQuestion?.question,
            options: currentQuestion?.options,
            lifelines: gameState.lifelines,
            timeRemaining: gameState.timeRemaining,
            state: gameState.isProcessing ? 'processing' : 'playing'
        });
    }, 100);
}

// ============================================
// Default Questions (Fallback)
// ============================================

const DEFAULT_QUESTIONS = [
    { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
    { question: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "What is the largest planet in our solar system?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correct: 2 },
    { question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
    { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
    { question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"], correct: 2 },
    { question: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1 },
    { question: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], correct: 1 },
    { question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct: 1 },
    { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correct: 1 },
    { question: "What is the speed of light?", options: ["299,792 km/s", "199,792 km/s", "399,792 km/s", "499,792 km/s"], correct: 0 },
    { question: "What element has the atomic number 1?", options: ["Oxygen", "Carbon", "Hydrogen", "Helium"], correct: 2 },
    { question: "Who was the first person to step on the moon?", options: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "Michael Collins"], correct: 2 },
    { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
    { question: "In what year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correct: 2 }
];

// ============================================
// DOM Elements
// ============================================

const screens = {
    start: document.getElementById('start-screen'),
    help: document.getElementById('help-screen'),
    loading: document.getElementById('loading-screen'),
    game: document.getElementById('game-screen'),
    lifeline: document.getElementById('lifeline-screen'),
    result: document.getElementById('result-screen'),
    confirm: document.getElementById('confirm-screen')
};

const elements = {
    themeInput: document.getElementById('theme-input'),
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    answerBtns: [
        document.getElementById('answer-0'),
        document.getElementById('answer-1'),
        document.getElementById('answer-2'),
        document.getElementById('answer-3')
    ],
    answerTexts: [
        document.getElementById('answer-text-0'),
        document.getElementById('answer-text-1'),
        document.getElementById('answer-text-2'),
        document.getElementById('answer-text-3')
    ],
    timerCircle: document.getElementById('timer-circle'),
    timerDisplay: document.getElementById('timer-display'),
    prizeList: document.getElementById('prize-list'),
    lifelineBtns: {
        fiftyFifty: document.getElementById('lifeline-5050'),
        phone: document.getElementById('lifeline-phone'),
        audience: document.getElementById('lifeline-audience')
    },
    walkAwayAmount: document.getElementById('walk-away-amount'),
    loadingText: document.getElementById('loading-text'),
    lifelineTitle: document.getElementById('lifeline-title'),
    lifelineContent: document.getElementById('lifeline-content'),
    lifelineAnimation: document.getElementById('lifeline-animation'),
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    resultAmount: document.getElementById('result-amount'),
    resultDetails: document.getElementById('result-details')
};

// ============================================
// Screen Management (Optimized)
// ============================================

let currentScreen = null;

function showScreen(screenName) {
    if (currentScreen === screenName) return;
    currentScreen = screenName;
    
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
        // Batch DOM operations
        const screenList = Object.values(screens);
        for (const s of screenList) {
            s.classList.remove('active');
        }
        screens[screenName].classList.add('active');
    });
}

// ============================================
// Event Listeners
// ============================================

document.getElementById('btn-start-default').addEventListener('click', () => {
    startGame(DEFAULT_QUESTIONS);
});

document.getElementById('btn-start-ai').addEventListener('click', async () => {
    const theme = elements.themeInput.value.trim();
    await generateQuestions(theme);
});

document.getElementById('btn-how-to-play').addEventListener('click', () => {
    showScreen('help');
});

document.getElementById('btn-close-help').addEventListener('click', () => {
    showScreen('start');
});

document.getElementById('btn-close-lifeline').addEventListener('click', () => {
    showScreen('game');
});

document.getElementById('btn-play-again').addEventListener('click', () => {
    resetGame();
    showScreen('start');
});

document.getElementById('btn-walk-away').addEventListener('click', () => {
    showWalkAwayConfirm();
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    showScreen('game');
});

document.getElementById('btn-confirm').addEventListener('click', () => {
    walkAway();
});

// Lifeline buttons
elements.lifelineBtns.fiftyFifty.addEventListener('click', () => useLifeline('fiftyFifty'));
elements.lifelineBtns.phone.addEventListener('click', () => useLifeline('phoneFriend'));
elements.lifelineBtns.audience.addEventListener('click', () => useLifeline('askAudience'));

// Answer buttons
elements.answerBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => selectAnswer(index));
});

// ============================================
// Game Functions
// ============================================

async function generateQuestions(theme) {
    showScreen('loading');
    elements.loadingText.textContent = theme 
        ? `Generating questions about "${theme}"...` 
        : 'Generating questions...';

    try {
        const response = await fetch('/api/generate-millionaire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count: 15 })
        });

        if (!response.ok) {
            throw new Error('Failed to generate questions');
        }

        const data = await response.json();
        
        if (data.success && data.questions && data.questions.length >= 10) {
            startGame(data.questions.slice(0, 15));
        } else {
            throw new Error('Invalid question data');
        }
    } catch (err) {
        console.error('Generation error:', err);
        alert('Failed to generate questions. Using default questions instead.');
        startGame(DEFAULT_QUESTIONS);
    }
}

function startGame(questions) {
    gameState.questions = questions;
    gameState.currentLevel = 0;
    gameState.lifelines = {
        fiftyFifty: { used: false },
        phoneFriend: { used: false },
        askAudience: { used: false }
    };
    gameState.gameActive = true;
    gameState.isProcessing = false;

    createPrizeLadder();
    updateLifelineButtons();
    loadQuestion();
    showScreen('game');
    emitGameState();
}

function createPrizeLadder() {
    elements.prizeList.innerHTML = '';
    
    // Reverse order for display (highest at top)
    for (let i = PRIZE_LADDER.length - 1; i >= 0; i--) {
        const prize = PRIZE_LADDER[i];
        const item = document.createElement('div');
        item.className = 'prize-item';
        item.textContent = `$${prize.toLocaleString()}`;
        item.dataset.index = i;
        
        if (SAFE_HAVEN_INDICES.includes(i)) {
            item.classList.add('safe-haven');
        }
        
        elements.prizeList.appendChild(item);
    }
}

function updatePrizeLadder() {
    const items = elements.prizeList.querySelectorAll('.prize-item');
    const currentLevel = gameState.currentLevel;
    
    // Batch class updates for better performance
    requestAnimationFrame(() => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const index = parseInt(item.dataset.index);
            const isCurrent = index === currentLevel;
            const isCompleted = index < currentLevel;
            
            // Only update if classes need to change
            if (isCurrent && !item.classList.contains('current')) {
                item.classList.remove('completed');
                item.classList.add('current');
            } else if (isCompleted && !item.classList.contains('completed')) {
                item.classList.remove('current');
                item.classList.add('completed');
            } else if (!isCurrent && !isCompleted) {
                item.classList.remove('current', 'completed');
            }
        }
    });
}

function loadQuestion() {
    const question = gameState.questions[gameState.currentLevel];
    if (!question) {
        endGame(true);
        return;
    }

    // Batch DOM updates in a single frame
    requestAnimationFrame(() => {
        // Reset UI
        elements.questionNumber.textContent = `Question ${gameState.currentLevel + 1} of 15`;
        elements.questionText.textContent = question.question;
        
        // Batch answer button updates
        for (let i = 0; i < 4; i++) {
            const btn = elements.answerBtns[i];
            btn.className = 'answer-btn';
            btn.disabled = false;
            btn.style.display = 'flex';
            elements.answerTexts[i].textContent = question.options[i] || '-';
        }

        // Update walk away amount
        const walkAwayAmount = gameState.currentLevel > 0 ? PRIZE_LADDER[gameState.currentLevel - 1] : 0;
        elements.walkAwayAmount.textContent = walkAwayAmount.toLocaleString();

        updatePrizeLadder();
    });

    startTimer();
    gameState.selectedAnswer = null;
    gameState.isProcessing = false;
    emitGameState();
}

function startTimer() {
    clearInterval(gameState.timer);
    gameState.timeRemaining = QUESTION_TIME;
    updateTimerDisplay();

    let lastUpdate = Date.now();
    
    gameState.timer = setInterval(() => {
        const now = Date.now();
        // Skip if less than 1 second passed (handles tab throttling)
        if (now - lastUpdate < 900) return;
        lastUpdate = now;
        
        gameState.timeRemaining--;
        updateTimerDisplay();

        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timer);
            timeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    // Only update text content (cheap operation)
    elements.timerDisplay.textContent = gameState.timeRemaining;
    
    // Use CSS custom property instead of direct style manipulation for better performance
    const progress = gameState.timeRemaining / QUESTION_TIME;
    elements.timerCircle.style.setProperty('--timer-progress', progress);

    // Batch class changes
    const circle = elements.timerCircle;
    const shouldBeDanger = gameState.timeRemaining <= 10;
    const shouldBeWarning = gameState.timeRemaining <= 20 && !shouldBeDanger;
    
    if (shouldBeDanger && !circle.classList.contains('danger')) {
        circle.classList.remove('warning');
        circle.classList.add('danger');
    } else if (shouldBeWarning && !circle.classList.contains('warning')) {
        circle.classList.remove('danger');
        circle.classList.add('warning');
    } else if (!shouldBeDanger && !shouldBeWarning) {
        circle.classList.remove('warning', 'danger');
    }
}

function timeUp() {
    gameState.isProcessing = true;
    endGame(false, "Time's up!");
}

function selectAnswer(index) {
    if (gameState.isProcessing || !gameState.gameActive) return;
    
    gameState.isProcessing = true;
    clearInterval(gameState.timer);
    gameState.selectedAnswer = index;

    // Highlight selected
    elements.answerBtns[index].classList.add('selected');

    // Simulate suspense
    setTimeout(() => {
        const question = gameState.questions[gameState.currentLevel];
        const isCorrect = index === question.correct;

        if (isCorrect) {
            elements.answerBtns[index].classList.remove('selected');
            elements.answerBtns[index].classList.add('correct');
            
            setTimeout(() => {
                gameState.currentLevel++;
                if (gameState.currentLevel >= 15) {
                    endGame(true);
                } else {
                    loadQuestion();
                }
            }, 1500);
        } else {
            elements.answerBtns[index].classList.remove('selected');
            elements.answerBtns[index].classList.add('wrong');
            elements.answerBtns[question.correct].classList.add('correct');
            
            setTimeout(() => {
                endGame(false);
            }, 2000);
        }
    }, 2000);
}

// ============================================
// Lifelines
// ============================================

function useLifeline(lifeline) {
    if (gameState.lifelines[lifeline].used || gameState.isProcessing) return;

    gameState.lifelines[lifeline].used = true;
    updateLifelineButtons();
    emitGameState();

    switch (lifeline) {
        case 'fiftyFifty':
            useFiftyFifty();
            break;
        case 'phoneFriend':
            usePhoneFriend();
            break;
        case 'askAudience':
            useAskAudience();
            break;
    }
}

function updateLifelineButtons() {
    Object.entries(gameState.lifelines).forEach(([name, data]) => {
        const btn = elements.lifelineBtns[name === 'fiftyFifty' ? 'fiftyFifty' : name === 'phoneFriend' ? 'phone' : 'audience'];
        if (data.used) {
            btn.disabled = true;
            btn.classList.add('used');
        }
    });
}

function useFiftyFifty() {
    const question = gameState.questions[gameState.currentLevel];
    const correct = question.correct;
    const wrongAnswers = [0, 1, 2, 3].filter(i => i !== correct);
    const toRemove = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 2);

    toRemove.forEach(index => {
        elements.answerBtns[index].classList.add('hidden');
    });
}

function usePhoneFriend() {
    showScreen('lifeline');
    elements.lifelineAnimation.textContent = '📞';
    elements.lifelineTitle.textContent = 'Phone a Friend';

    const question = gameState.questions[gameState.currentLevel];
    const correct = question.correct;

    // Simulate calling
    elements.lifelineContent.innerHTML = '<p>Calling...</p>';

    setTimeout(() => {
        const confidence = Math.random();
        let hint;
        
        if (confidence > 0.7) {
            hint = `I'm pretty sure it's ${question.options[correct]}!`;
        } else if (confidence > 0.4) {
            const wrongOptions = [0, 1, 2, 3].filter(i => i !== correct);
            const guess = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
            hint = `I think it might be ${question.options[guess]}, but I'm not sure...`;
        } else {
            hint = "I have no idea, sorry!";
        }

        elements.lifelineContent.innerHTML = `<p class="phone-hint">"${hint}"</p>`;
    }, 2000);
}

function useAskAudience() {
    showScreen('lifeline');
    elements.lifelineAnimation.textContent = '👥';
    elements.lifelineTitle.textContent = 'Ask the Audience';

    const question = gameState.questions[gameState.currentLevel];
    const correct = question.correct;

    // Generate realistic poll results (correct answer usually higher)
    let percentages = [0, 0, 0, 0];
    const correctPercent = 40 + Math.floor(Math.random() * 35); // 40-75%
    percentages[correct] = correctPercent;

    let remaining = 100 - correctPercent;
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== correct);
    
    wrongIndices.forEach((index, i) => {
        if (i === wrongIndices.length - 1) {
            percentages[index] = remaining;
        } else {
            const share = Math.floor(Math.random() * remaining * 0.6);
            percentages[index] = share;
            remaining -= share;
        }
    });

    // Create bar chart
    const labels = ['A', 'B', 'C', 'D'];
    let chartHTML = '<div class="audience-chart">';
    
    percentages.forEach((pct, i) => {
        chartHTML += `
            <div class="audience-bar">
                <div class="bar-fill" style="height: ${pct * 1.2}px">${pct}%</div>
                <div class="bar-label">${labels[i]}</div>
            </div>
        `;
    });
    
    chartHTML += '</div>';
    elements.lifelineContent.innerHTML = chartHTML;
}

// ============================================
// Game End / Walk Away
// ============================================

function showWalkAwayConfirm() {
    const currentPrize = gameState.currentLevel > 0 ? PRIZE_LADDER[gameState.currentLevel - 1] : 0;
    
    document.getElementById('confirm-title').textContent = 'Walk Away?';
    document.getElementById('confirm-message').textContent = 
        `You'll take home $${currentPrize.toLocaleString()}. Are you sure?`;
    
    showScreen('confirm');
}

function walkAway() {
    clearInterval(gameState.timer);
    const currentPrize = gameState.currentLevel > 0 ? PRIZE_LADDER[gameState.currentLevel - 1] : 0;
    endGame(false, 'walkAway', currentPrize);
}

function endGame(won, reason = '', walkAwayAmount = null) {
    gameState.gameActive = false;
    clearInterval(gameState.timer);

    let amount, title, message, icon, details;

    if (won) {
        amount = 1000000;
        title = '🎉 Congratulations!';
        message = 'You are a Millionaire!';
        icon = '💰';
        details = 'You answered all 15 questions correctly!';
    } else if (walkAwayAmount !== null) {
        amount = walkAwayAmount;
        title = '🏃 You Walked Away';
        message = 'You chose to walk away with';
        icon = '🏃';
        details = `Smart move! You secured $${amount.toLocaleString()}.`;
    } else {
        // Calculate safe haven
        let safeHaven = 0;
        for (const index of SAFE_HAVEN_INDICES) {
            if (gameState.currentLevel > index) {
                safeHaven = PRIZE_LADDER[index];
            }
        }
        amount = safeHaven;
        title = '❌ Game Over';
        message = reason || 'Wrong answer!';
        icon = '❌';
        details = safeHaven > 0 
            ? `But you kept $${safeHaven.toLocaleString()} from your safe haven!`
            : 'Better luck next time!';
    }

    elements.resultIcon.textContent = icon;
    elements.resultTitle.textContent = title;
    elements.resultMessage.textContent = message;
    elements.resultAmount.textContent = `$${amount.toLocaleString()}`;
    elements.resultDetails.textContent = details;

    showScreen('result');

    if (socket) {
        socket.emit('hostUpdate', {
            gameId: gameId,
            type: 'millionaire',
            game: 'Who Wants to Be a Millionaire',
            state: 'finished',
            finalAmount: amount,
            won: won
        });
    }
}

function resetGame() {
    gameState = {
        questions: [],
        currentLevel: 0,
        lifelines: {
            fiftyFifty: { used: false },
            phoneFriend: { used: false },
            askAudience: { used: false }
        },
        timer: null,
        timeRemaining: QUESTION_TIME,
        gameActive: false,
        selectedAnswer: null,
        isProcessing: false
    };

    Object.values(elements.lifelineBtns).forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('used');
    });
}

// ============================================
// Optimized Particle Background
// ============================================

(function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let w, h, particles;
    let animationId;
    let isVisible = true;

    // Throttled resize handler
    let resizeTimeout;
    function resize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }, 100);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Reduced particle count for better performance (30 instead of 60)
    const C = ['rgba(168,85,247,.35)', 'rgba(99,102,241,.3)', 'rgba(236,72,153,.25)'];
    particles = Array.from({ length: 30 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 1,
        dx: (Math.random() - .5) * .3,
        dy: (Math.random() - .5) * .3,
        c: C[Math.floor(Math.random() * C.length)]
    }));

    // Use visibility API to pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        isVisible = document.visibilityState === 'visible';
        if (isVisible && !animationId) {
            draw();
        }
    });

    let frameCount = 0;
    function draw() {
        if (!isVisible) {
            animationId = null;
            return;
        }

        // Render every 2nd frame for 30fps (smoother than 60fps but less CPU)
        frameCount++;
        if (frameCount % 2 !== 0) {
            animationId = requestAnimationFrame(draw);
            return;
        }

        ctx.clearRect(0, 0, w, h);
        
        // Batch draw operations
        ctx.save();
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
        ctx.restore();
        
        animationId = requestAnimationFrame(draw);
    }
    draw();
})();

// ============================================
// Add Game ID Badge
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const idDisplay = document.createElement('div');
    idDisplay.className = 'game-id-badge';
    idDisplay.textContent = `Game ID: ${gameId}`;
    document.body.appendChild(idDisplay);
    
    // Initialize book upload component
    initBookUpload();
});
