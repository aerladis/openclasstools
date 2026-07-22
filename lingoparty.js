/* =========================================================
   lingoparty.js - LingoParty Interactive Board Game
   ========================================================= */

// --- Audio Effects via Web Audio API ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'roll') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    } else if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'trophy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.15); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.3); // D6
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
    }
}

/* === Section: Game State & Configuration === */
const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = io();

let gameState = {
    gameId,
    activeScreen: 'setup',
    teams: [],
    currentTeamIndex: 0,
    round: 1,
    boardLength: 22,
    tiles: [],
    deck: [],
    isRolling: false,
    activeChallenge: null,
    timerInterval: null,
    timeLeft: 45
};

// Default Fallback Deck
const DEFAULT_DECK = [
    { type: 'riddle', prompt: 'I have keys but no locks. I have space but no room. You can enter, but you can\'t go outside. What am I?', answer: 'A keyboard', coins: 15 },
    { type: 'riddle', prompt: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?', answer: 'An echo', coins: 15 },
    { type: 'scramble', scrambledWord: 'T-A-E-W-R', targetWord: 'WATER', clue: 'You drink this essential liquid every day.', coins: 15 },
    { type: 'scramble', scrambledWord: 'L-E-P-P-A', targetWord: 'APPLE', clue: 'A sweet red or green fruit.', coins: 15 },
    { type: 'pronunciation', prompt: 'She sells seashells by the seashore.', coins: 15 },
    { type: 'pronunciation', prompt: 'How much wood would a woodchuck chuck if a woodchuck could chuck wood?', coins: 15 },
    { type: 'association', prompt: 'Name 3 common adjectives that naturally collocate with the noun: WEATHER.', answer: 'e.g. sunny, rainy, cold, stormy, mild', coins: 10 },
    { type: 'association', prompt: 'Complete the English proverb: Actions speak louder than ___.', answer: 'words', coins: 10 },
    { type: 'grammar', prompt: 'Correct the error: She don\'t like eating vegetables.', answer: 'She doesn\'t like eating vegetables.', coins: 15 },
    { type: 'grammar', prompt: 'Correct the error: Yesterday we go to the cinema.', answer: 'Yesterday we went to the cinema.', coins: 15 },
    { type: 'speed', prompt: 'Name 4 different sports played with a ball in 15 seconds.', answer: 'e.g. Football, Basketball, Tennis, Volleyball', coins: 10 },
    { type: 'speed', prompt: 'Name 3 things you can find inside a kitchen fridge.', answer: 'e.g. Milk, Cheese, Butter, Eggs', coins: 10 },
    { type: 'roleplay', prompt: 'You are at a clothes shop and bought a shirt yesterday, but it is too small. Speak to the cashier to exchange it.', coins: 20 },
    { type: 'roleplay', prompt: 'You are ordering dinner at a fancy restaurant. Ask the waiter for recommendations and order a three-course meal.', coins: 20 },
    { type: 'roleplay', prompt: 'You are at the airport and your flight gate just changed. Ask the airline agent where the new gate is located and if your flight is delayed.', coins: 20 },
    { type: 'roleplay', prompt: 'You arrived at your hotel room, but the air conditioning is broken and there are no towels. Call the hotel front desk politely to request assistance.', coins: 20 },
    { type: 'roleplay', prompt: 'You are in a job interview. Give a 30-second introduction explaining your background, skills, and why you are excited for this role.', coins: 20 },
    { type: 'roleplay', prompt: 'Order a custom coffee drink and a snack at a busy cafe. Ask about milk options and pay with a card.', coins: 20 },
    { type: 'roleplay', prompt: 'You lost your backpack at a train station. Describe your bag (color, size, contents) to station security.', coins: 20 },
    { type: 'roleplay', prompt: 'You feel sick with a fever and sore throat. Describe your symptoms to the doctor and ask for medical advice.', coins: 20 }
];

/* === Section: DOM Elements === */
const setupScreenEl = document.getElementById('setup-screen');
const gameScreenEl = document.getElementById('game-screen');
const gameIdBadgeEl = document.getElementById('game-id-badge');
const gameIdTextEl = document.getElementById('game-id-text');

// Setup inputs
const teamCountSelect = document.getElementById('team-count-select');
const boardLengthSelect = document.getElementById('board-length');
const cefrSelect = document.getElementById('cefr-select');
const topicInput = document.getElementById('topic-input');
const btnGenerateAi = document.getElementById('btn-generate-ai');
const btnDefaultDeck = document.getElementById('btn-default-deck');

// Board stage elements
const turnPawnEl = document.getElementById('turn-pawn');
const turnTeamNameEl = document.getElementById('turn-team-name');
const roundCounterEl = document.getElementById('round-counter');
const leaderboardListEl = document.getElementById('leaderboard-list');
const boardTrackEl = document.getElementById('board-track');
const diceDisplayEl = document.getElementById('dice-display');
const btnRollDice = document.getElementById('btn-roll-dice');
const inventoryListEl = document.getElementById('inventory-list');

// Challenge Modal elements
const challengeModalEl = document.getElementById('challenge-modal');
const challengeTypeBadgeEl = document.getElementById('challenge-type-badge');
const challengeCoinsBadgeEl = document.getElementById('challenge-coins-badge');
const challengeWordEl = document.getElementById('challenge-word');
const challengeSubcontentEl = document.getElementById('challenge-subcontent');
const challengeTimerFillEl = document.getElementById('challenge-timer-fill');
const challengeTimeTextEl = document.getElementById('challenge-time-text');
const btnChallengeCorrect = document.getElementById('btn-challenge-correct');
const btnChallengeWrong = document.getElementById('btn-challenge-wrong');
const btnChallengePass = document.getElementById('btn-challenge-pass');

// Shop Modal elements
const shopModalEl = document.getElementById('shop-modal');
const shopItemsGridEl = document.getElementById('shop-items-grid');
const btnShopClose = document.getElementById('btn-shop-close');

// Mystery Box Modal elements
const mysteryModalEl = document.getElementById('mystery-modal');
const mysteryRevealAreaEl = document.getElementById('mystery-reveal-area');
const mysteryGiftIconEl = document.getElementById('mystery-gift-icon');
const mysteryEventTitleEl = document.getElementById('mystery-event-title');
const mysteryEventDescEl = document.getElementById('mystery-event-desc');
const mysteryTeamSubtitleEl = document.getElementById('mystery-team-subtitle');
const btnMysteryAction = document.getElementById('btn-mystery-action');
const btnMysteryClose = document.getElementById('btn-mystery-close');

/* === Section: Socket.IO Initialization === */
socket.emit('hostJoin', gameId, (res) => {
    if (res && res.success) {
        console.log(`📡 LingoParty host joined: ${gameId}`);
        gameIdTextEl.textContent = `ID: ${gameId}`;
        gameIdBadgeEl.classList.remove('hidden');
        broadcastState();
    } else {
        console.error('Failed to join room as host:', res?.error);
    }
});

function broadcastState() {
    socket.emit('hostUpdate', {
        gameId,
        type: 'LingoParty',
        game: 'LingoParty',
        activeScreen: gameState.activeScreen,
        teams: gameState.teams,
        currentTeamIndex: gameState.currentTeamIndex,
        round: gameState.round,
        boardLength: gameState.boardLength,
        activeChallenge: gameState.activeChallenge
    });

    socket.emit('lingoSync', {
        gameId,
        gameState
    });
}

// Handle incoming commands from admin/mobile
socket.on('adminUpdate', (data) => {
    if (!data || data.gameId !== gameId) return;
    handleRemoteAction(data);
});

socket.on('lingoActionHost', (data) => {
    if (!data || data.gameId !== gameId) return;
    handleRemoteAction(data);
});

function handleRemoteAction(data) {
    if (data.action === 'ROLL_DICE') {
        if (!gameState.isRolling && gameState.activeScreen === 'game') {
            rollDice();
        }
    } else if (data.action === 'GRADE_ANSWER') {
        if (data.grade === 'correct') gradeChallenge(true);
        else if (data.grade === 'wrong') gradeChallenge(false);
        else if (data.grade === 'pass') passChallenge();
    } else if (data.action === 'BUY_ITEM' && typeof data.itemIndex === 'number') {
        buyShopItem(data.itemIndex);
    }
}

/* === Section: Setup & Initialization === */
teamCountSelect.addEventListener('change', () => {
    const count = parseInt(teamCountSelect.value, 10);
    const rows = document.querySelectorAll('.team-setup-row');
    rows.forEach((row, idx) => {
        if (idx < count) row.style.display = 'flex';
        else row.style.display = 'none';
    });
});

btnDefaultDeck.addEventListener('click', () => {
    startGameWithDeck(DEFAULT_DECK);
});

btnGenerateAi.addEventListener('click', async () => {
    const topic = topicInput.value.trim() || 'General Classroom English';
    const cefr = cefrSelect.value || 'A2';
    const count = parseInt(boardLengthSelect.value, 10) || 22;

    btnGenerateAi.disabled = true;
    btnGenerateAi.innerHTML = '✨ Generating Deck via Gemini...';

    try {
        const response = await fetch('/api/generate-lingoparty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: topic, count: count + 8, cefr })
        });

        const data = await response.json();
        if (data.success && Array.isArray(data.cards) && data.cards.length > 0) {
            startGameWithDeck(data.cards);
        } else {
            alert('AI Generation returned limited cards. Using default deck mixed with generated cards!');
            startGameWithDeck([...(data.cards || []), ...DEFAULT_DECK]);
        }
    } catch (err) {
        console.error('AI Generation failed:', err);
        alert('AI service error or timeout. Starting game with Default Deck!');
        startGameWithDeck(DEFAULT_DECK);
    } finally {
        btnGenerateAi.disabled = false;
        btnGenerateAi.innerHTML = '✨ AI Generate Deck';
    }
});

