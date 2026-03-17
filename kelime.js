/* ============================================
   WORD GAME LOGIC (SMARTBOARD)
   ============================================ */

const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = typeof io !== 'undefined' ? io() : null;

const DEFAULT_QUESTIONS = [
    { question: 'What is the capital of France?', answer: 'PARIS' },
    { question: 'What is the largest ocean on Earth?', answer: 'PACIFIC' },
    { question: 'Which planet is the biggest in our solar system?', answer: 'JUPITER' },
    { question: 'What is the chemical formula for water?', answer: 'H2O' },
    { question: 'What is the largest city in Japan?', answer: 'TOKYO' },
    { question: 'What is the largest organ in the human body?', answer: 'SKIN' },
    { question: 'What is the highest mountain on Earth?', answer: 'EVEREST' },
    { question: 'What fraction is equal to fifty percent?', answer: 'HALF' },
    { question: 'What is the longest river in South America?', answer: 'AMAZON' },
    { question: 'What is two plus two?', answer: 'FOUR' }
];

let gameState = {
    questions: [],
    currentIndex: -1,
    currentWord: '',
    revealedLetters: [],
    currentScore: 0,
    potentialScore: 0,
    timeRemaining: 240,
    isTimerRunning: false,
    timerInterval: null,
    roundState: 'waiting'
};

const soundState = {
    enabled: true,
    audioContext: null,
    masterGain: null,
    lastTimerCue: null
};

let questionText;
let lettersContainer;
let scoreDisplay;
let timerDisplay;
let waitingMsg;
let themeInput;
let roundResultOverlay;
let roundResultKicker;
let roundResultTitle;
let roundResultMessage;
let roundResultScore;

function ensureAudioContext() {
    if (!soundState.enabled) return null;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!soundState.audioContext) {
        soundState.audioContext = new AudioContextClass();
        soundState.masterGain = soundState.audioContext.createGain();
        soundState.masterGain.gain.value = 0.14;
        soundState.masterGain.connect(soundState.audioContext.destination);
    }

    if (soundState.audioContext.state === 'suspended') {
        soundState.audioContext.resume().catch(() => {});
    }

    return soundState.audioContext;
}

function playTone(frequency, duration, options = {}) {
    const audioContext = ensureAudioContext();
    if (!audioContext || !soundState.masterGain) return;

    const {
        type = 'sine',
        volume = 0.22,
        attack = 0.01,
        release = 0.12,
        delay = 0,
        slideTo = null
    } = options;

    const startTime = audioContext.currentTime + delay;
    const endTime = startTime + duration;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(frequency, 1), startTime);

    if (slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), endTime);
    }

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime + release);

    oscillator.connect(gainNode);
    gainNode.connect(soundState.masterGain);

    oscillator.start(startTime);
    oscillator.stop(endTime + release + 0.02);
}

function playSound(name) {
    if (!soundState.enabled) return;

    switch (name) {
        case 'start':
            playTone(392, 0.1, { type: 'triangle', volume: 0.14 });
            playTone(523.25, 0.12, { type: 'triangle', volume: 0.12, delay: 0.08 });
            playTone(659.25, 0.16, { type: 'triangle', volume: 0.11, delay: 0.16 });
            break;
        case 'sync':
            playTone(440, 0.06, { type: 'sine', volume: 0.08 });
            playTone(660, 0.08, { type: 'sine', volume: 0.07, delay: 0.06 });
            break;
        case 'question':
            playTone(392, 0.14, { type: 'triangle', volume: 0.16 });
            playTone(587.33, 0.18, { type: 'triangle', volume: 0.12, delay: 0.12 });
            playTone(783.99, 0.2, { type: 'triangle', volume: 0.1, delay: 0.24 });
            break;
        case 'reveal':
            playTone(740, 0.07, { type: 'sine', volume: 0.08 });
            playTone(988, 0.1, { type: 'sine', volume: 0.07, delay: 0.07 });
            break;
        case 'correct':
            playTone(523.25, 0.12, { type: 'triangle', volume: 0.17 });
            playTone(659.25, 0.12, { type: 'triangle', volume: 0.15, delay: 0.12 });
            playTone(783.99, 0.22, { type: 'triangle', volume: 0.13, delay: 0.24 });
            break;
        case 'pass':
            playTone(440, 0.08, { type: 'square', volume: 0.07 });
            playTone(329.63, 0.18, { type: 'square', volume: 0.06, delay: 0.08 });
            break;
        case 'resume':
            playTone(660, 0.08, { type: 'triangle', volume: 0.09 });
            playTone(880, 0.12, { type: 'triangle', volume: 0.08, delay: 0.08 });
            break;
        case 'pause':
            playTone(560, 0.08, { type: 'triangle', volume: 0.08 });
            playTone(420, 0.12, { type: 'triangle', volume: 0.06, delay: 0.08 });
            break;
        case 'timeout':
            playTone(300, 0.16, { type: 'sawtooth', volume: 0.09, slideTo: 180 });
            playTone(180, 0.24, { type: 'sawtooth', volume: 0.06, delay: 0.14, slideTo: 110 });
            break;
        case 'tick':
            playTone(1046.5, 0.04, { type: 'square', volume: 0.05 });
            break;
    }
}

