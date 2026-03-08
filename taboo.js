/* ============================================
   TABOO – Game Logic
   ============================================ */

// ---- Book Upload Component ----
let bookUploadComponent = null;

function initBookUpload() {
    const container = document.getElementById('book-upload-container');
    if (!container) return;
    
    bookUploadComponent = new BookUploadComponent('book-upload-container', {
        gameType: 'taboo',
        onExtract: (data) => {
            generateFromBook(data);
        },
        onError: (error) => {
            const statusEl = document.getElementById('generate-status');
            statusEl.textContent = error;
            statusEl.style.color = '#ef4444';
        },
        onLoading: (isLoading) => {
            // Handle loading state
        }
    });
}

async function generateFromBook(data) {
    const statusEl = document.getElementById('generate-status');
    const countInput = document.getElementById('card-count');
    const count = parseInt(countInput.value) || 30;
    
    statusEl.textContent = `Generating Taboo cards about "${data.topicData.title}"...`;
    statusEl.style.color = 'var(--accent-1)';

    try {
        const response = await fetch('/api/generate-from-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: data.content,
                gameType: 'taboo',
                count: count
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate from book');
        }

        const result = await response.json();
        
        if (result.success && result.cards && result.cards.length > 0) {
            cards = result.cards;
            shuffleDeck();
            statusEl.textContent = `✅ Generated ${result.cards.length} cards! Ready to play.`;
            statusEl.style.color = '#22c55e';
            
            if (socket) {
                socket.emit('syncWordList', { gameId, type: 'taboo', cards: cards });
            }
        } else {
            throw new Error('Invalid card data');
        }
    } catch (err) {
        console.error('Book generation error:', err);
        statusEl.textContent = '❌ Failed. Try text-based generation instead.';
        statusEl.style.color = '#ef4444';
    }
}

const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
const socket = typeof io !== 'undefined' ? io() : null;

if (socket) {
    socket.emit('hostJoin', gameId, (response) => {
        if (response && response.success) {
            console.log('✅ Connected to game:', response.gameId);
        } else {
            console.error('❌ Failed to join game:', response?.error || 'Unknown error');
        }
    });

    socket.on('hostSendState', () => {
        emitGameState();
        socket.emit('syncWordList', { gameId, type: 'taboo', cards: cards });
    });

    socket.on('hostWordListUpdate', (data) => {
        if (data.cards) {
            cards = data.cards;
            shuffleDeck();
        }
    });
}

function emitGameState() {
    if (!socket || !state.currentCard) return;
    socket.emit('hostUpdate', {
        gameId: gameId,
        game: 'Taboo',
        word: state.currentCard.word,
        forbidden: state.currentCard.forbidden,
        team: state.teams[state.currentTeam],
        timeLeft: state.timeLeft,
        active: state.timerInterval !== null
    });
}

