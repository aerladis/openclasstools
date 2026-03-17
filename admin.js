/* ============================================
   ADMIN PANEL LOGIC - Compact & Modern
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const MILLIONAIRE_PRIZES = [
        100, 200, 300, 500, 1000,
        2000, 4000, 8000, 16000, 32000,
        64000, 125000, 250000, 500000, 1000000
    ];
    const MILLIONAIRE_DEFAULT_QUESTIONS = [
        { question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correct: 2 },
        { question: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], correct: 2 },
        { question: 'What is the largest planet in our solar system?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correct: 2 },
        { question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct: 2 },
        { question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 },
        { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Michelangelo'], correct: 2 },
        { question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correct: 1 },
        { question: 'How many bones are in the adult human body?', options: ['186', '206', '226', '246'], correct: 1 },
        { question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correct: 1 },
        { question: 'Who wrote Romeo and Juliet?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], correct: 1 },
        { question: 'What is the speed of light?', options: ['299,792 km/s', '199,792 km/s', '399,792 km/s', '499,792 km/s'], correct: 0 },
        { question: 'What element has the atomic number 1?', options: ['Oxygen', 'Carbon', 'Hydrogen', 'Helium'], correct: 2 },
        { question: 'Who was the first person to step on the moon?', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'], correct: 2 },
        { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
        { question: 'In what year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], correct: 2 }
    ];
    const WORD_GAME_DEFAULT_QUESTIONS = [
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

    let currentWordList = [];
    let currentGameType = null;
    let currentGameId = null;
    let currentMillionaireLevel = 0;
    let currentEditorIndex = 0;
    let kelimeSetupCollapsed = false;
    let millionaireSetupCollapsed = false;

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
    const kelimeThemeInput = document.getElementById('kelime-theme-input');
    const kelimeCefrLevel = document.getElementById('kelime-cefr-level');
    const kelimeGenerateStatus = document.getElementById('kelime-generate-status');
    const kelimeSetupCard = document.getElementById('kelime-setup-card');
    const kelimeSetupToggle = document.getElementById('btn-kelime-setup-toggle');
    const millionaireDataEl = document.getElementById('millionaire-data');
    const millionaireThemeInput = document.getElementById('millionaire-theme-input');
    const millionaireGenerateStatus = document.getElementById('millionaire-generate-status');
    const millionaireSetupCard = document.getElementById('millionaire-setup-card');
    const millionaireSetupToggle = document.getElementById('btn-millionaire-setup-toggle');
    const millionaireOptionsEl = document.getElementById('millionaire-options');
    const millionaireUpcomingEl = document.getElementById('millionaire-upcoming');
    const waitingMessageEl = document.getElementById('waiting-message');
    const wordManagerCard = document.getElementById('word-manager-card');
    const wordListContainer = document.getElementById('word-list-container');
    const btnPrevItem = document.getElementById('btn-prev-item');
    const btnNextItem = document.getElementById('btn-next-item');
    const wordEditorPosition = document.getElementById('word-editor-position');
    const wordEditorMeta = document.getElementById('word-editor-meta');

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
            setKelimeGenerateStatus('Questions are managed from here.', 'info');
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

    function escapeInputValue(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function normalizeMillionaireQuestion(item = {}) {
        const rawOptions = Array.isArray(item.options) ? item.options : [];
        const options = Array.from({ length: 4 }, (_, index) => String(rawOptions[index] ?? '').trim());
        const parsedCorrect = Number.parseInt(item.correct, 10);

        return {
            question: String(item.question ?? '').trim(),
            options,
            correct: Number.isInteger(parsedCorrect) && parsedCorrect >= 0 && parsedCorrect <= 3 ? parsedCorrect : 0
        };
    }

    function normalizeWordGameQuestion(item = {}) {
        return {
            question: String(item.question ?? '').trim(),
            answer: String(item.answer ?? '').trim().toUpperCase().replace(/\s+/g, '')
        };
    }

    function sortWordGameQuestions(questions) {
        return [...questions].sort((left, right) => {
            const leftAnswer = String(left.answer ?? '');
            const rightAnswer = String(right.answer ?? '');
            const lengthDiff = leftAnswer.length - rightAnswer.length;

            if (lengthDiff !== 0) return lengthDiff;

            return leftAnswer.localeCompare(rightAnswer) || String(left.question ?? '').localeCompare(String(right.question ?? ''));
        });
    }

    function setKelimeGenerateStatus(message, type = 'info') {
        if (!kelimeGenerateStatus) return;

        const colorMap = {
            info: 'var(--text-secondary, rgba(241,245,249,0.6))',
            success: '#4ade80',
            error: '#f87171'
        };

        kelimeGenerateStatus.textContent = message;
        kelimeGenerateStatus.style.color = colorMap[type] || colorMap.info;
    }

    function setMillionaireGenerateStatus(message, type = 'info') {
        if (!millionaireGenerateStatus) return;

        const colorMap = {
            info: 'var(--text-secondary, rgba(241,245,249,0.6))',
            success: '#4ade80',
            error: '#f87171'
        };

        millionaireGenerateStatus.textContent = message;
        millionaireGenerateStatus.style.color = colorMap[type] || colorMap.info;
    }

    function setKelimeSetupCollapsed(isCollapsed) {
        kelimeSetupCollapsed = isCollapsed;

        if (kelimeSetupCard) {
            kelimeSetupCard.classList.toggle('collapsed', isCollapsed);
        }

        if (kelimeSetupToggle) {
            kelimeSetupToggle.textContent = isCollapsed ? 'Show' : 'Hide';
        }
    }

    function setMillionaireSetupCollapsed(isCollapsed) {
        millionaireSetupCollapsed = isCollapsed;

        if (millionaireSetupCard) {
            millionaireSetupCard.classList.toggle('collapsed', isCollapsed);
        }

        if (millionaireSetupToggle) {
            millionaireSetupToggle.textContent = isCollapsed ? 'Show' : 'Hide';
        }
    }

    function syncWordGameQuestions(questions, successMessage) {
        if (!currentGameId) {
            setKelimeGenerateStatus('Connect to a Word Game first.', 'error');
            return;
        }

        const normalizedQuestions = sortWordGameQuestions(questions
            .map(normalizeWordGameQuestion)
            .filter((item) => item.question && item.answer));

        if (normalizedQuestions.length === 0) {
            setKelimeGenerateStatus('No valid questions were returned.', 'error');
            return;
        }

        currentGameType = 'kelime';
        currentWordList = normalizedQuestions;
        currentEditorIndex = 0;
        wordManagerCard.classList.remove('hidden');
        renderWordList();

        socket.emit('updateWordListAdmin', {
            gameId: currentGameId,
            type: 'kelime',
            questions: normalizedQuestions
        });

        setKelimeGenerateStatus(successMessage, 'success');
    }

    function syncMillionaireQuestions(questions, successMessage) {
        if (!currentGameId) {
            setMillionaireGenerateStatus('Connect to a Millionaire game first.', 'error');
            return;
        }

        const normalizedQuestions = questions
            .map(normalizeMillionaireQuestion)
            .filter((item) => item.question && item.options.every(Boolean));

        if (normalizedQuestions.length === 0) {
            setMillionaireGenerateStatus('No valid questions were returned.', 'error');
            return;
        }

        currentGameType = 'millionaire';
        currentWordList = normalizedQuestions;
        currentEditorIndex = 0;
        wordManagerCard.classList.remove('hidden');
        renderMillionaireUpcoming();
        renderWordList();

        socket.emit('updateWordListAdmin', {
            gameId: currentGameId,
            type: 'millionaire',
            questions: normalizedQuestions
        });

        setMillionaireGenerateStatus(successMessage, 'success');
    }

    async function requestWordGameQuestions(theme, cefrLevel) {
        const response = await fetch('/api/generate-kelime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count: 20, cefrLevel })
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
        return Array.isArray(result.questions) ? result.questions : [];
    }

    async function requestMillionaireQuestions(theme) {
        const response = await fetch('/api/generate-millionaire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count: 15 })
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
        return Array.isArray(result.questions) ? result.questions : [];
    }
    function renderMillionaireUpcoming() {
        if (!millionaireUpcomingEl) return;

        if (currentGameType !== 'millionaire' || currentWordList.length === 0) {
            millionaireUpcomingEl.innerHTML = '<p class="empty">Waiting for synced questions...</p>';
            return;
        }

        const startIndex = Math.max(0, currentMillionaireLevel + 1);
        const upcomingQuestions = currentWordList.slice(startIndex, startIndex + 5);

        if (upcomingQuestions.length === 0) {
            millionaireUpcomingEl.innerHTML = '<p class="empty">No more upcoming questions.</p>';
            return;
        }

        millionaireUpcomingEl.innerHTML = upcomingQuestions.map((question, offset) => {
            const levelIndex = startIndex + offset;
            const prize = MILLIONAIRE_PRIZES[levelIndex];
            return `
                <div class="upcoming-item">
                    <div class="upcoming-meta">
                        <span class="upcoming-number">Q${levelIndex + 1}</span>
                        <span class="upcoming-prize">$${prize.toLocaleString()}</span>
                    </div>
                    <p class="upcoming-text">${escapeInputValue(question.question)}</p>
                </div>
            `;
        }).join('');
    }

    function getEditorItemName() {
        const labelMap = {
            hangman: 'Word',
            taboo: 'Card',
            whoami: 'Character',
            kelime: 'Question',
            millionaire: 'Question'
        };

        return labelMap[currentGameType] || 'Item';
    }

    function syncEditorControls() {
        const total = currentWordList.length;
        const hasItems = total > 0;

        if (wordEditorPosition) {
            wordEditorPosition.textContent = hasItems
                ? `${currentEditorIndex + 1} / ${total}`
                : '0 / 0';
        }

        if (wordEditorMeta) {
            if (!hasItems) {
                wordEditorMeta.textContent = 'No synced items yet.';
            } else {
                wordEditorMeta.textContent = `Editing ${getEditorItemName().toLowerCase()} ${currentEditorIndex + 1} of ${total}`;
            }
        }

        if (btnPrevItem) {
            btnPrevItem.disabled = !hasItems || currentEditorIndex <= 0;
        }

        if (btnNextItem) {
            btnNextItem.disabled = !hasItems || currentEditorIndex >= total - 1;
        }
    }

    function clampEditorIndex() {
        if (currentWordList.length === 0) {
            currentEditorIndex = 0;
            return;
        }

        currentEditorIndex = Math.min(Math.max(currentEditorIndex, 0), currentWordList.length - 1);
    }

    function emitMillionaireAction(action, extra = {}) {
        if (!currentGameId) return;

        socket.emit('adminUpdateHost', {
            gameId: currentGameId,
            game: 'Who Wants to Be a Millionaire',
            action,
            ...extra
        });
    }

    setKelimeGenerateStatus('Questions are managed from here.', 'info');
    setMillionaireGenerateStatus('Generate or sync a question pack before starting.', 'info');
    setKelimeSetupCollapsed(false);
    setMillionaireSetupCollapsed(false);

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
        setKelimeSetupCollapsed((data.currentIndex || 0) >= 0 && Boolean(data.question));
        document.getElementById('kelime-question').textContent = data.question || '---';
        document.getElementById('kelime-answer').textContent = data.currentWord || '---';
        document.getElementById('kelime-potential').textContent = data.potentialScore || 0;
        
        const current = (data.currentIndex || 0) + 1;
        const total = data.totalQuestions || 0;
        document.getElementById('kelime-counter').textContent = `${current} / ${total}`;
        
        let statusText = 'Waiting';
        if (data.state === 'finished') statusText = 'Finished';
        else if (data.state === 'failed' || data.timeRemaining <= 0) statusText = 'Time Up!';
        else if (data.isTimerRunning) statusText = `Running (${data.timeRemaining}s)`;
        else if (data.timeRemaining < 240) statusText = `Paused (${data.timeRemaining}s)`;
        document.getElementById('kelime-status').textContent = statusText;
    }

    function updateMillionaire(data) {
        millionaireDataEl.classList.remove('hidden');
        setMillionaireSetupCollapsed(Boolean(data.question) && data.state !== 'finished');
        currentMillionaireLevel = Math.max(0, (data.level || 1) - 1);
        document.getElementById('millionaire-level').textContent = data.level || '-';
        document.getElementById('millionaire-prize').textContent = data.prize ? `$${data.prize.toLocaleString()}` : '-';
        document.getElementById('millionaire-question').textContent = data.question || '---';
        document.getElementById('millionaire-timer').textContent = `${data.timeRemaining || 0}s`;
        
        // Update options
        const optionsEl = document.getElementById('millionaire-options');
        if (data.options && Array.isArray(data.options)) {
            const hiddenAnswers = Array.isArray(data.hiddenAnswers) ? data.hiddenAnswers : [];
            const selectedAnswer = Number.isInteger(data.selectedAnswer) ? data.selectedAnswer : null;
            optionsEl.innerHTML = data.options
                .map((opt, i) => {
                    const isHidden = hiddenAnswers.includes(i);
                    const isSelected = selectedAnswer === i;
                    const isDisabled = isHidden || data.state === 'processing' || data.state === 'finished';

                    return `
                        <button
                            type="button"
                            class="option-item option-button${isSelected ? ' selected' : ''}${isHidden ? ' hidden-option' : ''}"
                            data-answer-index="${i}"
                            ${isDisabled ? 'disabled' : ''}
                        >
                            <span class="option-label">${String.fromCharCode(65 + i)}</span>
                            <span class="option-value">${escapeInputValue(opt)}</span>
                        </button>
                    `;
                })
                .join('');
        } else {
            optionsEl.innerHTML = '<p class="empty">Waiting for answer choices...</p>';
        }
        
        // Update lifeline button states
        if (data.lifelines) {
            document.getElementById('btn-5050').disabled = data.lifelines.fiftyFifty?.used;
            document.getElementById('btn-phone').disabled = data.lifelines.phoneFriend?.used;
            document.getElementById('btn-audience').disabled = data.lifelines.askAudience?.used;
        }

        renderMillionaireUpcoming();
    }

    // Word Game controls
    document.getElementById('btn-kelime-start')?.addEventListener('click', () => {
        const questions = sortWordGameQuestions(currentWordList
            .map(normalizeWordGameQuestion)
            .filter((item) => item.question && item.answer));

        if (questions.length > 0) {
            socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'START_GAME', questions });
        } else {
            socket.emit('adminUpdateHost', { gameId: currentGameId, game: 'Word Game', action: 'START_GAME' });
        }

        setKelimeSetupCollapsed(true);
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
    document.getElementById('btn-kelime-generate')?.addEventListener('click', async () => {
        const button = document.getElementById('btn-kelime-generate');
        const theme = kelimeThemeInput?.value.trim() || '';
        const cefrLevel = kelimeCefrLevel?.value || '';

        if (!currentGameId) {
            setKelimeGenerateStatus('Connect to a Word Game first.', 'error');
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = 'Generating...';
        }

        try {
            setKelimeGenerateStatus('Generating a new Word Game pack...', 'info');
            const questions = await requestWordGameQuestions(theme, cefrLevel);
            syncWordGameQuestions(
                questions,
                `${questions.length} AI-generated questions were synced to the host.`
            );
        } catch (error) {
            console.error('Word Game AI generation error:', error);
            setKelimeGenerateStatus(error.message || 'Failed to generate questions.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Generate with AI';
            }
        }
    });
    document.getElementById('btn-kelime-default')?.addEventListener('click', () => {
        syncWordGameQuestions(
            WORD_GAME_DEFAULT_QUESTIONS,
            `${WORD_GAME_DEFAULT_QUESTIONS.length} default questions were synced to the host.`
        );
    });
    kelimeSetupToggle?.addEventListener('click', () => {
        setKelimeSetupCollapsed(!kelimeSetupCollapsed);
    });

    document.getElementById('btn-millionaire-generate')?.addEventListener('click', async () => {
        const button = document.getElementById('btn-millionaire-generate');
        const theme = millionaireThemeInput?.value.trim() || '';

        if (!currentGameId) {
            setMillionaireGenerateStatus('Connect to a Millionaire game first.', 'error');
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = 'Generating...';
        }

        try {
            setMillionaireGenerateStatus('Generating a new Millionaire question set...', 'info');
            const questions = await requestMillionaireQuestions(theme);
            syncMillionaireQuestions(
                questions,
                `${questions.length} AI-generated Millionaire questions were synced to the host.`
            );
        } catch (error) {
            console.error('Millionaire AI generation error:', error);
            setMillionaireGenerateStatus(error.message || 'Failed to generate questions.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Generate with AI';
            }
        }
    });
    document.getElementById('btn-millionaire-default')?.addEventListener('click', () => {
        syncMillionaireQuestions(
            MILLIONAIRE_DEFAULT_QUESTIONS,
            `${MILLIONAIRE_DEFAULT_QUESTIONS.length} default Millionaire questions were synced to the host.`
        );
    });
    document.getElementById('btn-millionaire-start')?.addEventListener('click', () => {
        const questions = currentWordList.map(normalizeMillionaireQuestion).filter((item) => item.question && item.options.every(Boolean));
        emitMillionaireAction('START_GAME', questions.length > 0 ? { questions } : {});
        setMillionaireSetupCollapsed(true);
    });
    millionaireSetupToggle?.addEventListener('click', () => {
        setMillionaireSetupCollapsed(!millionaireSetupCollapsed);
    });

    // Millionaire controls
    millionaireOptionsEl?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-answer-index]');
        if (!button || button.disabled) return;

        const answerIndex = Number.parseInt(button.dataset.answerIndex, 10);
        if (!Number.isInteger(answerIndex)) return;

        emitMillionaireAction('SELECT_ANSWER', { answerIndex });
    });

    document.getElementById('btn-5050')?.addEventListener('click', () => {
        emitMillionaireAction('USE_LIFELINE', { lifeline: 'fiftyFifty' });
    });
    document.getElementById('btn-phone')?.addEventListener('click', () => {
        emitMillionaireAction('USE_LIFELINE', { lifeline: 'phoneFriend' });
    });
    document.getElementById('btn-audience')?.addEventListener('click', () => {
        emitMillionaireAction('USE_LIFELINE', { lifeline: 'askAudience' });
    });
    document.getElementById('btn-timer-toggle')?.addEventListener('click', () => {
        emitMillionaireAction('TOGGLE_TIMER');
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
            currentWordList = sortWordGameQuestions(data.questions.map(normalizeWordGameQuestion));
        } else if (data.type === 'millionaire' && data.questions) {
            currentWordList = data.questions.map(normalizeMillionaireQuestion);
            renderMillionaireUpcoming();
        }

        currentEditorIndex = 0;
        clampEditorIndex();
        renderWordList();
    });

    function renderWordList() {
        clampEditorIndex();
        syncEditorControls();
        wordListContainer.innerHTML = '';

        if (currentWordList.length === 0) {
            wordListContainer.innerHTML = `
                <div class="editor-empty">
                    <p class="empty">No items yet. Sync or add content to start editing.</p>
                </div>
            `;
            return;
        }

        const item = currentWordList[currentEditorIndex];
        const el = document.createElement('div');
        el.className = 'word-item';

        if (currentGameType === 'hangman') {
            const wordItem = typeof item === 'string' ? { word: item, cat: '' } : item;
            el.innerHTML = `
                <div class="editor-fields">
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-word">Word</label>
                        <input id="editor-word" type="text" value="${escapeInputValue(wordItem.word || '')}" data-index="${currentEditorIndex}" data-field="word" placeholder="Word">
                    </div>
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-cat">Category</label>
                        <input id="editor-cat" type="text" value="${escapeInputValue(wordItem.cat || '')}" data-index="${currentEditorIndex}" data-field="cat" placeholder="Category">
                    </div>
                </div>
            `;
        } else if (currentGameType === 'taboo') {
            const forbidden = Array.isArray(item.forbidden) ? item.forbidden.join(', ') : '';
            el.innerHTML = `
                <div class="editor-fields">
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-word">Word</label>
                        <input id="editor-word" type="text" value="${escapeInputValue(item.word || '')}" data-index="${currentEditorIndex}" data-field="word" placeholder="Word">
                    </div>
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-forbidden">Forbidden words</label>
                        <textarea id="editor-forbidden" data-index="${currentEditorIndex}" data-field="forbidden" placeholder="Forbidden words, comma separated">${escapeInputValue(forbidden)}</textarea>
                    </div>
                </div>
            `;
        } else if (currentGameType === 'whoami') {
            el.innerHTML = `
                <div class="editor-fields">
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-word">Character</label>
                        <input id="editor-word" type="text" value="${escapeInputValue(item)}" data-index="${currentEditorIndex}" data-field="word" placeholder="Character">
                    </div>
                </div>
            `;
        } else if (currentGameType === 'kelime') {
            el.innerHTML = `
                <div class="editor-fields">
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-question">Question</label>
                        <textarea id="editor-question" data-index="${currentEditorIndex}" data-field="question" placeholder="Question">${escapeInputValue(item.question || '')}</textarea>
                    </div>
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-answer">Answer</label>
                        <input id="editor-answer" type="text" value="${escapeInputValue(item.answer || '')}" data-index="${currentEditorIndex}" data-field="answer" placeholder="Answer">
                    </div>
                </div>
            `;
        } else if (currentGameType === 'millionaire') {
            const question = normalizeMillionaireQuestion(item);
            el.innerHTML = `
                <div class="editor-fields">
                    <div class="editor-field-group">
                        <label class="editor-field-label" for="editor-question">Question</label>
                        <textarea id="editor-question" data-index="${currentEditorIndex}" data-field="question" placeholder="Question">${escapeInputValue(question.question)}</textarea>
                    </div>
                    <div class="editor-option-grid">
                        <div class="editor-field-group">
                            <label class="editor-field-label" for="editor-option-0">Option A</label>
                            <input id="editor-option-0" type="text" value="${escapeInputValue(question.options[0])}" data-index="${currentEditorIndex}" data-field="option-0" placeholder="Option A">
                        </div>
                        <div class="editor-field-group">
                            <label class="editor-field-label" for="editor-option-1">Option B</label>
                            <input id="editor-option-1" type="text" value="${escapeInputValue(question.options[1])}" data-index="${currentEditorIndex}" data-field="option-1" placeholder="Option B">
                        </div>
                        <div class="editor-field-group">
                            <label class="editor-field-label" for="editor-option-2">Option C</label>
                            <input id="editor-option-2" type="text" value="${escapeInputValue(question.options[2])}" data-index="${currentEditorIndex}" data-field="option-2" placeholder="Option C">
                        </div>
                        <div class="editor-field-group">
                            <label class="editor-field-label" for="editor-option-3">Option D</label>
                            <input id="editor-option-3" type="text" value="${escapeInputValue(question.options[3])}" data-index="${currentEditorIndex}" data-field="option-3" placeholder="Option D">
                        </div>
                    </div>
                    <div class="editor-inline">
                        <div class="editor-field-group">
                            <label class="editor-field-label" for="editor-correct">Correct answer</label>
                            <input id="editor-correct" type="number" value="${question.correct}" data-index="${currentEditorIndex}" data-field="correct" min="0" max="3" placeholder="Correct (0-3)">
                        </div>
                    </div>
                </div>
            `;
        }

        wordListContainer.appendChild(el);
        wordListContainer.querySelectorAll('input, textarea').forEach((input) => {
            input.addEventListener('input', handleWordEdit);
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
        } else if (currentGameType === 'kelime') {
            if (field === 'question') currentWordList[index].question = val;
            if (field === 'answer') currentWordList[index].answer = val.toUpperCase();
        } else if (currentGameType === 'millionaire') {
            const currentQuestion = normalizeMillionaireQuestion(currentWordList[index]);
            if (field === 'question') currentQuestion.question = val;
            if (field.startsWith('option-')) {
                const optionIndex = Number.parseInt(field.split('-')[1], 10);
                if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex <= 3) {
                    currentQuestion.options[optionIndex] = val.trim();
                }
            }
            if (field === 'correct') {
                const parsedCorrect = Number.parseInt(val, 10);
                currentQuestion.correct = Number.isInteger(parsedCorrect) && parsedCorrect >= 0 && parsedCorrect <= 3
                    ? parsedCorrect
                    : 0;
            }
            currentWordList[index] = currentQuestion;
        }
    }

    document.getElementById('btn-add-word')?.addEventListener('click', () => {
        if (currentGameType === 'hangman') {
            currentWordList.unshift({ word: 'NEW', cat: '' });
        } else if (currentGameType === 'taboo') {
            currentWordList.unshift({ word: 'New', forbidden: ['word1', 'word2'] });
        } else if (currentGameType === 'whoami') {
            currentWordList.unshift('New Character');
        } else if (currentGameType === 'kelime') {
            currentWordList.unshift({ question: 'New Question?', answer: 'ANSWER' });
        } else if (currentGameType === 'millionaire') {
            currentWordList.unshift({
                question: 'New Question?',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correct: 0
            });
        }
        currentEditorIndex = 0;
        renderWordList();
    });

    btnPrevItem?.addEventListener('click', () => {
        if (currentEditorIndex <= 0) return;
        currentEditorIndex -= 1;
        renderWordList();
    });

    btnNextItem?.addEventListener('click', () => {
        if (currentEditorIndex >= currentWordList.length - 1) return;
        currentEditorIndex += 1;
        renderWordList();
    });

    document.getElementById('btn-save-words')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-save-words');
        btn.textContent = 'Saved!';
        
        const payload = { gameId: currentGameId, type: currentGameType };
        if (currentGameType === 'hangman') payload.words = currentWordList;
        if (currentGameType === 'taboo') payload.cards = currentWordList;
        if (currentGameType === 'whoami') payload.characters = currentWordList;
        if (currentGameType === 'kelime') {
            currentWordList = sortWordGameQuestions(currentWordList.map(normalizeWordGameQuestion));
            payload.questions = currentWordList;
        }
        if (currentGameType === 'millionaire') payload.questions = currentWordList.map(normalizeMillionaireQuestion);

        socket.emit('updateWordListAdmin', payload);
        renderWordList();
        
        setTimeout(() => {
            btn.textContent = 'Save';
        }, 1000);
    });

    function resetUI() {
        gameNameEl.textContent = 'None';
        currentGameType = null;
        currentWordList = [];
        currentMillionaireLevel = 0;
        currentEditorIndex = 0;
        setKelimeGenerateStatus('Questions are managed from here.', 'info');
        setMillionaireGenerateStatus('Generate or sync a question pack before starting.', 'info');
        setKelimeSetupCollapsed(false);
        setMillionaireSetupCollapsed(false);
        hangmanDataEl?.classList.add('hidden');
        tabooDataEl?.classList.add('hidden');
        whoamiDataEl?.classList.add('hidden');
        kelimeDataEl?.classList.add('hidden');
        millionaireDataEl?.classList.add('hidden');
        wordManagerCard?.classList.add('hidden');
        waitingMessageEl.classList.remove('hidden');
        renderMillionaireUpcoming();
        renderWordList();
    }
});