function initSoundControls() {
    document.addEventListener('pointerdown', ensureAudioContext, { once: true });
    document.addEventListener('keydown', ensureAudioContext, { once: true });
}

function normalizeQuestion(question = {}) {
    return {
        question: String(question.question ?? '').trim(),
        answer: String(question.answer ?? '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '')
    };
}

function sortQuestionsByAnswerLength(questions) {
    return [...questions].sort((left, right) => {
        const leftAnswer = String(left.answer ?? '');
        const rightAnswer = String(right.answer ?? '');
        const lengthDiff = leftAnswer.length - rightAnswer.length;

        if (lengthDiff !== 0) return lengthDiff;

        return leftAnswer.localeCompare(rightAnswer) || String(left.question ?? '').localeCompare(String(right.question ?? ''));
    });
}

function normalizeQuestions(questions) {
    if (!Array.isArray(questions)) return [];

    return sortQuestionsByAnswerLength(questions
        .map(normalizeQuestion)
        .filter((item) => item.question && item.answer && item.answer.length >= 2));
}

function setStatusMessage(message, color = '#cbd5e1') {
    if (!waitingMsg) return;

    waitingMsg.textContent = message;
    waitingMsg.style.color = color;
    waitingMsg.style.display = 'block';
}

function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    const colors = ['rgba(56,189,248,.35)', 'rgba(79,70,229,.28)', 'rgba(251,191,36,.18)'];
    particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.5 + 1,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        c: colors[Math.floor(Math.random() * colors.length)]
    }));

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (const particle of particles) {
            particle.x += particle.dx;
            particle.y += particle.dy;

            if (particle.x < 0) particle.x = width;
            if (particle.x > width) particle.x = 0;
            if (particle.y < 0) particle.y = height;
            if (particle.y > height) particle.y = 0;

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
            ctx.fillStyle = particle.c;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    draw();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    if (!timerDisplay) return;

    timerDisplay.textContent = formatTime(gameState.timeRemaining);
    timerDisplay.classList.toggle('warning', gameState.timeRemaining <= 30);

    const shouldCueTimer = gameState.timeRemaining === 10 || (gameState.timeRemaining <= 5 && gameState.timeRemaining > 0);
    if (shouldCueTimer && soundState.lastTimerCue !== gameState.timeRemaining) {
        soundState.lastTimerCue = gameState.timeRemaining;
        playSound('tick');
    }
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    gameState.isTimerRunning = false;
}

function startTimer() {
    if (gameState.isTimerRunning || gameState.timeRemaining <= 0) return;

    gameState.isTimerRunning = true;
    gameState.roundState = 'playing';
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining -= 1;
        updateTimerDisplay();

        if (gameState.timeRemaining <= 0) {
            gameState.timeRemaining = 0;
            stopTimer();
            playSound('timeout');
            showRoundResult('failed', 'Time Is Up', 'The shared round timer reached zero before the pack was finished.');
        }

        broadcastState();
    }, 1000);
}

function toggleTimer() {
    if (gameState.isTimerRunning) {
        stopTimer();
        playSound('pause');
    } else {
        startTimer();
        playSound('resume');
    }
}

function resetTimer() {
    stopTimer();
    gameState.timeRemaining = 240;
    soundState.lastTimerCue = null;
    updateTimerDisplay();
}

function hideRoundResult() {
    if (roundResultOverlay) {
        roundResultOverlay.hidden = true;
    }
}

function showRoundResult(state, title, message) {
    stopTimer();
    gameState.roundState = state;

    if (roundResultKicker) {
        roundResultKicker.textContent = state === 'failed' ? 'Round Failed' : 'Round Finished';
    }
    if (roundResultTitle) {
        roundResultTitle.textContent = title;
    }
    if (roundResultMessage) {
        roundResultMessage.textContent = message;
    }
    if (roundResultScore) {
        roundResultScore.textContent = String(gameState.currentScore);
    }
    if (roundResultOverlay) {
        roundResultOverlay.hidden = false;
    }
}