// ---- Default cards (~100 Taboo cards) ----
const DEFAULT_CARDS = [
    { word: "Pizza", forbidden: ["Cheese", "Italian", "Slice", "Dough", "Oven"] },
    { word: "Football", forbidden: ["Ball", "Goal", "Kick", "Soccer", "Team"] },
    { word: "Smartphone", forbidden: ["Phone", "Call", "Screen", "Apple", "Android"] },
    { word: "Chocolate", forbidden: ["Sweet", "Cocoa", "Candy", "Brown", "Milk"] },
    { word: "Beach", forbidden: ["Sand", "Ocean", "Sun", "Wave", "Swim"] },
    { word: "Airplane", forbidden: ["Fly", "Pilot", "Wing", "Airport", "Sky"] },
    { word: "Guitar", forbidden: ["String", "Music", "Play", "Rock", "Acoustic"] },
    { word: "Library", forbidden: ["Book", "Read", "Quiet", "Shelf", "Borrow"] },
    { word: "Volcano", forbidden: ["Lava", "Eruption", "Mountain", "Hot", "Ash"] },
    { word: "Robot", forbidden: ["Machine", "Metal", "AI", "Human", "Program"] },
    { word: "Dinosaur", forbidden: ["Extinct", "Fossil", "Jurassic", "Reptile", "T-Rex"] },
    { word: "Wedding", forbidden: ["Marry", "Bride", "Ring", "Ceremony", "Dress"] },
    { word: "Astronaut", forbidden: ["Space", "NASA", "Moon", "Rocket", "Suit"] },
    { word: "Sushi", forbidden: ["Japanese", "Rice", "Fish", "Raw", "Roll"] },
    { word: "Olympics", forbidden: ["Gold", "Medal", "Sport", "Games", "Athlete"] },
    { word: "Vampire", forbidden: ["Blood", "Dracula", "Bite", "Night", "Fangs"] },
    { word: "Microphone", forbidden: ["Sing", "Voice", "Sound", "Stage", "Record"] },
    { word: "Pyramid", forbidden: ["Egypt", "Triangle", "Pharaoh", "Ancient", "Desert"] },
    { word: "Instagram", forbidden: ["Photo", "Social", "Filter", "Story", "Follow"] },
    { word: "Penguin", forbidden: ["Bird", "Ice", "Antarctic", "Black", "White"] },
    { word: "Tattoo", forbidden: ["Ink", "Skin", "Needle", "Permanent", "Design"] },
    { word: "Rainbow", forbidden: ["Color", "Rain", "Arc", "Sky", "Seven"] },
    { word: "Camping", forbidden: ["Tent", "Fire", "Outdoor", "Nature", "Sleep"] },
    { word: "Selfie", forbidden: ["Photo", "Camera", "Phone", "Face", "Pose"] },
    { word: "Passport", forbidden: ["Travel", "Country", "ID", "Border", "Visa"] },
    { word: "Karaoke", forbidden: ["Sing", "Music", "Microphone", "Song", "Lyrics"] },
    { word: "Iceberg", forbidden: ["Ice", "Titanic", "Cold", "Ocean", "Freeze"] },
    { word: "Safari", forbidden: ["Africa", "Animal", "Wild", "Lion", "Jungle"] },
    { word: "Earthquake", forbidden: ["Shake", "Ground", "Fault", "Disaster", "Richter"] },
    { word: "Coffee", forbidden: ["Caffeine", "Drink", "Bean", "Morning", "Cup"] },
    { word: "Netflix", forbidden: ["Stream", "Watch", "Movie", "Series", "Binge"] },
    { word: "Sunflower", forbidden: ["Yellow", "Sun", "Seed", "Plant", "Petal"] },
    { word: "Marathon", forbidden: ["Run", "Race", "42", "Long", "Finish"] },
    { word: "Moustache", forbidden: ["Hair", "Lip", "Face", "Shave", "Beard"] },
    { word: "Lighthouse", forbidden: ["Light", "Sea", "Tower", "Ship", "Beacon"] },
    { word: "Helicopter", forbidden: ["Fly", "Blade", "Air", "Pilot", "Rotor"] },
    { word: "Popcorn", forbidden: ["Corn", "Movie", "Butter", "Snack", "Pop"] },
    { word: "Kangaroo", forbidden: ["Australia", "Jump", "Pouch", "Animal", "Joey"] },
    { word: "Broadway", forbidden: ["Theater", "Musical", "New York", "Show", "Stage"] },
    { word: "Dentist", forbidden: ["Teeth", "Doctor", "Drill", "Cavity", "Mouth"] },
    { word: "Hammock", forbidden: ["Hang", "Sleep", "Relax", "Tree", "Swing"] },
    { word: "Aquarium", forbidden: ["Fish", "Water", "Tank", "Sea", "Glass"] },
    { word: "Fireworks", forbidden: ["Explode", "Sky", "Color", "New Year", "Bang"] },
    { word: "Telescope", forbidden: ["Star", "See", "Lens", "Space", "Zoom"] },
    { word: "Graffiti", forbidden: ["Spray", "Wall", "Paint", "Street", "Art"] },
    { word: "Chameleon", forbidden: ["Color", "Change", "Lizard", "Blend", "Reptile"] },
    { word: "Monopoly", forbidden: ["Board", "Game", "Money", "Property", "Dice"] },
    { word: "Boomerang", forbidden: ["Throw", "Return", "Australia", "Curve", "Catch"] },
    { word: "Pancake", forbidden: ["Flat", "Breakfast", "Syrup", "Batter", "Flip"] },
    { word: "Compass", forbidden: ["Direction", "North", "Navigate", "Magnetic", "Map"] },
    { word: "Elevator", forbidden: ["Up", "Down", "Floor", "Lift", "Button"] },
    { word: "Pirate", forbidden: ["Ship", "Treasure", "Eye patch", "Sea", "Captain"] },
    { word: "Origami", forbidden: ["Paper", "Fold", "Japanese", "Crane", "Art"] },
    { word: "Treadmill", forbidden: ["Run", "Exercise", "Gym", "Walk", "Machine"] },
    { word: "Bluetooth", forbidden: ["Wireless", "Connect", "Device", "Signal", "Phone"] },
    { word: "Bonsai", forbidden: ["Tree", "Small", "Japanese", "Trim", "Plant"] },
    { word: "Hurricane", forbidden: ["Wind", "Storm", "Eye", "Tropical", "Destroy"] },
    { word: "Gondola", forbidden: ["Venice", "Boat", "Water", "Italy", "Canal"] },
    { word: "Espresso", forbidden: ["Coffee", "Italian", "Strong", "Shot", "Caffeine"] },
    { word: "Cactus", forbidden: ["Desert", "Spike", "Plant", "Dry", "Green"] },
    { word: "Mermaid", forbidden: ["Fish", "Tail", "Sea", "Disney", "Ariel"] },
    { word: "Trampoline", forbidden: ["Jump", "Bounce", "Spring", "Fun", "Net"] },
    { word: "Parachute", forbidden: ["Jump", "Fall", "Sky", "Open", "Dive"] },
    { word: "Saxophone", forbidden: ["Music", "Jazz", "Instrument", "Blow", "Brass"] },
    { word: "Avalanche", forbidden: ["Snow", "Mountain", "Slide", "Danger", "Bury"] },
    { word: "Limousine", forbidden: ["Long", "Car", "Luxury", "Driver", "Celebrity"] },
    { word: "Chopsticks", forbidden: ["Eat", "Asian", "Stick", "Two", "Food"] },
    { word: "Sphinx", forbidden: ["Egypt", "Lion", "Riddle", "Statue", "Pyramid"] },
    { word: "Bermuda", forbidden: ["Triangle", "Island", "Mystery", "Ocean", "Disappear"] },
    { word: "Tiramisu", forbidden: ["Italian", "Coffee", "Cake", "Dessert", "Cream"] },
    { word: "Igloo", forbidden: ["Ice", "Eskimo", "Cold", "Snow", "House"] },
    { word: "Zodiac", forbidden: ["Sign", "Star", "Horoscope", "Astrology", "Birth"] },
    { word: "Rickshaw", forbidden: ["Pull", "Ride", "Asia", "Taxi", "Wheel"] },
    { word: "Pretzel", forbidden: ["Twist", "Salt", "Bread", "Snack", "German"] },
    { word: "Jacuzzi", forbidden: ["Water", "Hot", "Tub", "Bubble", "Relax"] },
    { word: "Matryoshka", forbidden: ["Russian", "Doll", "Nest", "Inside", "Wood"] },
    { word: "Flamingo", forbidden: ["Pink", "Bird", "Leg", "Stand", "Tropical"] },
    { word: "Binoculars", forbidden: ["See", "Far", "Lens", "Two", "Watch"] },
    { word: "Typewriter", forbidden: ["Write", "Key", "Old", "Paper", "Machine"] },
    { word: "Mojito", forbidden: ["Cocktail", "Mint", "Lime", "Rum", "Drink"] },
    { word: "Constellation", forbidden: ["Star", "Sky", "Pattern", "Night", "Zodiac"] },
    { word: "Croissant", forbidden: ["French", "Bread", "Butter", "Crescent", "Breakfast"] },
    { word: "Kaleidoscope", forbidden: ["Color", "Pattern", "Turn", "Mirror", "Tube"] },
    { word: "Hologram", forbidden: ["3D", "Light", "Image", "Laser", "Project"] },
    { word: "Pendulum", forbidden: ["Swing", "Clock", "Back", "Forth", "Gravity"] },
    { word: "Yeti", forbidden: ["Snow", "Monster", "Mountain", "Big", "Foot"] },
    { word: "Domino", forbidden: ["Tile", "Fall", "Dot", "Game", "Chain"] },
    { word: "Platypus", forbidden: ["Australia", "Duck", "Bill", "Mammal", "Egg"] },
    { word: "Aurora", forbidden: ["Light", "North", "Sky", "Polar", "Green"] },
    { word: "Samurai", forbidden: ["Japan", "Sword", "Warrior", "Honor", "Battle"] },
    { word: "Catapult", forbidden: ["Launch", "Medieval", "Throw", "Siege", "Stone"] },
    { word: "Labyrinth", forbidden: ["Maze", "Lost", "Path", "Minotaur", "Puzzle"] },
    { word: "Sombrero", forbidden: ["Hat", "Mexican", "Wide", "Sun", "Fiesta"] },
    { word: "Accordion", forbidden: ["Music", "Squeeze", "Instrument", "Polka", "Key"] },
    { word: "Quicksand", forbidden: ["Sink", "Sand", "Stuck", "Danger", "Mud"] },
    { word: "Narwhal", forbidden: ["Whale", "Horn", "Arctic", "Sea", "Unicorn"] },
    { word: "Treehouse", forbidden: ["Tree", "House", "Kids", "Build", "Climb"] },
    { word: "Souvenir", forbidden: ["Gift", "Travel", "Memory", "Buy", "Trip"] },
    { word: "Thunderstorm", forbidden: ["Lightning", "Rain", "Cloud", "Thunder", "Loud"] },
    { word: "Gondolier", forbidden: ["Venice", "Boat", "Sing", "Pole", "Canal"] },
];

