/* ============================================
   WHO AM I? – Game Logic
   ============================================ */

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
    socket.emit('syncWordList', { gameId, type: 'whoami', characters: CHARACTERS });
  });

  socket.on('hostWordListUpdate', (data) => {
    if (data.characters) {
      CHARACTERS = data.characters;
      bag = []; // Reset bag to include new characters
    }
  });
}

function emitGameState() {
  if (!socket) return;
  const isShowingChar = document.getElementById('screen-character').classList.contains('active');
  socket.emit('hostUpdate', {
    gameId: gameId,
    game: 'Who Am I',
    character: isShowingChar ? characterName.textContent : null,
    active: isShowingChar
  });
}

// ---- Characters (loaded dynamically from list.txt) ----
let CHARACTERS = [];
let deckLibrary = null;
let playSessionId = null;

async function loadCharacters() {
  const res = await fetch('list.txt');
  const text = await res.text();
  CHARACTERS = text
    .split('\n')
    .map(line => line.replace(/\r/, '').trim())
    .filter(line => line && !line.startsWith('---') && !line.startsWith('**'));
}

// Load on startup
loadCharacters().then(() => {
  if (socket) socket.emit('syncWordList', { gameId, type: 'whoami', characters: CHARACTERS });
});

// ---- DOM refs ----
const screenStart = document.getElementById('screen-start');
const screenCountdown = document.getElementById('screen-countdown');
const screenCharacter = document.getElementById('screen-character');
const btnPlay = document.getElementById('btn-play');
const btnMenu = document.getElementById('btn-menu');
const countdownNum = document.getElementById('countdown-number');
const ringProgress = document.getElementById('ring-progress');
const characterName = document.getElementById('character-name');

const RING_CIRC = 339.292; // 2πr where r = 54

// ---- Screen helper ----
function showScreen(target) {
  [screenStart, screenCountdown, screenCharacter].forEach(s => s.classList.remove('active'));
  target.classList.add('active');
  emitGameState();
}

// ---- Random character (no repeat until all used) ----
let bag = [];
function pickCharacter() {
  if (bag.length === 0) bag = [...CHARACTERS].sort(() => Math.random() - 0.5);
  return bag.pop();
}

// ---- Countdown ----
function startCountdown() {
  showScreen(screenCountdown);
  let remaining = 5;
  countdownNum.textContent = remaining;
  ringProgress.style.transition = 'none';
  ringProgress.style.strokeDashoffset = '0';

  // Force reflow so transition resets
  void ringProgress.offsetWidth;
  ringProgress.style.transition = 'stroke-dashoffset 1s linear';

  const tick = () => {
    remaining--;
    const progress = ((5 - remaining) / 5) * RING_CIRC;
    ringProgress.style.strokeDashoffset = progress;

    if (remaining > 0) {
      countdownNum.textContent = remaining;
      setTimeout(tick, 1000);
    } else {
      countdownNum.textContent = '0';
      setTimeout(revealCharacter, 400);
    }
  };
  setTimeout(tick, 1000);
}

// ---- Reveal ----
function revealCharacter() {
  characterName.textContent = pickCharacter();
  showScreen(screenCharacter);
  emitGameState();
}

const btnReplay = document.getElementById('btn-replay');

// ---- AI Generation ----
const btnGenerate = document.getElementById('btn-generate');
const themeInput = document.getElementById('theme-input');
const countInput = document.getElementById('count-input');
const generateStatus = document.getElementById('generate-status');
const btnReuseGenerated = document.getElementById('btn-reuse-generated');
const WHOAMI_STORAGE_KEY = 'whoami';

async function startTrackedRound() {
  const selectedDeckRef = deckLibrary?.getSelectedDeckRef();
  if (!selectedDeckRef?.deckId || !selectedDeckRef?.deckVersionId) {
    generateStatus.textContent = 'Choose or generate a registered deck first.';
    generateStatus.className = 'generate-status error';
    return;
  }
  if (playSessionId) {
    await window.OpenClassPlatform.completeSession(playSessionId, {
      lastCharacter: characterName.textContent || null,
      reason: 'new_round'
    }).catch(() => null);
  }
  const session = await window.OpenClassPlatform.startSessionSafely({
    gameType: 'who',
    roomCode: gameId,
    participantNames: [],
    ...selectedDeckRef
  }, error => {
    generateStatus.textContent = error.message;
    generateStatus.className = 'generate-status error';
    alert(`The round will still start, but it could not be recorded: ${error.message}`);
  });
  playSessionId = session?.id || null;
  startCountdown();
}

