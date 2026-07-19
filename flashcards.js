/* ============================================
   VOCABULARY FLASHCARDS GAME LOGIC
   ============================================ */

const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = typeof io !== 'undefined' ? io() : null;

const DEFAULT_DECK = [
    { word: 'egg', meaning: 'yumurta' },
    { word: 'book', meaning: 'kitap' },
    { word: 'water', meaning: 'su' },
    { word: 'apple', meaning: 'elma' },
    { word: 'friend', meaning: 'arkadaş' },
    { word: 'school', meaning: 'okul' },
    { word: 'table', meaning: 'masa' },
    { word: 'house', meaning: 'ev' },
    { word: 'sun', meaning: 'güneş' },
    { word: 'moon', meaning: 'ay' },
    { word: 'happy', meaning: 'mutlu' },
    { word: 'fast', meaning: 'hızlı' },
    { word: 'journey', meaning: 'yolculuk' },
    { word: 'success', meaning: 'başarı' },
    { word: 'freedom', meaning: 'özgürlük' }
];

const gameState = {
    allCards: [],
    activeCards: [],
    currentIndex: 0,
    isFlipped: false,
    masteredSet: new Set(),
    reviewSet: new Set(),
    isReviewMode: false
};

const soundState = {
    enabled: true,
    audioContext: null,
    masterGain: null
};

// DOM Elements
let flashcard, cardWord, cardMeaning, cardCounter, masteredCounter, reviewCounter, progressBar, statusBanner, themeInput, btnReviewMode;

function ensureAudioContext() {
    if (!soundState.enabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!soundState.audioContext) {
        soundState.audioContext = new AudioContextClass();
        soundState.masterGain = soundState.audioContext.createGain();
        soundState.masterGain.gain.value = 0.15;
        soundState.masterGain.connect(soundState.audioContext.destination);
    }

    if (soundState.audioContext.state === 'suspended') {
        soundState.audioContext.resume().catch(() => {});
    }

    return soundState.audioContext;
}