function startGameWithDeck(deck) {
    gameState.deck = [...deck];
    gameState.boardLength = parseInt(boardLengthSelect.value, 10) || 22;

    // Collect active teams
    const activeRows = document.querySelectorAll('.team-setup-row[style*="flex"], .team-setup-row:not([style*="none"])');
    gameState.teams = [];
    const pawns = ['🔴', '🔵', '🟢', '🟡'];
    
    document.querySelectorAll('.team-setup-row').forEach((row, idx) => {
        if (row.style.display !== 'none') {
            const input = row.querySelector('.team-name-input');
            const name = input ? input.value.trim() || `Team ${idx + 1}` : `Team ${idx + 1}`;
            gameState.teams.push({
                id: idx,
                name: name,
                pawn: pawns[idx] || '🎲',
                position: 0,
                coins: 20,
                trophies: 0,
                items: []
            });
        }
    });

    if (gameState.teams.length < 2) {
        alert('Please select at least 2 teams to start LingoParty!');
        return;
    }

    // Generate Board Tiles
    generateBoardTiles(gameState.boardLength);

    // Switch Screens
    setupScreenEl.classList.remove('active');
    gameScreenEl.classList.add('active');
    gameState.activeScreen = 'game';

    updateTurnHeader();
    renderLeaderboard();
    renderBoardTrack();
    renderInventory();
    broadcastState();
}

