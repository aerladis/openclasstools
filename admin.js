/* ============================================
   ADMIN PANEL LOGIC
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let currentWordList = [];
    let currentGameType = null;
    let currentGameId = null;

    // DOM Elements - Login
    const loginCard = document.getElementById('login-card');
    const gameIdInput = document.getElementById('game-id-input');
    const btnConnect = document.getElementById('btn-connect');
    const connectError = document.getElementById('connect-error');

    // DOM Elements - Dashboard
    const dashboardSetup = document.getElementById('dashboard-setup');
    const connectionStatus = document.getElementById('connection-status');
    const connectedGameIdEl = document.getElementById('connected-game-id');
    const gameNameEl = document.getElementById('game-name');
    const waitingMessageEl = document.getElementById('waiting-message');

    // Game specific sections
    const hangmanDataEl = document.getElementById('hangman-data');
    const tabooDataEl = document.getElementById('taboo-data');
    const whoamiDataEl = document.getElementById('whoami-data');


    // DOM Elements - Hangman
    const hangmanWordEl = document.getElementById('hangman-word');
    const hangmanCategoryEl = document.getElementById('hangman-category');
    const hangmanWrongEl = document.getElementById('hangman-wrong');
    const hangmanStateEl = document.getElementById('hangman-state');

    // DOM Elements - Taboo
    const tabooWordEl = document.getElementById('taboo-word');
    const tabooTeamEl = document.getElementById('taboo-team');
    const tabooTimeEl = document.getElementById('taboo-time');
    const tabooForbiddenEl = document.getElementById('taboo-forbidden');

    // DOM Elements - Who Am I
    const whoamiCharacterEl = document.getElementById('whoami-character');

    // DOM Elements - Kelime Oyunu
    const kelimeDataEl = document.getElementById('kelime-data');
    const kelimeQuestionEl = document.getElementById('kelime-question');
    const kelimeAnswerEl = document.getElementById('kelime-answer');
    const kelimeStatusEl = document.getElementById('kelime-status');
    const kelimePotentialEl = document.getElementById('kelime-potential');
    const kelimeCounterEl = document.getElementById('kelime-counter');
    const btnKelimeReveal = document.getElementById('btn-kelime-reveal');
    const btnKelimeTimer = document.getElementById('btn-kelime-timer');
    const btnKelimeCorrect = document.getElementById('btn-kelime-correct');
    const btnKelimePass = document.getElementById('btn-kelime-pass');
    const btnKelimeNext = document.getElementById('btn-kelime-next');
    const btnKelimePrev = document.getElementById('btn-kelime-prev');

    // DOM Elements - Word Manager
    const wordManagerCard = document.getElementById('word-manager-card');
    const wordListContainer = document.getElementById('word-list-container');
    const btnAddWord = document.getElementById('btn-add-word');
    const btnSaveWords = document.getElementById('btn-save-words');

    // Connection Logic
    btnConnect.addEventListener('click', () => {
        const id = gameIdInput.value.trim().toUpperCase();
        if (id.length !== 4) {
            connectError.textContent = "Game ID must be 4 characters.";
            connectError.style.display = 'block';
            return;
        }

        socket.emit('adminJoin', id, (response) => {
            if (response.success) {
                currentGameId = id;
                loginCard.classList.add('hidden');
                dashboardSetup.classList.remove('hidden');
                connectedGameIdEl.textContent = `ID: ${id}`;
                socket.emit('requestState', id);
            } else {
                connectError.textContent = response?.error || 'Failed to connect to game';
                connectError.style.display = 'block';
            }
        });
    });

    // Connection Events
    socket.on('connect', () => {
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'status-indicator connected';
    });

    socket.on('disconnect', () => {
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.className = 'status-indicator disconnected';
        resetUI();
    });

    // Handle Game Updates
    socket.on('adminUpdate', (data) => {
        if (!data || !data.game || data.gameId !== currentGameId) return;

        gameNameEl.textContent = data.game;
        waitingMessageEl.classList.add('hidden');

        // Hide all game data initially
        hangmanDataEl.classList.add('hidden');
        tabooDataEl.classList.add('hidden');
        whoamiDataEl.classList.add('hidden');
        if (kelimeDataEl) kelimeDataEl.classList.add('hidden');

        if (data.game === 'Hangman') {
            hangmanDataEl.classList.remove('hidden');

            if (data.status === 'gameOver') {
                hangmanWordEl.textContent = data.word + (data.won ? ' (Won!)' : ' (Lost)');
            } else {
                hangmanWordEl.textContent = data.word;
            }

            hangmanCategoryEl.textContent = data.category || 'None';
            hangmanWrongEl.textContent = data.wrongCount || 0;
            hangmanStateEl.textContent = data.currentState || '';

        } else if (data.game === 'Taboo') {
            tabooDataEl.classList.remove('hidden');

            tabooWordEl.textContent = data.word || '---';
            tabooTeamEl.textContent = data.team || '---';
            tabooTimeEl.textContent = data.timeLeft || 0;

            if (data.forbidden && Array.isArray(data.forbidden)) {
                tabooForbiddenEl.innerHTML = data.forbidden
                    .map(w => `<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold;">${w}</span>`)
                    .join('');
            } else {
                tabooForbiddenEl.innerHTML = '';
            }

        } else if (data.game === 'Who Am I') {
            whoamiDataEl.classList.remove('hidden');
            whoamiCharacterEl.textContent = data.active && data.character ? data.character : '(Hidden / Choosing)';
        } else if (data.game === 'Kelime Oyunu') {
            if (kelimeDataEl) {
                kelimeDataEl.classList.remove('hidden');
                kelimeQuestionEl.textContent = data.question || '---';
                kelimeAnswerEl.textContent = data.currentWord || '---';
                kelimePotentialEl.textContent = data.potentialScore || 0;
                
                // Update counter
                if (kelimeCounterEl) {
                    const current = (data.currentIndex || 0) + 1;
                    const total = data.totalQuestions || 0;
                    kelimeCounterEl.textContent = `${current} / ${total}`;
                }

                let timeStr = `${Math.floor(data.timeRemaining / 60)}:${(data.timeRemaining % 60).toString().padStart(2, '0')}`;

                if (data.timeRemaining <= 0) {
                    kelimeStatusEl.textContent = 'Time Up!';
                } else if (data.isTimerRunning) {
                    kelimeStatusEl.textContent = `Running (${timeStr})`;
                } else {
                    kelimeStatusEl.textContent = `Paused (${timeStr})`;
                }
            }
        }
    });

    function resetUI() {
        gameNameEl.textContent = 'None';
        hangmanDataEl.classList.add('hidden');
        tabooDataEl.classList.add('hidden');
        whoamiDataEl.classList.add('hidden');
        if (kelimeDataEl) kelimeDataEl.classList.add('hidden');
        wordManagerCard.classList.add('hidden');
        waitingMessageEl.classList.remove('hidden');
        waitingMessageEl.textContent = 'Waiting for a game to start on the smartboard...';
    }

    // Kelime Oyunu Admin Controls
    if (btnKelimeReveal) {
        btnKelimeReveal.addEventListener('click', () => {
            if (currentGameId) socket.emit('adminUpdateHost', { gameId: currentGameId, action: 'REVEAL_LETTER' });
        });
        btnKelimeTimer.addEventListener('click', () => {
            if (currentGameId) socket.emit('adminUpdateHost', { gameId: currentGameId, action: 'TOGGLE_TIMER' });
        });
        btnKelimeCorrect.addEventListener('click', () => {
            if (currentGameId) socket.emit('adminUpdateHost', { gameId: currentGameId, action: 'CORRECT_ANSWER' });
        });
        btnKelimePass.addEventListener('click', () => {
            if (currentGameId) socket.emit('adminUpdateHost', { gameId: currentGameId, action: 'PASS_QUESTION' });
        });
        
        // Navigation controls
        if (btnKelimeNext) {
            btnKelimeNext.addEventListener('click', () => {
                if (currentGameId) socket.emit('adminUpdateHost', { gameId: currentGameId, action: 'NEXT_QUESTION' });
            });
        }
        if (btnKelimePrev) {
            btnKelimePrev.addEventListener('click', () => {
                if (currentGameId) socket.emit('adminUpdateHost', { gameId: currentGameId, action: 'PREV_QUESTION' });
            });
        }
    }

    // ============================================
    // Word Management Logic
    // ============================================

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
        }

        renderWordList();
    });

    function renderWordList() {
        wordListContainer.innerHTML = '';
        if (currentWordList.length === 0) {
            wordListContainer.innerHTML = '<p class="text-muted text-center">No words available.</p>';
            return;
        }

        currentWordList.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'word-item';
            el.style.cssText = 'background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border);';

            let contentHTML = '';

            if (currentGameType === 'hangman') {
                // Hangman: item = { word: string, cat: string } or string
                const w = typeof item === 'string' ? item : item.word;
                const c = item.cat || '';
                contentHTML = `
                    <input type="text" class="edit-input" data-index="${index}" data-field="word" value="${w}" style="font-weight: bold; width: 100%; margin-bottom: 0.5rem;" />
                    <input type="text" class="edit-input" data-index="${index}" data-field="cat" value="${c}" placeholder="Category" style="width: 100%; font-size: 0.8rem;" />
                `;
            } else if (currentGameType === 'taboo') {
                // Taboo: item = { word: string, forbidden: string[] }
                const fb = item.forbidden.join(', ');
                contentHTML = `
                    <input type="text" class="edit-input" data-index="${index}" data-field="word" value="${item.word}" style="font-weight: bold; width: 100%; margin-bottom: 0.5rem; color: var(--primary);" />
                    <input type="text" class="edit-input" data-index="${index}" data-field="forbidden" value="${fb}" placeholder="Forbidden (comma separated)" style="width: 100%; font-size: 0.8rem; color: #ef4444;" />
                `;
            } else if (currentGameType === 'whoami') {
                // Who Am I: item = string
                contentHTML = `
                    <input type="text" class="edit-input" data-index="${index}" data-field="word" value="${item}" style="font-weight: bold; width: 100%;" />
                `;
            } else if (currentGameType === 'kelime') {
                // Kelime: {"question": "...", "answer": "..."}
                contentHTML = `
                    <input type="text" class="edit-input" data-index="${index}" data-field="answer" value="${item.answer}" style="font-weight: bold; width: 100%; margin-bottom: 0.5rem; color: var(--accent-1); text-transform: uppercase;" placeholder="Cevap (Örn: ANKARA)" />
                    <input type="text" class="edit-input" data-index="${index}" data-field="question" value="${item.question}" placeholder="Soru Metni" style="width: 100%; font-size: 0.8rem;" />
                `;
            }

            el.innerHTML = `
                <div style="display: flex; gap: 0.5rem;">
                    <div style="flex: 1;">${contentHTML}</div>
                    <button class="btn-remove text-muted" data-index="${index}" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0 0.5rem; align-self: flex-start;">×</button>
                </div>
            `;
            wordListContainer.appendChild(el);
        });

        // Attach listeners to new elements
        document.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('change', handleEdit);
        });
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', handleRemove);
        });
    }

    function handleEdit(e) {
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
            if (field === 'answer') currentWordList[index].answer = val.toUpperCase().trim();
            if (field === 'question') currentWordList[index].question = val;
        }
    }

    function handleRemove(e) {
        const index = parseInt(e.currentTarget.dataset.index);
        currentWordList.splice(index, 1);
        renderWordList();
    }

    btnAddWord.addEventListener('click', () => {
        if (currentGameType === 'hangman') {
            currentWordList.unshift({ word: 'NEW_WORD', cat: 'Category' });
        } else if (currentGameType === 'taboo') {
            currentWordList.unshift({ word: 'New Card', forbidden: ['Word 1', 'Word 2', 'Word 3'] });
        } else if (currentGameType === 'whoami') {
            currentWordList.unshift('New Character');
        } else if (currentGameType === 'kelime') {
            currentWordList.unshift({ answer: 'CEVAP', question: 'Yeni Soru' });
        }
        renderWordList();

        // Scroll to top to see newly added word
        wordListContainer.scrollTop = 0;
    });

    btnSaveWords.addEventListener('click', () => {
        const btn = btnSaveWords;
        const originalText = btn.textContent;
        btn.textContent = "Syncing...";
        btn.disabled = true;

        const payload = { gameId: currentGameId, type: currentGameType };
        if (currentGameType === 'hangman') payload.words = currentWordList;
        if (currentGameType === 'taboo') payload.cards = currentWordList;
        if (currentGameType === 'whoami') payload.characters = currentWordList;
        if (currentGameType === 'kelime') payload.questions = currentWordList;

        socket.emit('updateWordListAdmin', payload);

        setTimeout(() => {
            btn.textContent = "Saved!";
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1000);
        }, 500);
    });
});