btnPlay.addEventListener('click', startTrackedRound);
btnMenu.addEventListener('click', () => {
  if (playSessionId) {
    window.OpenClassPlatform.completeSession(playSessionId, {
      lastCharacter: characterName.textContent || null,
      reason: 'returned_to_menu'
    }).catch(() => null);
    playSessionId = null;
  }
  showScreen(screenStart);
});
if (btnReplay) btnReplay.addEventListener('click', startTrackedRound);

function saveGeneratedCharacters(characters, meta = {}) {
  window.generatedContentStore?.save(WHOAMI_STORAGE_KEY, { characters, meta });
  updateReuseButton();
}

function updateReuseButton() {
  if (!btnReuseGenerated) return;

  const stored = window.generatedContentStore?.load(WHOAMI_STORAGE_KEY);
  btnReuseGenerated.hidden = !stored?.characters?.length;

  if (stored?.characters?.length) {
    const savedAt = window.generatedContentStore?.formatTimestamp(stored.savedAt);
    btnReuseGenerated.textContent = savedAt
      ? `Reuse Saved Pack (${savedAt})`
      : 'Reuse Saved Pack';
  }
}

function restoreGeneratedCharacters() {
  const stored = window.generatedContentStore?.load(WHOAMI_STORAGE_KEY);
  if (!stored?.characters?.length) return;

  CHARACTERS = stored.characters;
  bag = [];
  if (stored.meta?.theme) themeInput.value = stored.meta.theme;
  if (stored.meta?.count) countInput.value = stored.meta.count;
  generateStatus.textContent = `Restored ${CHARACTERS.length} characters from saved content.`;
  generateStatus.className = 'generate-status success';

  if (socket) socket.emit('syncWordList', { gameId, type: 'whoami', characters: CHARACTERS });
}

btnGenerate.addEventListener('click', async () => {
  const theme = themeInput.value.trim();
  const count = parseInt(countInput.value, 10) || 50;
  if (!theme) return;

  btnGenerate.disabled = true;
  btnGenerate.classList.add('loading');
  generateStatus.textContent = 'Generating characters…';
  generateStatus.className = 'generate-status';

  if (window.GenerationConsole) {
    window.GenerationConsole.clear();
    window.GenerationConsole.show();
  }

  try {
    window.GenerationConsole?.log('Sending request...');
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: window.AiKeyPrompt?.getGenerationHeaders
        ? window.AiKeyPrompt.getGenerationHeaders()
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, count })
    });
    window.GenerationConsole?.log('Parsing response...');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Request failed');

    window.GenerationConsole?.log(`Generated ${data.count} characters`);
    window.GenerationConsole?.log('Done');
    generateStatus.textContent = `✓ Generated ${data.count} characters!`;
    generateStatus.className = 'generate-status success';

    // Reload the character list from new list.txt
    await loadCharacters();
    saveGeneratedCharacters(CHARACTERS, { source: 'ai', theme, count: CHARACTERS.length });
    bag = []; // reset shuffle bag
    if (socket) socket.emit('syncWordList', { gameId, type: 'whoami', characters: CHARACTERS });
  } catch (err) {
    window.GenerationConsole?.log(`Error: ${err.message}`, 'error');
    generateStatus.textContent = `✗ ${err.message}`;
    generateStatus.className = 'generate-status error';
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.classList.remove('loading');
    setTimeout(() => window.GenerationConsole?.hide(), 2500);
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

  btnReuseGenerated?.addEventListener('click', restoreGeneratedCharacters);
  updateReuseButton();

  btnGenerate.hidden = true;
  if (btnReuseGenerated) btnReuseGenerated.hidden = true;
  deckLibrary = window.OpenClassPlatform.mountDeckLibrary({
    container: '#deck-library-mount',
    gameType: 'who',
    endpoint: '/api/generate',
    collectGenerationInput: () => ({
      theme: themeInput.value.trim(),
      count: parseInt(countInput.value, 10) || 50
    }),
    onDeckSelected: (deck) => {
      if (!deck?.currentVersion?.content) return;
      CHARACTERS = deck.currentVersion.content
        .map(character => String(character).trim())
        .filter(Boolean);
      bag = [];
      generateStatus.textContent = `Using registered deck “${deck.name}” (v${deck.currentVersion.versionNumber}).`;
      generateStatus.className = 'generate-status success';
      if (socket) socket.emit('syncWordList', {
        gameId,
        type: 'whoami',
        characters: CHARACTERS
      });
    }
  });
});

// ============================================
// Floating particle background
// ============================================
(function initParticles() {
  if (window.OptimizedParticles) { window.OptimizedParticles.init('particles'); return; }
})();