/* === Section: Board Generation & Rendering === */
function generateBoardTiles(totalLength) {
    const tileTypes = ['riddle', 'scramble', 'pronunciation', 'association', 'speed', 'grammar', 'roleplay'];
    gameState.tiles = [];

    for (let i = 0; i < totalLength; i++) {
        const coords = getMapCoordinates(i, totalLength);
        if (i === 0) {
            gameState.tiles.push({ type: 'start', label: 'Start Base', icon: '🏁', x: coords.x, y: coords.y });
        } else if (i === totalLength - 1) {
            gameState.tiles.push({ type: 'finish', label: 'Trophy Goal', icon: '🏆', x: coords.x, y: coords.y });
        } else if (i % 6 === 0) {
            gameState.tiles.push({ type: 'shop', label: 'Sanctuary', icon: '🛒', x: coords.x, y: coords.y });
        } else if (i % 5 === 0) {
            gameState.tiles.push({ type: 'chance', label: 'Mystery', icon: '🎁', x: coords.x, y: coords.y });
        } else {
            const randomType = tileTypes[i % tileTypes.length];
            let icon = '🧩';
            let label = 'Riddle';
            if (randomType === 'scramble') { icon = '🔡'; label = 'Scramble'; }
            if (randomType === 'pronunciation') { icon = '🗣️'; label = 'Speech'; }
            if (randomType === 'association') { icon = '🔗'; label = 'Collocate'; }
            if (randomType === 'speed') { icon = '⚡'; label = 'Speed Relay'; }
            if (randomType === 'grammar') { icon = '🔍'; label = 'Grammar'; }
            if (randomType === 'roleplay') { icon = '🎭'; label = 'Roleplay'; }

            gameState.tiles.push({
                type: randomType,
                label: label,
                icon: icon,
                x: coords.x,
                y: coords.y
            });
        }
    }

    // Sprinkle 1-2 Black Hole hazard planets on ordinary challenge tiles
    const eligibleIndices = gameState.tiles
        .map((t, idx) => idx)
        .filter(idx => !['start', 'finish', 'shop', 'chance'].includes(gameState.tiles[idx].type));

    let blackHoleCount = 0;
    if (eligibleIndices.length > 0 && Math.random() < 0.65) blackHoleCount = 1;
    if (eligibleIndices.length > 1 && blackHoleCount === 1 && Math.random() < 0.3) blackHoleCount = 2;

    for (let n = 0; n < blackHoleCount && eligibleIndices.length > 0; n++) {
        const pick = Math.floor(Math.random() * eligibleIndices.length);
        const tileIdx = eligibleIndices.splice(pick, 1)[0];
        const coords = gameState.tiles[tileIdx];
        gameState.tiles[tileIdx] = {
            type: 'blackhole',
            label: 'Black Hole',
            icon: '🕳️',
            x: coords.x,
            y: coords.y
        };
    }
}

function getMapCoordinates(index, totalLength) {
    // Determine how many serpentine horizontal rows to make based on board length
    const rows = totalLength <= 16 ? 3 : (totalLength <= 24 ? 4 : 5);
    const tilesPerRow = Math.ceil(totalLength / rows);
    const rowIdx = Math.floor(index / tilesPerRow);
    const colInRow = index % tilesPerRow;

    // Serpentine horizontal flow: even rows left->right, odd rows right->left
    const isEvenRow = rowIdx % 2 === 0;
    const horizontalRatio = tilesPerRow > 1 ? colInRow / (tilesPerRow - 1) : 0.5;
    const xRatio = isEvenRow ? horizontalRatio : (1 - horizontalRatio);

    // Map to generous padding boundaries for 16:9 widescreen: X from 8% to 92%, Y from 12% to 88%
    const minX = 8, maxX = 92;
    const minY = 12, maxY = 88;

    const x = minX + xRatio * (maxX - minX);
    const yRatio = rows > 1 ? rowIdx / (rows - 1) : 0.5;
    const y = minY + yRatio * (maxY - minY);

    // Add gentle organic sine wave curve offset to horizontal segments
    const curveOffset = Math.sin((colInRow / tilesPerRow) * Math.PI * 2) * 3.5;

    return {
        x: Number((x).toFixed(2)),
        y: Number((y + curveOffset).toFixed(2))
    };
}

