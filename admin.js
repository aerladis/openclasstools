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
        }
    });

    function resetUI() {
        gameNameEl.textContent = 'None';
        hangmanDataEl.classList.add('hidden');
        tabooDataEl.classList.add('hidden');
        whoamiDataEl.classList.add('hidden');
        wordManagerCard.classList.add('hidden');
        waitingMessageEl.classList.remove('hidden');
        waitingMessageEl.textContent = 'Waiting for a game to start on the smartboard...';
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