let cards = [...DEFAULT_CARDS];

// ---- DOM refs ----
const screens = {
    setup: document.getElementById('screen-setup'),
    turnIntro: document.getElementById('screen-turn-intro'),
    game: document.getElementById('screen-game'),
    turnEnd: document.getElementById('screen-turn-end'),
    scoreboard: document.getElementById('screen-scoreboard'),
};

const els = {
    team1Name: document.getElementById('team1-name'),
    team2Name: document.getElementById('team2-name'),
    maxPass: document.getElementById('max-pass'),
    turnDuration: document.getElementById('turn-duration'),
    btnStart: document.getElementById('btn-start'),
    turnTeamName: document.getElementById('turn-team-name'),
    btnGo: document.getElementById('btn-go'),
    currentBadge: document.getElementById('current-team-badge'),
    timerDisplay: document.getElementById('timer-display'),
    timerBar: document.getElementById('timer-bar'),
    score1: document.getElementById('score-1'),
    score2: document.getElementById('score-2'),
    tabooCard: document.getElementById('taboo-card'),
    tabooWord: document.getElementById('taboo-word'),
    forbiddenList: document.getElementById('forbidden-list'),
    passCounter: document.getElementById('pass-counter'),
    btnCorrect: document.getElementById('btn-correct'),
    btnPass: document.getElementById('btn-pass'),
    btnTaboo: document.getElementById('btn-taboo'),
    turnEndTeam: document.getElementById('turn-end-team'),
    turnPoints: document.getElementById('turn-points'),
    btnNextTurn: document.getElementById('btn-next-turn'),
    winnerHeading: document.getElementById('winner-heading'),
    finalT1Name: document.getElementById('final-t1-name'),
    finalT1Score: document.getElementById('final-t1-score'),
    finalT2Name: document.getElementById('final-t2-name'),
    finalT2Score: document.getElementById('final-t2-score'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnGenerate: document.getElementById('btn-generate'),
    cardTheme: document.getElementById('card-theme'),
    cardCount: document.getElementById('card-count'),
    generateStatus: document.getElementById('generate-status'),
};

// ---- Game state ----
let state = {
    teams: ['Team 🔴', 'Team 🔵'],
    scores: [0, 0],
    currentTeam: 0,   // 0 or 1
    maxPass: 3,
    duration: 60,
    turnPasses: 0,
    turnCorrect: 0,
    turnTaboo: 0,
    turnPoints: 0,
    turnsPlayed: 0,
    totalRounds: 4,    // each team plays 2 rounds = 4 total turns
    timerInterval: null,
    timeLeft: 60,
    deck: [],
    currentCard: null,
};

// ---- Helpers ----
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

function shuffleDeck() {
    state.deck = [...cards].sort(() => Math.random() - 0.5);
}

function nextCard() {
    if (state.deck.length === 0) shuffleDeck();
    state.currentCard = state.deck.pop();
    renderCard();
    emitGameState();
}

function renderCard() {
    const c = state.currentCard;
    els.tabooWord.textContent = c.word;
    els.forbiddenList.innerHTML = c.forbidden
        .map(w => `<div class="forbidden-word">${w}</div>`)
        .join('');
    // re-trigger animation
    els.tabooCard.style.animation = 'none';
    void els.tabooCard.offsetWidth;
    els.tabooCard.style.animation = '';
}

function updateScoreDisplay() {
    els.score1.textContent = state.scores[0];
    els.score2.textContent = state.scores[1];
}

function updatePassCounter() {
    const remaining = state.maxPass - state.turnPasses;
    els.passCounter.textContent = `Passes left: ${remaining}`;
    els.btnPass.disabled = remaining <= 0;
}

// ---- Start game ----
els.btnStart.addEventListener('click', () => {
    state.teams[0] = els.team1Name.value.trim() || 'Team 🔴';
    state.teams[1] = els.team2Name.value.trim() || 'Team 🔵';
    state.maxPass = parseInt(els.maxPass.value) || 3;
    state.duration = parseInt(els.turnDuration.value) || 60;
    state.scores = [0, 0];
    state.currentTeam = 0;
    state.turnsPlayed = 0;
    shuffleDeck();
    startTurnIntro();
});

// ---- Turn intro ----
function startTurnIntro() {
    els.turnTeamName.textContent = state.teams[state.currentTeam];
    showScreen('turnIntro');
}

els.btnGo.addEventListener('click', () => {
    startTurn();
});

// ---- Turn ----
function startTurn() {
    state.turnPasses = 0;
    state.turnCorrect = 0;
    state.turnTaboo = 0;
    state.turnPoints = 0;
    state.timeLeft = state.duration;

    els.currentBadge.textContent = state.teams[state.currentTeam];
    els.timerDisplay.textContent = state.timeLeft;
    els.timerBar.style.width = '100%';
    updateScoreDisplay();
    updatePassCounter();
    nextCard();
    showScreen('game');

    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        els.timerDisplay.textContent = Math.max(state.timeLeft, 0);
        els.timerBar.style.width = `${(state.timeLeft / state.duration) * 100}%`;

        if (state.timeLeft <= 0) {
            endTurn();
        } else if (state.timeLeft % 5 === 0) {
            // Periodically sync time to admin
            emitGameState();
        }
    }, 1000);
}

