/* SPIN THE BOTTLE – Redesigned Game Logic */
const COLORS = [
    '#a855f7', '#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#ef4444',
    '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6', '#e879f9', '#fb923c'
];

let players = [];
let spinning = false;
let currentRotation = 0;

// DOM
const screenSetup = document.getElementById('screen-setup');
const screenGame = document.getElementById('screen-game');
const playerInput = document.getElementById('player-input');
const btnAdd = document.getElementById('btn-add');
const playersList = document.getElementById('players-list');
const btnStart = document.getElementById('btn-start');
const canvas = document.getElementById('bottle-canvas');
const ctx = canvas.getContext('2d');
const bottleSvg = document.getElementById('bottle-svg');
const promptDisplay = document.getElementById('prompt-display');
const btnSpin = document.getElementById('btn-spin');

function showScreen(el) {
    [screenSetup, screenGame].forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

// ---- Setup ----
function renderTags() {
    playersList.innerHTML = '';
    players.forEach((p, i) => {
        const tag = document.createElement('span');
        tag.className = 'player-tag';
        tag.style.background = COLORS[i % COLORS.length] + '30';
        tag.style.borderColor = COLORS[i % COLORS.length] + '60';
        tag.innerHTML = `${p} <span class="remove">✕</span>`;
        tag.addEventListener('click', () => { players.splice(i, 1); renderTags(); });
        playersList.appendChild(tag);
    });
    btnStart.disabled = players.length < 3;
}

function addPlayer() {
    const name = playerInput.value.trim();
    if (!name || players.length >= 12) return;
    players.push(name);
    playerInput.value = '';
    renderTags();
    playerInput.focus();
}

btnAdd.addEventListener('click', addPlayer);
playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

btnStart.addEventListener('click', () => {
    drawCircle();
    promptDisplay.textContent = '';
    bottleSvg.style.transition = 'none';
    bottleSvg.style.transform = 'rotate(0deg)';
    currentRotation = 0;
    showScreen(screenGame);
});

// ---- Draw colorful circle with player segments ----
function drawCircle() {
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth || 380;
    const displayH = canvas.clientHeight || 380;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = displayW / 2, cy = displayH / 2, r = Math.min(cx, cy) - 4;
    const n = players.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, displayW, displayH);

    for (let i = 0; i < n; i++) {
        const startAngle = i * arc - Math.PI / 2; // start from top
        const endAngle = startAngle + arc;

        // Segment
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.15)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Name text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        const fontSize = Math.min(16, Math.max(11, 160 / n));
        ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,.5)';
        ctx.shadowBlur = 3;
        const text = players[i].length > 8 ? players[i].slice(0, 7) + '…' : players[i];
        ctx.fillText(text, r * 0.65, fontSize * 0.35);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(20, r * 0.12), 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a1a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ---- Spin ----
btnSpin.addEventListener('click', () => {
    if (spinning || players.length < 3) return;
    spinning = true;
    btnSpin.disabled = true;
    promptDisplay.textContent = '';

    const n = players.length;
    // Pick asker (bottom of bottle) and answerer (top of bottle)
    // The bottle will rotate. Top = 0deg points at segment 0 (top).
    // After rotation, the top of the bottle points at the answerer and bottom at the asker.
    // Segments are arranged starting from top (-90deg).
    // If bottle is at angle θ:
    //   Top of bottle → segment at angle θ - 90° (in circle coordinate)
    //   Bottom of bottle → segment at angle θ + 90° (opposite)

    // Random spin amount
    const spins = 5 + Math.floor(Math.random() * 4);
    const extraDeg = Math.random() * 360;
    const totalDeg = spins * 360 + extraDeg;
    currentRotation += totalDeg;

    bottleSvg.style.transition = 'transform 3.5s cubic-bezier(.15,.85,.25,1)';
    bottleSvg.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        // Figure out who top and bottom point to
        const finalDeg = currentRotation % 360;
        const segDeg = 360 / n;

        // Top of bottle points UP (0deg in bottle space = up in screen).
        // After rotating finalDeg clockwise, top points at finalDeg from north.
        // Segment i occupies from i*segDeg to (i+1)*segDeg around the circle, starting from north (top center).
        const topAngle = ((finalDeg % 360) + 360) % 360;
        const topIndex = Math.floor(topAngle / segDeg) % n;
        // Bottom = opposite side
        const bottomAngle = ((topAngle + 180) % 360);
        const bottomIndex = Math.floor(bottomAngle / segDeg) % n;

        // If same person, adjust
        let asker = players[bottomIndex];
        let answerer = players[topIndex];
        if (bottomIndex === topIndex) {
            // Pick adjacent
            answerer = players[(topIndex + 1) % n];
        }

        promptDisplay.textContent = `${asker} asks ${answerer}`;

        spinning = false;
        btnSpin.disabled = false;
    }, 3600);
});

// ---- Particles ----
(function () {
    const c = document.getElementById('particles'), ctx2 = c.getContext('2d');
    let w, h, pts;
    function resize() { w = c.width = innerWidth; h = c.height = innerHeight; }
    addEventListener('resize', resize); resize();
    const C = ['rgba(168,85,247,.35)', 'rgba(99,102,241,.3)', 'rgba(236,72,153,.25)'];
    pts = Array.from({ length: 50 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.5 + 1, dx: (Math.random() - .5) * .4, dy: (Math.random() - .5) * .4, c: C[Math.floor(Math.random() * C.length)] }));
    (function draw() {
        ctx2.clearRect(0, 0, w, h);
        for (const p of pts) { p.x += p.dx; p.y += p.dy; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0; ctx2.beginPath(); ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx2.fillStyle = p.c; ctx2.fill(); }
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy); if (d < 120) { ctx2.beginPath(); ctx2.moveTo(pts[i].x, pts[i].y); ctx2.lineTo(pts[j].x, pts[j].y); ctx2.strokeStyle = `rgba(168,85,247,${.12 * (1 - d / 120)})`; ctx2.lineWidth = .6; ctx2.stroke(); } }
        requestAnimationFrame(draw);
    })();
})();