function renderBoardTrack() {
    const mapNodesContainer = document.getElementById('board-map-nodes');
    const mapSvgEl = document.getElementById('board-map-svg');
    if (!mapNodesContainer || !mapSvgEl) return;

    mapNodesContainer.innerHTML = '';
    mapSvgEl.innerHTML = '';

    // Build smooth SVG Bezier curve connecting nodes in widescreen 16:9 (1600x900)
    if (gameState.tiles.length > 1) {
        mapSvgEl.setAttribute('viewBox', '0 0 1600 900');
        mapSvgEl.setAttribute('preserveAspectRatio', 'none');

        const points = gameState.tiles.map(t => ({
            sx: (t.x / 100) * 1600,
            sy: (t.y / 100) * 900
        }));

        let pathData = `M ${points[0].sx} ${points[0].sy}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? 0 : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

            const cp1x = p1.sx + (p2.sx - p0.sx) / 6;
            const cp1y = p1.sy + (p2.sy - p0.sy) / 6;

            const cp2x = p2.sx - (p3.sx - p1.sx) / 6;
            const cp2y = p2.sy - (p3.sy - p1.sy) / 6;

            pathData += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.sx.toFixed(2)} ${p2.sy.toFixed(2)}`;
        }

        const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glowPath.setAttribute('d', pathData);
        glowPath.setAttribute('class', 'map-path-glow');
        mapSvgEl.appendChild(glowPath);

        const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainPath.setAttribute('d', pathData);
        mainPath.setAttribute('class', 'map-path-main');
        mapSvgEl.appendChild(mainPath);
    }

    gameState.tiles.forEach((tile, index) => {
        const nodeEl = document.createElement('div');
        nodeEl.className = `map-node ${tile.type}`;
        nodeEl.dataset.index = index;
        nodeEl.style.left = `${tile.x}%`;
        nodeEl.style.top = `${tile.y}%`;

        nodeEl.innerHTML = `
            <span class="node-number">#${index}</span>
            <span class="node-icon">${tile.icon}</span>
            <span class="node-label">${tile.label}</span>
        `;

        nodeEl.addEventListener('mouseenter', () => {
            const hoverBarText = document.getElementById('planet-hover-text');
            if (hoverBarText) {
                const descriptions = {
                    start: 'Launchpad Station — Starting origin for all space exploration crews',
                    trophy: 'Victory Trophy Star — Claim a Star Trophy & +25 bonus coins!',
                    chance: 'Mystery Box of Fate — Draw a cosmic fate card for rewards or hazards',
                    shop: 'Space Station Shop — Purchase victory trophies, power-ups, and extra die rolls',
                    riddle: 'Riddle Challenge — Solve brain-teaser riddles in English',
                    scramble: 'Word Scramble — Unscramble letter tiles before time expires',
                    pronunciation: 'Pronunciation Station — Read aloud with clear English pronunciation',
                    association: 'Word Association — Connect related words & vocabulary concepts',
                    grammar: 'Grammar Trap — Correct sentence structures & grammar rules',
                    speed: 'Speed Challenge — Fast-paced rapid-reaction trivia question',
                    roleplay: 'Roleplay Scenario — Act out practical English conversation scenarios'
                };
                const desc = descriptions[tile.type] || 'Language mission challenge planet';
                hoverBarText.innerHTML = `<span style="font-size:1.2rem; margin-right:0.4rem;">${tile.icon || '🪐'}</span><strong style="color:#c4b5fd;">Planet #${index}: ${tile.label || tile.type.toUpperCase()}</strong> <span style="color:#94a3b8;">— ${desc}</span>`;
            }
        });
        nodeEl.addEventListener('mouseleave', () => {
            const hoverBarText = document.getElementById('planet-hover-text');
            if (hoverBarText) {
                hoverBarText.textContent = '🪐 Hover over any planet on the board to view its name & mission details';
            }
        });

        nodeEl.addEventListener('click', () => {
            // Teacher clicking node for inspection
        });

        mapNodesContainer.appendChild(nodeEl);
    });

    updatePawnPositions();
}

function updatePawnPositions() {
    const pawnLayerEl = document.getElementById('board-pawn-layer');
    if (!pawnLayerEl) return;
    pawnLayerEl.innerHTML = '';

    // Group pawns by their current tile position
    const positionsMap = {};
    gameState.teams.forEach(team => {
        if (!positionsMap[team.position]) positionsMap[team.position] = [];
        positionsMap[team.position].push(team);
    });

    Object.keys(positionsMap).forEach(posIndex => {
        const idx = Number(posIndex);
        const tile = gameState.tiles[idx];
        if (!tile) return;

        const clusterEl = document.createElement('div');
        clusterEl.className = 'pawn-cluster';
        clusterEl.style.left = `${tile.x}%`;
        clusterEl.style.top = `${tile.y}%`;

        positionsMap[posIndex].forEach(team => {
            const unitEl = document.createElement('div');
            unitEl.className = 'pawn-unit';
            unitEl.title = `${team.name} (Coins: ${team.coins}, Trophies: ${team.trophies})`;

            const titlePill = document.createElement('div');
            titlePill.className = 'pawn-title-pill';
            titlePill.textContent = team.name;

            const standeeEl = document.createElement('div');
            standeeEl.className = 'pawn-emoji-standee';
            standeeEl.textContent = team.pawn;

            unitEl.appendChild(titlePill);
            unitEl.appendChild(standeeEl);
            clusterEl.appendChild(unitEl);
        });

        pawnLayerEl.appendChild(clusterEl);
    });
}

function renderLeaderboard() {
    leaderboardListEl.innerHTML = '';

    // Sort by Trophies high->low, then Coins high->low
    const sorted = [...gameState.teams].sort((a, b) => {
        if (b.trophies !== a.trophies) return b.trophies - a.trophies;
        return b.coins - a.coins;
    });

    sorted.forEach(team => {
        const card = document.createElement('div');
        const isCurrent = gameState.teams[gameState.currentTeamIndex]?.id === team.id;
        card.className = `leaderboard-card ${isCurrent ? 'active-turn' : ''}`;

        card.innerHTML = `
            <div class="team-info-left">
                <span class="turn-team-pawn">${team.pawn}</span>
                <strong>${team.name}</strong>
            </div>
            <div class="team-score-right">
                <span class="score-badge trophies-badge">🏆 ${team.trophies}</span>
                <span class="score-badge coins-badge">💰 ${team.coins}</span>
            </div>
        `;
        leaderboardListEl.appendChild(card);
    });
}

function updateTurnHeader() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    if (!currentTeam) return;

    turnPawnEl.textContent = currentTeam.pawn;
    turnTeamNameEl.textContent = `${currentTeam.name}'s Turn`;
    roundCounterEl.textContent = `Round ${gameState.round}`;
    renderLeaderboard();
    renderInventory();
    broadcastState();
}