function renderLetters() {
    if (!lettersContainer) return;

    lettersContainer.innerHTML = '';

    if (!gameState.currentWord) return;

    for (let index = 0; index < gameState.currentWord.length; index += 1) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';

        if (gameState.revealedLetters[index]) {
            slot.textContent = gameState.currentWord[index];
            slot.classList.add('revealed');
        }

        slot.addEventListener('click', () => revealLetter(index));
        lettersContainer.appendChild(slot);
    }
}

function loadQuestion(index, options = {}) {
    const { resetRoundTimer = false, startTimer: shouldStartTimer = false } = options;

    if (gameState.questions.length === 0) {
        if (questionText) {
            questionText.textContent = 'The question list is empty. Add questions from the admin panel.';
        }
        return;
    }

    const safeIndex = Math.min(Math.max(index, 0), gameState.questions.length - 1);
    const question = gameState.questions[safeIndex];

    gameState.currentIndex = safeIndex;
    gameState.currentWord = question.answer;
    gameState.revealedLetters = new Array(gameState.currentWord.length).fill(false);
    gameState.potentialScore = gameState.currentWord.length * 100;
    gameState.roundState = 'playing';

    if (resetRoundTimer) {
        resetTimer();
    }

    updateTimerDisplay();
    hideRoundResult();

    if (questionText) {
        questionText.textContent = question.question;
    }

    renderLetters();
    playSound('question');
    if (shouldStartTimer) {
        startTimer();
    }

    broadcastState();
}

function nextQuestion() {
    if (gameState.currentIndex >= gameState.questions.length - 1) {
        showRoundResult('finished', 'Round Finished', 'You completed all questions in the pack.');
        broadcastState();
        return;
    }

    loadQuestion(gameState.currentIndex + 1);
}

function prevQuestion() {
    loadQuestion(gameState.currentIndex - 1);
}

function revealLetter(index) {
    if (!gameState.currentWord) return;
    if (index < 0 || index >= gameState.currentWord.length) return;
    if (gameState.revealedLetters[index]) return;

    gameState.revealedLetters[index] = true;
    gameState.potentialScore = Math.max(0, gameState.potentialScore - 100);
    renderLetters();
    playSound('reveal');
    broadcastState();
}

function revealRandomLetter() {
    if (!gameState.currentWord) return;

    const hiddenIndices = gameState.revealedLetters
        .map((isRevealed, index) => (isRevealed ? -1 : index))
        .filter((index) => index >= 0);

    if (hiddenIndices.length === 0) return;

    const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
    revealLetter(randomIndex);
}

function handleCorrectAnswer() {
    gameState.revealedLetters = new Array(gameState.currentWord.length).fill(true);
    gameState.currentScore += gameState.potentialScore;
    gameState.potentialScore = 0;
    soundState.lastTimerCue = null;
    playSound('correct');

    if (scoreDisplay) {
        scoreDisplay.textContent = String(gameState.currentScore);
    }

    renderLetters();

    if (gameState.currentIndex >= gameState.questions.length - 1) {
        showRoundResult('finished', 'Round Finished', 'You completed all questions in the pack.');
    }
}

function handlePassQuestion() {
    gameState.revealedLetters = new Array(gameState.currentWord.length).fill(true);
    gameState.potentialScore = 0;
    soundState.lastTimerCue = null;
    playSound('pass');
    renderLetters();

    if (gameState.currentIndex >= gameState.questions.length - 1) {
        showRoundResult('finished', 'Round Finished', 'You reached the end of the question pack.');
    }
}

function addPoints(points) {
    gameState.currentScore += points;

    if (scoreDisplay) {
        scoreDisplay.textContent = String(gameState.currentScore);
    }
}

function broadcastState() {
    if (!socket) return;

    const currentQuestion = gameState.questions[gameState.currentIndex];

    socket.emit('hostUpdate', {
        gameId,
        game: 'Word Game',
        type: 'kelime',
        currentIndex: gameState.currentIndex,
        totalQuestions: gameState.questions.length,
        currentWord: gameState.currentWord,
        question: currentQuestion ? currentQuestion.question : '',
        revealedLetters: gameState.revealedLetters,
        revealedCount: gameState.revealedLetters.filter(Boolean).length,
        score: gameState.currentScore,
        potentialScore: gameState.potentialScore,
        timeRemaining: gameState.timeRemaining,
        isTimerRunning: gameState.isTimerRunning,
        state: gameState.roundState
    });

    socket.emit('syncWordList', {
        gameId,
        type: 'kelime',
        questions: gameState.questions
    });
}

