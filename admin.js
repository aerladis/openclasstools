/* ============================================
   ADMIN PANEL LOGIC - Compact & Modern
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let currentWordList = [];
    let currentGameType = null;
    let currentGameId = null;

    // DOM Elements
    const loginCard = document.getElementById('login-card');
    const gameIdInput = document.getElementById('game-id-input');
    const btnConnect = document.getElementById('btn-connect');
    const connectError = document.getElementById('connect-error');
    const dashboardSetup = document.getElementById('dashboard-setup');
    const btnDisconnect = document.getElementById('btn-disconnect');

    // Connection bar elements
    const connectionStatus = document.getElementById('connection-status');
    const connectionText = document.getElementById('connection-text');
    const connectedGameIdEl = document.getElementById('connected-game-id');
    const gameNameEl = document.getElementById('game-name');

    // Game data sections
    const hangmanDataEl = document.getElementById('hangman-data');
    const tabooDataEl = document.getElementById('taboo-data');
    const whoamiDataEl = document.getElementById('whoami-data');
    const kelimeDataEl = document.getElementById('kelime-data');
    const millionaireDataEl = document.getElementById('millionaire-data');
    const waitingMessageEl = document.getElementById('waiting-message');
    const wordManagerCard = document.getElementById('word-manager-card');
    const wordListContainer = document.getElementById('word-list-container');

    // Connect button
    btnConnect.addEventListener('click', connectToGame);
    gameIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') connectToGame();
    });

    function connectToGame() {
        const id = gameIdInput.value.trim().toUpperCase();
        if (id.length !== 4) {
            showError('Game ID must be 4 characters');
            return;
        }

        socket.emit('adminJoin', id, (response) => {
            if (response && response.success) {
                currentGameId = id;
                loginCard.classList.add('hidden');
                dashboardSetup.classList.remove('hidden');
                connectedGameIdEl.textContent = id;
                updateConnectionStatus(true);
                socket.emit('requestState', id);
            } else {
                showError(response?.error || 'Failed to connect');
            }
        });
    }

    // Disconnect button
    if (btnDisconnect) {
        btnDisconnect.addEventListener('click', () => {
            currentGameId = null;
            loginCard.classList.remove('hidden');
            dashboardSetup.classList.add('hidden');
            resetUI();
        });
    }

    function showError(msg) {
        connectError.textContent = msg;
        connectError.style.display = 'block';
        setTimeout(() => {
            connectError.style.display = 'none';
        }, 3000);
    }

    function updateConnectionStatus(connected) {
        if (connected) {
            connectionStatus.className = 'status-dot connected';
            connectionText.textContent = 'Connected';
        } else {
            connectionStatus.className = 'status-dot disconnected';
            connectionText.textContent = 'Disconnected';
            connectedGameIdEl.textContent = '';
        }
    }

    // Socket events
    socket.on('connect', () => {
        if (currentGameId) {
            socket.emit('adminJoin', currentGameId);
        }
    });

    socket.on('disconnect', () => {
        updateConnectionStatus(false);
    });

    // Handle game updates
    socket.on('adminUpdate', (data) => {
        if (!data || data.gameId !== currentGameId) return;

        gameNameEl.textContent = data.game || 'Unknown';
        waitingMessageEl.classList.add('hidden');

        // Hide all game sections
        hangmanDataEl?.classList.add('hidden');
        tabooDataEl?.classList.add('hidden');
        whoamiDataEl?.classList.add('hidden');
        kelimeDataEl?.classList.add('hidden');
        millionaireDataEl?.classList.add('hidden');

        // Show appropriate game section
        if (data.game === 'Hangman') updateHangman(data);
        else if (data.game === 'Taboo') updateTaboo(data);
        else if (data.game === 'Who Am I') updateWhoAmI(data);
        else if (data.game === 'Word Game') updateKelime(data);
        else if (data.game === 'Who Wants to Be a Millionaire') updateMillionaire(data);
    });

    function updateHangman(data) {
        hangmanDataEl.classList.remove('hidden');
        document.getElementById('hangman-word').textContent = data.word || '---';
        document.getElementById('hangman-category').textContent = data.category || '-';
        document.getElementById('hangman-wrong').textContent = data.wrongCount || 0;
        
        const stateEl = document.getElementById('hangman-state');
        if (data.currentState) {
            stateEl.textContent = data.currentState;
        }
    }

    function updateTaboo(data) {
        tabooDataEl.classList.remove('hidden');
        document.getElementById('taboo-word').textContent = data.word || '---';
        document.getElementById('taboo-team').textContent = data.team || '-';
        document.getElementById('taboo-time').textContent = data.timeLeft || 0;
        
        const forbiddenEl = document.getElementById('taboo-forbidden');
        if (data.forbidden && Array.isArray(data.forbidden)) {
            forbiddenEl.innerHTML = data.forbidden
                .map(w => `<span class="forbidden-tag">${w}</span>`)
                .join('');
        } else {
            forbiddenEl.innerHTML = '';
        }
    }

    function updateWhoAmI(data) {
        whoamiDataEl.classList.remove('hidden');
        const char = data.active && data.character ? data.character : '---';
        document.getElementById('whoami-character').textContent = char;
    }

    function updateKelime(data) {
        kelimeDataEl.classList.remove('hidden');
        document.getElementById('kelime-question').textContent = data.question || '---';
        document.getElementById('kelime-answer').textContent = data.currentWord || '---';
        document.getElementById('kelime-potential').textContent = data.potentialScore || 0;
        
        const current = (data.currentIndex || 0) + 1;
        const total = data.totalQuestions || 0;
        document.getElementById('kelime-counter').textContent = `${current} / ${total}`;
        
        let statusText = 'Waiting';
        if (data.timeRemaining <= 0) statusText = 'Time Up!';
        else if (data.isTimerRunning) statusText = `Running (${data.timeRemaining}s)`;
        else if (data.timeRemaining < 240) statusText = `Paused (${data.timeRemaining}s)`;
        document.getElementById('kelime-status').textContent = statusText;
    }

    function updateMillionaire(data) {
        millionaireDataEl.classList.remove('hidden');
        document.getElementById('millionaire-level').textContent = data.level || '-';
        document.getElementById('millionaire-prize').textContent = data.prize ? `$${data.prize.toLocaleString()}` : '-';
        document.getElementById('millionaire-question').textContent = data.question || '---';
        document.getElementById('millionaire-timer').textContent = `${data.timeRemaining || 0}s`;
        
        // Update options
        const optionsEl = document.getElementById('millionaire-options');
        if (data.options && Array.isArray(data.options)) {
            optionsEl.innerHTML = data.options
                .map((opt, i) => `<div class="option-item">${String.fromCharCode(65+i)}: ${opt}</div>`)
                .join('');
        }
        
        // Update lifeline button states
        if (data.lifelines) {
            document.getElementById('btn-5050').disabled = data.lifelines.fiftyFifty?.used;
            document.getElementById('btn-phone').disabled = data.lifelines.phoneFriend?.used;
            document.getElementById('btn-audience').disabled = data.lifelines.askAudience?.used;
        }
    }

    // Word Game controls
    document.getElementById('btn-kelime-start')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'START_GAME' });
    });
    document.getElementById('btn-kelime-reveal')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'REVEAL_LETTER' });
    });
    document.getElementById('btn-kelime-timer')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'TOGGLE_TIMER' });
    });
    document.getElementById('btn-kelime-correct')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'CORRECT_ANSWER' });
    });
    document.getElementById('btn-kelime-pass')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'PASS_QUESTION' });
    });
    document.getElementById('btn-kelime-next')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'NEXT_QUESTION' });
    });
    document.getElementById('btn-kelime-prev')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'PREV_QUESTION' });
    });

    // Millionaire controls
    document.getElementById('btn-5050')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Who Wants to Be a Millionaire', action: 'USE_LIFELINE', lifeline: 'fiftyFifty' });
    });
    document.getElementById('btn-phone')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Who Wants to Be a Millionaire', action: 'USE_LIFELINE', lifeline: 'phoneFriend' });
    });
    document.getElementById('btn-audience')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Who Wants to Be a Millionaire', action: 'USE_LIFELINE', lifeline: 'askAudience' });
    });
    document.getElementById('btn-timer-toggle')?.addEventListener('click', () => {
        socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Who Wants to Be a Millionaire', action: 'TOGGLE_TIMER' });
    });

    // Word Management
    socket.on('adminWordListSync', (data) => {
        if (!data || data.gameId !== currentGameId) return;
        wordManagerCard.classList.remove('hidden');
        currentGameType = data.type;

        if (data.type === 'hangman' && data.words) {
            currentWordList = data.words;
        } else if (data.type === 'taboo' && data.cards) {
            currentWordList = data.cards;
        } else if (data.type === 'whoami' && data.characters) {
            currentWordList = data.characters;
        } else if (data.type === 'kelime' && data.questions) {
            currentWordList = data.questions;
        } else if (data.type === 'millionaire' && data.questions) {
            currentWordList = data.questions;
        }

        renderWordList();
    });

    function renderWordList() {
        wordListContainer.innerHTML = '';
        if (currentWordList.length === 0) {
            wordListContainer.innerHTML = '<p class="empty">No items</p>';
            return;
        }

        currentWordList.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'word-item';

            if (currentGameType === 'hangman') {
                const w = typeof item === 'string' ? item : item.word;
                const c = item.cat || '';
                el.innerHTML = `
                    <input type="text" value="${w}" data-index="${index}" data-field="word" placeholder="Word">
                    <input type="text" value="${c}" data-index="${index}" data-field="cat" placeholder="Category">
                `;
            } else if (currentGameType === 'taboo') {
                const fb = item.forbidden?.join(', ') || '';
                el.innerHTML = `
                    <input type="text" value="${item.word}" data-index="${index}" data-field="word" placeholder="Word">
                    <input type="text" value="${fb}" data-index="${index}" data-field="forbidden" placeholder="Forbidden words (comma separated)">
                `;
            } else if (currentGameType === 'whoami') {
                el.innerHTML = `<input type="text" value="${item}" data-index="${index}" data-field="word">`;
            } else if (currentGameType === 'kelime' || currentGameType === 'millionaire') {
                el.innerHTML = `
                    <input type="text" value="${item.question || ''}" data-index="${index}" data-field="question" placeholder="Question">
                    <input type="text" value="${item.answer || ''}" data-index="${index}" data-field="answer" placeholder="Answer">
                `;
            }

            wordListContainer.appendChild(el);
        });

        // Attach edit listeners
        wordListContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', handleWordEdit);
        });
    }

    function handleWordEdit(e) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        const val = e.target.value;

        if (currentGameType === 'hangman') {
            if (typeof currentWordList[index] === 'string') {
                currentWordList[index] = { word: currentWordList[index], cat: '' };
            }
            if (field === 'word') currentWordList[index].word = val.toUpperCase();
            if (field === 'cat') currentWordList[index].cat = val;
        } else if (currentGameType === 'taboo') {
            if (field === 'word') currentWordList[index].word = val;
            if (field === 'forbidden') currentWordList[index].forbidden = val.split(',').map(s => s.trim()).filter(Boolean);
        } else if (currentGameType === 'whoami') {
            currentWordList[index] = val;
        } else if (currentGameType === 'kelime' || currentGameType === 'millionaire') {
            if (field === 'question') currentWordList[index].question = val;
            if (field === 'answer') currentWordList[index].answer = val.toUpperCase();
        }
    }

    document.getElementById('btn-add-word')?.addEventListener('click', () => {
        if (currentGameType === 'hangman') {
            currentWordList.unshift({ word: 'NEW', cat: '' });
        } else if (currentGameType === 'taboo') {
            currentWordList.unshift({ word: 'New', forbidden: ['word1', 'word2'] });
        } else if (currentGameType === 'whoami') {
            currentWordList.unshift('New Character');
        } else if (currentGameType === 'kelime' || currentGameType === 'millionaire') {
            currentWordList.unshift({ question: 'New Question?', answer: 'ANSWER' });
        }
        renderWordList();
    });

    document.getElementById('btn-save-words')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-save-words');
        btn.textContent = 'Saved!';
        
        const payload = { gameId: currentGameId, type: currentGameType };
        if (currentGameType === 'hangman') payload.words = currentWordList;
        if (currentGameType === 'taboo') payload.cards = currentWordList;
        if (currentGameType === 'whoami') payload.characters = currentWordList;
        if (currentGameType === 'kelime') payload.questions = currentWordList;
        if (currentGameType === 'millionaire') payload.questions = currentWordList;

        socket.emit('updateWordListAdmin', payload);
        
        setTimeout(() => {
            btn.textContent = 'Save';
        }, 1000);
    });

    function resetUI() {
        gameNameEl.textContent = 'None';
        hangmanDataEl?.classList.add('hidden');
        tabooDataEl?.classList.add('hidden');
        whoamiDataEl?.classList.add('hidden');
        kelimeDataEl?.classList.add('hidden');
        millionaireDataEl?.classList.add('hidden');
        wordManagerCard?.classList.add('hidden');
        waitingMessageEl.classList.remove('hidden');
    }
});