function renderInventory() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    if (!currentTeam || !currentTeam.items || currentTeam.items.length === 0) {
        inventoryListEl.innerHTML = `<span class="no-items">No power-ups in bag</span>`;
        return;
    }

    inventoryListEl.innerHTML = '';
    currentTeam.items.forEach((item, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary shop-item-btn';
        btn.style.margin = '0';
        btn.textContent = `${item.icon} ${item.name} (${item.effect})`;
        btn.addEventListener('click', () => usePowerUpItem(idx));
        inventoryListEl.appendChild(btn);
    });
}

/* === Section: Dice Rolling & Step Movement === */
btnRollDice.addEventListener('click', () => {
    if (!gameState.isRolling && gameState.activeScreen === 'game') {
        rollDice();
    }
});

async function rollDice() {
    gameState.isRolling = true;
    btnRollDice.disabled = true;
    diceDisplayEl.classList.add('rolling');
    playSound('roll');

    // Simulate rolling animation for 700ms
    await new Promise(resolve => setTimeout(resolve, 700));

    const rollResult = Math.floor(Math.random() * 6) + 1;
    diceDisplayEl.classList.remove('rolling');
    diceDisplayEl.textContent = rollResult;

    // Move pawn step by step (slower game-like steps with sound effect)
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    let stepsRemaining = rollResult;

    while (stepsRemaining > 0) {
        await new Promise(resolve => setTimeout(resolve, 440));
        currentTeam.position++;
        if (currentTeam.position >= gameState.boardLength - 1) {
            currentTeam.position = gameState.boardLength - 1; // Cap at finish
            updatePawnPositions();
            playSound('step');
            break;
        }
        updatePawnPositions();
        playSound('step');
        stepsRemaining--;
    }

    gameState.isRolling = false;
    broadcastState();

    // Trigger Top Flashing Category Banner & Show Question button
    const destinationTile = gameState.tiles[currentTeam.position];
    if (destinationTile) {
        const flashBanner = document.getElementById('category-flash-banner');
        const bannerText = document.getElementById('category-banner-text');
        const btnShowQuestion = document.getElementById('btn-show-question');

        if (flashBanner && bannerText) {
            const tileLabels = {
                riddle: '🧩 RIDDLE CHALLENGE LANDED!',
                scramble: '🔤 WORD SCRAMBLE LANDED!',
                pronunciation: '🗣️ PRONUNCIATION TRIAL LANDED!',
                association: '🔗 WORD ASSOCIATION LANDED!',
                grammar: '🔍 GRAMMAR TRAP LANDED!',
                speed: '⚡ SPEED ROUND LANDED!',
                roleplay: '🎭 ROLEPLAY ARENA LANDED!',
                shop: '🛒 TROPHY STATION LANDED!',
                chance: '🎁 MYSTERY BOX LANDED!',
                start: '🌍 LAUNCHPAD STATION LANDED!',
                finish: '⭐ GOAL SANCTUARY REACHED!'
            };
            bannerText.textContent = tileLabels[destinationTile.type] || `🎯 ${(destinationTile.type || 'CHALLENGE').toUpperCase()} TILE LANDED!`;
            flashBanner.classList.remove('hidden');
            playSound('correct');
        }

        if (btnShowQuestion) {
            btnRollDice.classList.add('hidden');
            btnShowQuestion.classList.remove('hidden');

            const handleShowQuestion = () => {
                btnShowQuestion.removeEventListener('click', handleShowQuestion);
                btnShowQuestion.classList.add('hidden');
                btnRollDice.classList.remove('hidden');
                btnRollDice.disabled = false;
                if (flashBanner) flashBanner.classList.add('hidden');
                handleTileAction(currentTeam.position, currentTeam);
            };

            btnShowQuestion.addEventListener('click', handleShowQuestion);
        } else {
            btnRollDice.disabled = false;
            handleTileAction(currentTeam.position, currentTeam);
        }
    } else {
        btnRollDice.disabled = false;
        handleTileAction(currentTeam.position, currentTeam);
    }
}

/* === Section: Tile Actions & Challenge Handlers === */
function handleTileAction(tileIndex, team) {
    const tile = gameState.tiles[tileIndex];
    if (!tile) return;

    if (tile.type === 'shop') {
        openShopModal(team);
    } else if (tile.type === 'chance') {
        triggerMysteryBoxEvent(team);
    } else if (tile.type === 'blackhole') {
        playSound('damage');
        team.position = Math.max(0, team.position - 4);
        renderPawns();
        setStatusMessage(`🕳️ BLACK HOLE HAZARD! ${team.name} got pulled back 4 spaces on the flight path!`, '#a78bfa');
        advanceTurn();
    } else if (tile.type === 'finish') {
        playSound('trophy');
        team.trophies += 1;
        team.coins += 50;
        alert(`🎉 CONGRATULATIONS! ${team.name} reached the Goal Sanctuary! They receive +1 Trophy 🏆 and +50 Coins!`);
        advanceTurn();
    } else if (['riddle', 'scramble', 'pronunciation', 'association', 'grammar', 'speed', 'roleplay'].includes(tile.type)) {
        // Find a matching challenge card from deck
        let matchingCardIndex = gameState.deck.findIndex(c => c.type === tile.type);
        let card = matchingCardIndex !== -1 ? gameState.deck.splice(matchingCardIndex, 1)[0] : null;

        if (!card) {
            // Fallback if deck ran out of that exact type
            card = DEFAULT_DECK.find(c => c.type === tile.type) || {
                type: tile.type,
                word: 'Surprise Challenge',
                prompt: `Explain or complete any classroom English challenge!`,
                coins: 15
            };
        }

        openChallengeModal(card, team);
    } else {
        advanceTurn();
    }
}