function endTurn() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    emitGameState(); // Sync that turn ended
    state.scores[state.currentTeam] += state.turnPoints;
    state.turnsPlayed++;

    els.turnEndTeam.textContent = state.teams[state.currentTeam];
    els.turnPoints.textContent = state.turnPoints;
    document.getElementById('stat-correct').textContent = state.turnCorrect;
    document.getElementById('stat-passed').textContent = state.turnPasses;
    document.getElementById('stat-taboo').textContent = state.turnTaboo;
    updateScoreDisplay();

    showScreen('turnEnd');
}

// ---- Actions ----
els.btnCorrect.addEventListener('click', () => {
    state.turnCorrect++;
    state.turnPoints++;
    nextCard();
});

els.btnPass.addEventListener('click', () => {
    if (state.turnPasses < state.maxPass) {
        state.turnPasses++;
        updatePassCounter();
        nextCard();
    }
});

els.btnTaboo.addEventListener('click', () => {
    state.turnTaboo++;
    state.turnPoints--;
    nextCard();
});

// ---- Next turn / Scoreboard ----
els.btnNextTurn.addEventListener('click', () => {
    if (state.turnsPlayed >= state.totalRounds) {
        showFinalScoreboard();
    } else {
        state.currentTeam = state.currentTeam === 0 ? 1 : 0;
        startTurnIntro();
    }
});

