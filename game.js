/* ============================================
   WHO AM I? – Game Logic
   ============================================ */

// ---- Book Upload Component ----
let bookUploadComponent = null;

function initBookUpload() {
  const container = document.getElementById('book-upload-container');
  if (!container) return;
  
  bookUploadComponent = new BookUploadComponent('book-upload-container', {
    gameType: 'whoami',
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
  const countInput = document.getElementById('count-input');
  const count = parseInt(countInput.value) || 30;
  
  statusEl.textContent = `Generating characters about "${data.topicData.title}"...`;
  statusEl.style.color = 'var(--accent-1)';

  try {
    const response = await fetch('/api/generate-from-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: data.content,
        gameType: 'whoami',
        count: count
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate from book');
    }

    const result = await response.json();
    
    if (result.success && result.characters && result.characters.length > 0) {
      CHARACTERS = result.characters;
      bag = [];
      statusEl.textContent = `✅ Generated ${result.characters.length} characters! Ready to play.`;
      statusEl.style.color = '#22c55e';
      
      if (socket) {
        socket.emit('syncWordList', { gameId, type: 'whoami', characters: CHARACTERS });
      }
    } else {
      throw new Error('Invalid character data');
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

// ---- Events ----
btnPlay.addEventListener('click', startCountdown);
btnMenu.addEventListener('click', () => showScreen(screenStart));

const btnReplay = document.getElementById('btn-replay');
if (btnReplay) btnReplay.addEventListener('click', startCountdown);

// ---- AI Generation ----
const btnGenerate = document.getElementById('btn-generate');
const themeInput = document.getElementById('theme-input');
const countInput = document.getElementById('count-input');
const generateStatus = document.getElementById('generate-status');

btnGenerate.addEventListener('click', async () => {
  const theme = themeInput.value.trim();
  const count = parseInt(countInput.value, 10) || 50;
  if (!theme) return;

  btnGenerate.disabled = true;
  btnGenerate.classList.add('loading');
  generateStatus.textContent = 'Generating characters…';
  generateStatus.className = 'generate-status';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, count })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Request failed');

    generateStatus.textContent = `✓ Generated ${data.count} characters!`;
    generateStatus.className = 'generate-status success';

    // Reload the character list from new list.txt
    await loadCharacters();
    bag = []; // reset shuffle bag
    if (socket) socket.emit('syncWordList', { gameId, type: 'whoami', characters: CHARACTERS });
  } catch (err) {
    generateStatus.textContent = `✗ ${err.message}`;
    generateStatus.className = 'generate-status error';
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.classList.remove('loading');
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
  
  // Initialize book upload component
  initBookUpload();
});

// ============================================
// Floating particle background
// ============================================
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, particles;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = ['rgba(168,85,247,.35)', 'rgba(99,102,241,.3)', 'rgba(236,72,153,.25)'];

  function createParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.5 + 1,
        dx: (Math.random() - .5) * .4,
        dy: (Math.random() - .5) * .4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }
  createParticles(70);

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    // lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(168,85,247,${.12 * (1 - dist / 120)})`;
          ctx.lineWidth = .6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