/* === Section: Challenge Modal Logic === */
function openChallengeModal(card, team) {
    gameState.activeChallenge = card;
    challengeModalEl.classList.remove('hidden');

    challengeTypeBadgeEl.textContent = `${card.type.toUpperCase()} TILE`;
    const coinsReward = card.coins || 15;
    challengeCoinsBadgeEl.textContent = `💰 +${coinsReward} Coins`;

    // Populate challenge text dynamically across our 7 categories
    if (card.type === 'riddle') {
        challengeWordEl.textContent = '🧩 Linguistic Riddle';
        challengeSubcontentEl.innerHTML = `
            <div class="clue-box">${card.prompt || 'Clue mystery puzzle to solve!'}</div>
            <div id="challenge-secret-answer" class="grammar-answer-box hidden">✅ Target Answer: ${card.answer || 'Mystery word'}</div>
            <button id="btn-reveal-answer" class="btn-secondary" style="margin-top:0.6rem;">👁️ Reveal Mystery Answer to Teacher</button>
        `;
        const revealBtn = document.getElementById('btn-reveal-answer');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                document.getElementById('challenge-secret-answer')?.classList.remove('hidden');
                revealBtn.style.display = 'none';
            });
        }
        startTimer(45);
    } else if (card.type === 'scramble') {
        challengeWordEl.textContent = '🔡 Word Scramble';
        challengeSubcontentEl.innerHTML = `
            <div class="scramble-box">${card.scrambledWord || card.word || 'A-N-A-G-R-A-M'}</div>
            <p style="color: #5eead4; font-weight: 600; margin-top: 0.2rem;">💡 Hint: ${card.clue || 'Unscramble the vocabulary target!'}</p>
            <div id="challenge-secret-answer" class="grammar-answer-box hidden">✅ Target Word: ${card.targetWord || card.answer || 'Target Vocabulary'}</div>
            <button id="btn-reveal-answer" class="btn-secondary" style="margin-top:0.6rem;">👁️ Reveal Word to Teacher</button>
        `;
        const revealBtn = document.getElementById('btn-reveal-answer');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                document.getElementById('challenge-secret-answer')?.classList.remove('hidden');
                revealBtn.style.display = 'none';
            });
        }
        startTimer(45);
    } else if (card.type === 'pronunciation') {
        challengeWordEl.textContent = '🗣️ Pronunciation Challenge';
        challengeSubcontentEl.innerHTML = `
            <div class="clue-box" style="border-color: #3b82f6; font-size: 1.35rem; font-style: italic;">"${card.prompt || 'Read this sentence out loud clearly without stumbling!'}"</div>
            <p style="margin-top:0.6rem; color: #60a5fa;">Read clearly with accurate stress and intonation to earn points!</p>
        `;
        startTimer(30);
    } else if (card.type === 'association') {
        challengeWordEl.textContent = '🔗 Collocation & Association';
        challengeSubcontentEl.innerHTML = `
            <div class="clue-box" style="border-color: #8b5cf6;">${card.prompt || 'Name related words or complete the phrase!'}</div>
            <div id="challenge-secret-answer" class="grammar-answer-box hidden">✅ Expected / Examples: ${card.answer || 'Accept valid collocations'}</div>
            <button id="btn-reveal-answer" class="btn-secondary" style="margin-top:0.6rem;">👁️ Reveal Examples to Teacher</button>
        `;
        const revealBtn = document.getElementById('btn-reveal-answer');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                document.getElementById('challenge-secret-answer')?.classList.remove('hidden');
                revealBtn.style.display = 'none';
            });
        }
        startTimer(30);
    } else if (card.type === 'grammar') {
        challengeWordEl.textContent = '🔍 Grammar & Syntax Trap';
        challengeSubcontentEl.innerHTML = `
            <div class="grammar-prompt-text">${card.prompt || 'Correct the error in the sentence.'}</div>
            <div id="grammar-secret-answer" class="grammar-answer-box hidden">✅ Target Answer: ${card.answer || 'Correct syntax'}</div>
            <button id="btn-reveal-grammar" class="btn-secondary" style="margin-top:0.6rem;">👁️ Reveal Target Answer to Teacher</button>
        `;
        const revealBtn = document.getElementById('btn-reveal-grammar');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                document.getElementById('grammar-secret-answer')?.classList.remove('hidden');
                revealBtn.style.display = 'none';
            });
        }
        startTimer(45);
    } else if (card.type === 'speed') {
        challengeWordEl.textContent = '⚡ Rapid Speed Relay';
        challengeSubcontentEl.innerHTML = `
            <div class="grammar-prompt-text" style="border-color: #06b6d4;">${card.prompt || 'Answer in 15 seconds!'}</div>
            <div id="challenge-secret-answer" class="grammar-answer-box hidden">✅ Expected / Examples: ${card.answer || 'Quick verbal recall'}</div>
            <button id="btn-reveal-answer" class="btn-secondary" style="margin-top:0.6rem;">👁️ Reveal Examples to Teacher</button>
        `;
        const revealBtn = document.getElementById('btn-reveal-answer');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                document.getElementById('challenge-secret-answer')?.classList.remove('hidden');
                revealBtn.style.display = 'none';
            });
        }
        startTimer(20);
    } else {
        // roleplay
        challengeWordEl.textContent = '🎭 Speaking & Roleplay';
        challengeSubcontentEl.innerHTML = `
            <div class="grammar-prompt-text" style="border-color: #ec4899;">${card.prompt || 'Have a 30-second dialogue!'}</div>
        `;
        startTimer(45);
    }

    broadcastState();
}