function showFinalScoreboard() {
    els.finalT1Name.textContent = state.teams[0];
    els.finalT1Score.textContent = state.scores[0];
    els.finalT2Name.textContent = state.teams[1];
    els.finalT2Score.textContent = state.scores[1];

    if (state.scores[0] > state.scores[1]) {
        els.winnerHeading.textContent = `${state.teams[0]} Wins! 🎉`;
    } else if (state.scores[1] > state.scores[0]) {
        els.winnerHeading.textContent = `${state.teams[1]} Wins! 🎉`;
    } else {
        els.winnerHeading.textContent = "It's a Tie! 🤝";
    }

    showScreen('scoreboard');
}

els.btnNewGame.addEventListener('click', () => {
    showScreen('setup');
});

// ---- AI Generation ----
els.btnGenerate.addEventListener('click', async () => {
    const theme = els.cardTheme.value.trim();
    const count = parseInt(els.cardCount.value, 10) || 30;
    if (!theme) return;

    els.btnGenerate.disabled = true;
    els.btnGenerate.classList.add('loading');
    els.generateStatus.textContent = 'Generating cards…';
    els.generateStatus.className = 'generate-status';

    try {
        const res = await fetch('/api/generate-taboo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, count })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');

        if (data.cards && data.cards.length > 0) {
            cards = data.cards;
            shuffleDeck();
            els.generateStatus.textContent = `✓ Generated ${data.cards.length} cards!`;
            els.generateStatus.className = 'generate-status success';

            // Sync new list to admin
            if (socket) {
                socket.emit('syncWordList', { gameId, type: 'taboo', cards: cards });
            }
        } else {
            throw new Error('No cards returned');
        }
    } catch (err) {
        els.generateStatus.textContent = `✗ ${err.message}`;
        els.generateStatus.className = 'generate-status error';
    } finally {
        els.btnGenerate.disabled = false;
        els.btnGenerate.classList.remove('loading');
    }
});

// ============================================
// Add Game ID UI
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const idDisplay = document.createElement('div');
    idDisplay.className = 'game-id-badge';
    idDisplay.textContent = `Game ID: ${gameId}`;
    document.body.appendChild(idDisplay);

    if (socket) socket.emit('syncWordList', { gameId, type: 'taboo', cards: cards });
    
    // Initialize book upload component
    initBookUpload();
});

// ============================================
// Particle background (same as Who Am I?)
// ============================================
(function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let w, h, particles;
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);
    resize();
    const COLORS = ['rgba(168,85,247,.35)', 'rgba(99,102,241,.3)', 'rgba(236,72,153,.25)'];
    function createParticles(n) {
        particles = [];
        for (let i = 0; i < n; i++) {
            particles.push({
                x: Math.random() * w, y: Math.random() * h,
                r: Math.random() * 2.5 + 1,
                dx: (Math.random() - .5) * .4, dy: (Math.random() - .5) * .4,
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            });
        }
    }
    createParticles(60);
    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color; ctx.fill();
        }
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(168,85,247,${.12 * (1 - dist / 120)})`;
                    ctx.lineWidth = .6; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();