function handleAdminAction(data) {
    if (waitingMsg) {
        waitingMsg.style.display = 'none';
    }

    switch (data.action) {
        case 'START_GAME':
            if (Array.isArray(data.questions) && data.questions.length > 0) {
                gameState.questions = normalizeQuestions(data.questions);
            }
            if (gameState.questions.length > 0) {
                gameState.currentScore = 0;
                gameState.currentIndex = -1;
                if (scoreDisplay) {
                    scoreDisplay.textContent = '0';
                }
                playSound('start');
                loadQuestion(0, { resetRoundTimer: true, startTimer: true });
            }
            break;
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
            gameState.roundState = 'playing';
            hideRoundResult();
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

async function generateWithAI(theme, count = 20) {
    try {
        const response = await fetch('/api/generate-kelime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count })
        });

        if (!response.ok) {
            let message = 'Failed to generate questions';

            try {
                const error = await response.json();
                message = error.error || message;
            } catch {
                // Keep fallback.
            }

            throw new Error(message);
        }

        const result = await response.json();
        const questions = normalizeQuestions(result.questions);

        if (result.success && questions.length > 0) {
            gameState.questions = questions;
            gameState.currentIndex = -1;
            playSound('sync');
            setStatusMessage(`${questions.length} questions are ready. Start the round from the admin panel.`, '#22c55e');
            broadcastState();
            return true;
        }

        throw new Error('AI did not return valid questions');
    } catch (error) {
        console.error('AI generation error:', error);
        setStatusMessage(error.message || 'AI could not generate questions.', '#ef4444');
        return false;
    }
}

function initSocket() {
    if (!socket) return;

    socket.emit('hostJoin', gameId, (response) => {
        if (response?.success) {
            console.log('Word Game host connected:', response.gameId);
        } else {
            console.error('Failed to join:', response?.error);
        }
    });

    socket.on('hostSendState', () => {
        broadcastState();
    });

    socket.on('hostWordListUpdate', (data) => {
        if (!Array.isArray(data?.questions)) return;

        gameState.questions = normalizeQuestions(data.questions);
        console.log('Word list updated:', gameState.questions.length, 'questions');
        playSound('sync');

        if (gameState.questions.length === 0) {
            if (questionText) {
                questionText.textContent = 'The question list is empty. Add questions from the admin panel.';
            }
            gameState.currentIndex = -1;
            gameState.currentWord = '';
            gameState.revealedLetters = [];
            gameState.roundState = 'waiting';
            stopTimer();
            hideRoundResult();
            renderLetters();
            broadcastState();
            return;
        }

        const nextIndex = gameState.currentIndex >= 0
            ? Math.min(gameState.currentIndex, gameState.questions.length - 1)
            : 0;

        loadQuestion(nextIndex);
        setStatusMessage('Question pack updated from the admin panel.', '#22c55e');
        broadcastState();
    });

    socket.on('adminUpdate', (data) => {
        if (data?.game !== 'Word Game') return;
        handleAdminAction(data);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initSoundControls();

    const idDisplay = document.createElement('div');
    idDisplay.className = 'game-id-badge';
    idDisplay.textContent = `ID: ${gameId}`;
    document.body.appendChild(idDisplay);

    questionText = document.getElementById('question-text');
    lettersContainer = document.getElementById('letters-container');
    scoreDisplay = document.getElementById('score-display');
    timerDisplay = document.getElementById('timer-display');
    waitingMsg = document.getElementById('waiting-msg');
    themeInput = document.getElementById('theme-input');
    roundResultOverlay = document.getElementById('round-result-overlay');
    roundResultKicker = document.getElementById('round-result-kicker');
    roundResultTitle = document.getElementById('round-result-title');
    roundResultMessage = document.getElementById('round-result-message');
    roundResultScore = document.getElementById('round-result-score');
    gameState.questions = normalizeQuestions(DEFAULT_QUESTIONS);

    updateTimerDisplay();
    if (scoreDisplay) {
        scoreDisplay.textContent = '0';
    }

    initSocket();

    document.getElementById('btn-generate-ai')?.addEventListener('click', async () => {
        const button = document.getElementById('btn-generate-ai');
        const theme = themeInput ? themeInput.value.trim() : '';

        if (!button) return;

        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Generating...';

        await generateWithAI(theme, 20);

        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">✨</span> Generate with AI';
    });

    document.getElementById('btn-use-default')?.addEventListener('click', () => {
        gameState.questions = normalizeQuestions(DEFAULT_QUESTIONS);
        gameState.currentIndex = -1;
        playSound('sync');
        setStatusMessage('Default questions loaded. Start the round from the admin panel.', '#22c55e');
        broadcastState();
    });
});