function startTimer(seconds) {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timeLeft = seconds;
    const totalTime = seconds;
    challengeTimeTextEl.textContent = `${seconds}s`;
    challengeTimerFillEl.style.width = '100%';

    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        if (gameState.timeLeft < 0) {
            clearInterval(gameState.timerInterval);
            challengeTimeTextEl.textContent = '0s';
            challengeTimerFillEl.style.width = '0%';
            playSound('wrong');
        } else {
            challengeTimeTextEl.textContent = `${gameState.timeLeft}s`;
            const percent = (gameState.timeLeft / totalTime) * 100;
            challengeTimerFillEl.style.width = `${percent}%`;
        }
    }, 1000);
}

btnChallengeCorrect.addEventListener('click', () => gradeChallenge(true));
btnChallengeWrong.addEventListener('click', () => gradeChallenge(false));
btnChallengePass.addEventListener('click', () => passChallenge());

function gradeChallenge(isCorrect) {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    challengeModalEl.classList.add('hidden');

    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    const card = gameState.activeChallenge;
    const reward = card && card.coins ? card.coins : 15;

    if (isCorrect) {
        playSound('correct');
        currentTeam.coins += reward;
    } else {
        playSound('wrong');
        // If grammar trap, losing penalty of 5 coins
        if (card && card.type === 'grammar') {
            currentTeam.coins = Math.max(0, currentTeam.coins - 5);
        }
    }

    gameState.activeChallenge = null;
    advanceTurn();
}

function passChallenge() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    challengeModalEl.classList.add('hidden');
    gameState.activeChallenge = null;
    advanceTurn();
}

/* === Section: Shop & Power-Ups === */
function openShopModal(team) {
    shopModalEl.classList.remove('hidden');
    shopItemsGridEl.innerHTML = '';

    const items = [
        { name: '🏆 Star Trophy', desc: 'The ultimate victory goal! +1 Trophy towards winning the game.', cost: 30, icon: '🏆', type: 'trophy' },
        { name: '🎲 Extra Die Roll', desc: 'Grants an extra turn! Throw the Die again immediately.', cost: 10, icon: '🎲', type: 'roll_again' },
        { name: '🚀 +2 Movement Boost', desc: 'Add +2 extra tile steps on your very next dice roll.', cost: 10, icon: '🚀', type: 'boost' },
        { name: '🛡️ Grammar Shield', desc: 'Protect your team against penalties on Grammar Traps.', cost: 12, icon: '🛡️', type: 'shield' },
        { name: '💰 Coin Magnet', desc: 'Steal 8 coins from the team currently in the lead.', cost: 15, icon: '💰', type: 'steal' }
    ];

    items.forEach((item, idx) => {
        const card = document.createElement('div');
        const canAfford = team.coins >= item.cost;
        card.className = `shop-item-card ${canAfford ? '' : 'disabled'}`;

        card.innerHTML = `
            <span class="shop-item-icon">${item.icon}</span>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.desc}</div>
            <button class="btn-primary shop-item-btn" ${canAfford ? '' : 'disabled'}>Buy (${item.cost} Coins)</button>
        `;

        if (canAfford) {
            card.addEventListener('click', () => buyShopItem(idx, item));
        }
        shopItemsGridEl.appendChild(card);
    });
}

function buyShopItem(idx, itemObj) {
    const team = gameState.teams[gameState.currentTeamIndex];
    if (!team) return;

    const items = [
        { name: 'Star Trophy', cost: 30, icon: '🏆', effect: '+1 Trophy' },
        { name: 'Extra Die Roll', cost: 10, icon: '🎲', effect: 'Throw the Die again' },
        { name: 'Movement Boost', cost: 10, icon: '🚀', effect: '+2 Steps next roll' },
        { name: 'Grammar Shield', cost: 12, icon: '🛡️', effect: 'Trap protection' },
        { name: 'Coin Magnet', cost: 15, icon: '💰', effect: 'Steal 8 coins' }
    ];
    const item = itemObj || items[idx];
    if (!item || team.coins < item.cost) return;

    if (item.type === 'roll_again' || item.name.includes('Extra Die Roll')) {
        team.coins -= item.cost;
        playSound('roll');
        shopModalEl.classList.add('hidden');
        btnRollDice.disabled = false;
        btnRollDice.classList.remove('hidden');
        alert(`🎲 ${team.name} purchased an Extra Die Roll! Throw the Die again!`);
        return;
    }

    team.coins -= item.cost;

    if (item.name === 'Star Trophy') {
        playSound('trophy');
        team.trophies += 1;
        alert(`🏆 ${team.name} purchased a Star Trophy for 30 Coins! Total Trophies: ${team.trophies}`);
    } else if (item.name === 'Coin Magnet') {
        playSound('correct');
        // Find leader
        let leader = null;
        let maxCoins = -1;
        gameState.teams.forEach(t => {
            if (t.id !== team.id && t.coins > maxCoins) {
                maxCoins = t.coins;
                leader = t;
            }
        });
        if (leader && leader.coins >= 8) {
            leader.coins -= 8;
            team.coins += 8;
            alert(`💰 ${team.name} used Coin Magnet to steal 8 Coins from ${leader.name}!`);
        } else if (leader) {
            team.coins += leader.coins;
            leader.coins = 0;
            alert(`💰 ${team.name} stole remaining coins from ${leader.name}!`);
        }
    } else {
        playSound('correct');
        team.items.push(item);
        alert(`🎒 ${team.name} added ${item.name} to their inventory bag!`);
    }

    shopModalEl.classList.add('hidden');
    advanceTurn();
}