function playTone(freq, duration, type = 'sine') {
    const ctx = ensureAudioContext();
    if (!ctx || !soundState.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(soundState.masterGain);

    osc.start();
    osc.stop(ctx.currentTime + duration);
}

function playSound(action) {
    switch (action) {
        case 'flip':
            playTone(480, 0.1, 'triangle');
            break;
        case 'mastered':
            playTone(587.33, 0.12, 'sine');
            setTimeout(() => playTone(880, 0.18, 'sine'), 100);
            break;
        case 'review':
            playTone(330, 0.15, 'sawtooth');
            break;
        case 'nav':
            playTone(440, 0.08, 'sine');
            break;
        case 'sync':
            playTone(523.25, 0.1, 'sine');
            setTimeout(() => playTone(659.25, 0.15, 'sine'), 80);
            break;
    }
}

function setStatusMessage(msg, color = null) {
    if (!statusBanner) return;
    statusBanner.textContent = msg;
    if (color) {
        statusBanner.style.color = color;
    } else {
        statusBanner.style.color = '';
    }
}

function normalizeCards(cards) {
    if (!Array.isArray(cards)) return [];
    return cards.filter(c => c && typeof c.word === 'string' && typeof c.meaning === 'string').map(c => ({
        word: c.word.trim(),
        meaning: c.meaning.trim()
    }));
}

function loadDeck(cards, preserveProgress = false) {
    const normalized = normalizeCards(cards);
    if (normalized.length === 0) return;

    gameState.allCards = normalized;
    if (!preserveProgress) {
        gameState.masteredSet.clear();
        gameState.reviewSet.clear();
        gameState.isReviewMode = false;
    }

    gameState.activeCards = gameState.isReviewMode
        ? gameState.allCards.filter(c => gameState.reviewSet.has(c.word))
        : gameState.allCards;

    gameState.currentIndex = 0;
    showCard(0);
    updateStats();
    emitGameState();
}

function showCard(index) {
    if (gameState.activeCards.length === 0) {
        if (cardWord) cardWord.textContent = 'No Cards';
        if (cardMeaning) cardMeaning.textContent = 'Deck is empty';
        if (flashcard) flashcard.classList.remove('flipped');
        gameState.isFlipped = false;
        updateStats();
        return;
    }

    const safeIdx = Math.min(Math.max(index, 0), gameState.activeCards.length - 1);
    gameState.currentIndex = safeIdx;
    const card = gameState.activeCards[safeIdx];

    if (flashcard && gameState.isFlipped) {
        flashcard.classList.remove('flipped');
        gameState.isFlipped = false;
    }

    if (cardWord) cardWord.textContent = card.word;
    if (cardMeaning) cardMeaning.textContent = card.meaning.toUpperCase();

    updateStats();
}

function toggleFlip() {
    if (gameState.activeCards.length === 0) return;
    if (!flashcard) return;

    gameState.isFlipped = !gameState.isFlipped;
    if (gameState.isFlipped) {
        flashcard.classList.add('flipped');
    } else {
        flashcard.classList.remove('flipped');
    }
    playSound('flip');
    emitGameState();
}

function pronounceWord(e) {
    if (e) e.stopPropagation();
    if (gameState.activeCards.length === 0) return;

    const card = gameState.activeCards[gameState.currentIndex];
    if (!card || !card.word) return;

    if (!('speechSynthesis' in window)) {
        setStatusMessage('Text-to-speech is not supported in this browser.', '#ef4444');
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
}

function nextCard() {
    if (gameState.activeCards.length === 0) return;
    playSound('nav');
    if (gameState.currentIndex < gameState.activeCards.length - 1) {
        showCard(gameState.currentIndex + 1);
    } else {
        showCard(0);
        setStatusMessage('Looping back to first card.', '#38bdf8');
    }
    emitGameState();
}

function prevCard() {
    if (gameState.activeCards.length === 0) return;
    playSound('nav');
    if (gameState.currentIndex > 0) {
        showCard(gameState.currentIndex - 1);
    } else {
        showCard(gameState.activeCards.length - 1);
    }
    emitGameState();
}

function markMastered() {
    if (gameState.activeCards.length === 0) return;
    const card = gameState.activeCards[gameState.currentIndex];
    if (!card) return;

    gameState.masteredSet.add(card.word);
    gameState.reviewSet.delete(card.word);
    playSound('mastered');

    updateStats();
    nextCard();
}

function markReview() {
    if (gameState.activeCards.length === 0) return;
    const card = gameState.activeCards[gameState.currentIndex];
    if (!card) return;

    gameState.reviewSet.add(card.word);
    gameState.masteredSet.delete(card.word);
    playSound('review');

    updateStats();
    nextCard();
}

function toggleReviewMode() {
    if (gameState.reviewSet.size === 0 && !gameState.isReviewMode) {
        setStatusMessage('No cards marked for review yet. Click ❌ Needs Review on cards first!', '#fb923c');
        return;
    }

    gameState.isReviewMode = !gameState.isReviewMode;
    if (gameState.isReviewMode) {
        gameState.activeCards = gameState.allCards.filter(c => gameState.reviewSet.has(c.word));
        setStatusMessage(`Review Mode active: Studying ${gameState.activeCards.length} cards.`, '#f43f5e');
    } else {
        gameState.activeCards = gameState.allCards;
        setStatusMessage(`All Cards Mode active: Studying ${gameState.activeCards.length} cards.`, '#38bdf8');
    }

    gameState.currentIndex = 0;
    showCard(0);
    emitGameState();
}

function updateStats() {
    const total = gameState.activeCards.length;
    const current = total > 0 ? gameState.currentIndex + 1 : 0;

    if (cardCounter) cardCounter.textContent = `Card ${current} / ${total}`;
    if (masteredCounter) masteredCounter.textContent = `✅ Mastered: ${gameState.masteredSet.size}`;
    if (reviewCounter) reviewCounter.textContent = `❌ Review: ${gameState.reviewSet.size}`;

    if (progressBar) {
        const pct = total > 0 ? (current / total) * 100 : 0;
        progressBar.style.width = `${pct}%`;
    }

    if (btnReviewMode) {
        if (gameState.reviewSet.size > 0 || gameState.isReviewMode) {
            btnReviewMode.hidden = false;
            btnReviewMode.textContent = gameState.isReviewMode ? '🏠 All Cards Mode' : `🔁 Review Mode (${gameState.reviewSet.size})`;
            if (gameState.isReviewMode) {
                btnReviewMode.classList.add('active');
            } else {
                btnReviewMode.classList.remove('active');
            }
        } else {
            btnReviewMode.hidden = true;
        }
    }
}

async function generateWithAI(theme, count = 20) {
    try {
        const response = await fetch('/api/generate-flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count })
        });

        if (!response.ok) {
            let message = 'Failed to generate flashcards';
            try {
                const error = await response.json();
                message = error.error || message;
            } catch {}
            throw new Error(message);
        }

        const result = await response.json();
        const cards = normalizeCards(result.cards);

        if (result.success && cards.length > 0) {
            loadDeck(cards, false);
            playSound('sync');
            setStatusMessage(`${cards.length} AI flashcards generated for topic: "${theme}". Happy studying!`, '#22c55e');
            return true;
        }

        throw new Error('AI did not return valid flashcards');
    } catch (error) {
        console.error('AI generation error:', error);
        setStatusMessage(error.message || 'AI could not generate flashcards.', '#ef4444');
        return false;
    }
}

// Socket.IO Integration
function initSocket() {
    if (!socket) return;

    socket.emit('hostJoin', gameId, (res) => {
        if (res?.success) {
            console.log('Flashcards host connected:', res.gameId);
        }
    });

    socket.on('adminUpdate', (data) => {
        if (data?.game !== 'Vocabulary Flashcards') return;
        if (data.action === 'NEXT_CARD') nextCard();
        else if (data.action === 'PREV_CARD') prevCard();
        else if (data.action === 'FLIP_CARD') toggleFlip();
    });

    socket.on('hostWordListUpdate', (data) => {
        if (Array.isArray(data?.cards)) {
            loadDeck(data.cards, false);
            setStatusMessage('Flashcard deck synchronized from admin panel.', '#22c55e');
        }
    });
}

function emitGameState() {
    if (!socket) return;
    socket.emit('hostUpdate', {
        gameId,
        type: 'flashcards',
        game: 'Vocabulary Flashcards',
        cards: gameState.allCards,
        currentIndex: gameState.currentIndex,
        isFlipped: gameState.isFlipped,
        masteredCount: gameState.masteredSet.size,
        reviewCount: gameState.reviewSet.size
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // particles.js auto-initializes via OptimizedParticles; no manual call needed

    // ID Badge
    const idDisplay = document.createElement('div');
    idDisplay.className = 'game-id-badge';
    idDisplay.textContent = `ID: ${gameId}`;
    document.body.appendChild(idDisplay);

    // Cache elements
    flashcard = document.getElementById('flashcard');
    cardWord = document.getElementById('card-word');
    cardMeaning = document.getElementById('card-meaning');
    cardCounter = document.getElementById('card-counter');
    masteredCounter = document.getElementById('mastered-counter');
    reviewCounter = document.getElementById('review-counter');
    progressBar = document.getElementById('progress-bar');
    statusBanner = document.getElementById('status-banner');
    themeInput = document.getElementById('theme-input');
    btnReviewMode = document.getElementById('btn-review-mode');

    // Load initial default deck
    loadDeck(DEFAULT_DECK, false);
    initSocket();

    // Event Listeners
    flashcard?.addEventListener('click', toggleFlip);
    document.getElementById('btn-flip')?.addEventListener('click', toggleFlip);
    document.getElementById('btn-pronounce')?.addEventListener('click', pronounceWord);
    document.getElementById('btn-next')?.addEventListener('click', nextCard);
    document.getElementById('btn-prev')?.addEventListener('click', prevCard);
    document.getElementById('btn-mark-mastered')?.addEventListener('click', markMastered);
    document.getElementById('btn-mark-review')?.addEventListener('click', markReview);
    btnReviewMode?.addEventListener('click', toggleReviewMode);

    document.getElementById('btn-use-default')?.addEventListener('click', () => {
        loadDeck(DEFAULT_DECK, false);
        playSound('sync');
        setStatusMessage('Loaded default vocabulary deck (15 cards).', '#22c55e');
    });

    document.getElementById('btn-generate-ai')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-generate-ai');
        const theme = themeInput ? themeInput.value.trim() : '';
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Generating...';

        await generateWithAI(theme, 20);

        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">✨</span> AI Generate';
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            toggleFlip();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            nextCard();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            prevCard();
        } else if (e.key.toLowerCase() === 'm') {
            e.preventDefault();
            markMastered();
        } else if (e.key.toLowerCase() === 'r') {
            e.preventDefault();
            markReview();
        }
    });
});