btnShopClose.addEventListener('click', () => {
    shopModalEl.classList.add('hidden');
    advanceTurn();
});

function usePowerUpItem(itemIdx) {
    const team = gameState.teams[gameState.currentTeamIndex];
    if (!team || !team.items[itemIdx]) return;

    const item = team.items.splice(itemIdx, 1)[0];
    playSound('correct');
    alert(`⚡ ${team.name} activated ${item.name} (${item.effect})!`);

    if (item.name === 'Movement Boost') {
        team.position = Math.min(gameState.boardLength - 1, team.position + 2);
        updatePawnPositions();
    }
    renderInventory();
    broadcastState();
}

/* === Section: Mystery Box / Chance Events === */
let activeMysteryEvent = null;

function triggerMysteryBoxEvent(team) {
    playSound('correct');
    mysteryModalEl.classList.remove('hidden');
    mysteryRevealAreaEl.classList.remove('revealed');
    mysteryGiftIconEl.textContent = '🎁';
    mysteryEventTitleEl.textContent = 'Click to Reveal Your Fate!';
    mysteryEventDescEl.textContent = 'Are the classroom gods in your favor today? Click the button below!';
    if (mysteryTeamSubtitleEl) mysteryTeamSubtitleEl.textContent = `${team.name} stepped onto the Mystery Tile!`;

    btnMysteryAction.classList.remove('hidden');
    btnMysteryAction.disabled = false;
    btnMysteryClose.classList.add('hidden');

    const events = [
        { icon: '🎲', title: 'Lucky Die Roll!', desc: 'The dice gods favor you! Throw the Die again immediately!', doubleRoll: true },
        { icon: '⚡', title: 'Double Roll Energy!', desc: 'You drink a magic potion! You get +20 Coins and Throw the Die again immediately!', coins: 20, doubleRoll: true },
        { icon: '💫', title: 'Time Warp Extra Roll!', desc: 'A temporal anomaly occurs! Throw the Die again immediately!', doubleRoll: true },
        { icon: '🌟', title: 'AI Scholarship!', desc: 'The AI rewards your team for outstanding classroom participation! +25 Coins!', coins: 25 },
        { icon: '🚀', title: 'Warp Speed Tailwind!', desc: 'You catch a favorable wind across the island track. Advance +3 Tiles immediately!', steps: 3 },
        { icon: '🎉', title: 'Classroom Celebration!', desc: 'Every active team receives a celebratory +15 Coins from the bank!', globalCoins: 15 },
        { icon: '🎒', title: 'Mystery Power-Up Gift!', desc: 'You found a secret item box! A Star Trophy or Power-Up has been added to your bag!', item: { name: 'Star Trophy', cost: 0, icon: '🏆', effect: '+1 Trophy' } },
        { icon: '💎', title: 'Treasure Discovery!', desc: 'You uncovered a hidden chest buried right under this tile! +30 Coins!', coins: 30 }
    ];

    activeMysteryEvent = {
        team,
        event: events[Math.floor(Math.random() * events.length)]
    };
}

if (btnMysteryAction) {
    btnMysteryAction.addEventListener('click', async () => {
        if (!activeMysteryEvent) return;
        btnMysteryAction.disabled = true;
        playSound('roll');

        // Suspense shuffle animation
        const icons = ['🌟', '🚀', '🎉', '🎒', '⚡', '💎', '🎁'];
        for (let i = 0; i < 6; i++) {
            mysteryGiftIconEl.textContent = icons[i % icons.length];
            mysteryEventTitleEl.textContent = 'Shuffling Fate...';
            await new Promise(resolve => setTimeout(resolve, 120));
        }

        const { event } = activeMysteryEvent;
        mysteryRevealAreaEl.classList.add('revealed');
        mysteryGiftIconEl.textContent = event.icon;
        mysteryEventTitleEl.textContent = event.title;
        mysteryEventDescEl.textContent = event.desc;
        playSound('trophy');

        btnMysteryAction.classList.add('hidden');
        btnMysteryClose.classList.remove('hidden');
    });
}

if (btnMysteryClose) {
    btnMysteryClose.addEventListener('click', () => {
        if (!activeMysteryEvent) {
            mysteryModalEl.classList.add('hidden');
            advanceTurn();
            return;
        }

        const { team, event } = activeMysteryEvent;
        if (event.coins) team.coins = Math.max(0, team.coins + event.coins);
        if (event.steps) {
            team.position = Math.min(gameState.boardLength - 1, team.position + event.steps);
            updatePawnPositions();
        }
        if (event.globalCoins) {
            gameState.teams.forEach(t => t.coins += event.globalCoins);
        }
        if (event.item) {
            if (event.item.name === 'Star Trophy') {
                team.trophies += 1;
            } else {
                team.items.push(event.item);
            }
        }

        mysteryModalEl.classList.add('hidden');
        if (event.doubleRoll) {
            updateTurnHeader(); // Take turn again
        } else {
            advanceTurn();
        }
        activeMysteryEvent = null;
    });
}

/* === Section: Turn Management === */
function advanceTurn() {
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    if (gameState.currentTeamIndex === 0) {
        gameState.round += 1;
    }
    updateTurnHeader();
}

/* === Section: Particle Background Initialization === */
if (typeof initParticles === 'function') {
    initParticles('canvas', { count: 12 });
}
