/* WHEEL OF NAMES – Redesigned Game Logic */
const COLORS = [
    '#a855f7', '#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#ef4444',
    '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6', '#e879f9', '#fb923c',
    '#4ade80', '#f472b6', '#38bdf8', '#facc15', '#c084fc', '#34d399'
];

let names = [];
let spinning = false;
let currentAngle = 0;
let lastWinnerIndex = -1;

// DOM
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const namesList = document.getElementById('names-list');
const nameInput = document.getElementById('name-input');
const btnAdd = document.getElementById('btn-add');
const btnSpin = document.getElementById('btn-spin');
const btnRemoveWinner = document.getElementById('btn-remove-winner');
const winnerDisplay = document.getElementById('winner-display');

// ---- Names Management ----
function renderNames() {
    namesList.innerHTML = '';
    names.forEach((name, i) => {
        const item = document.createElement('div');
        item.className = 'name-item';
        item.innerHTML = `
      <span class="name-color" style="background:${COLORS[i % COLORS.length]}"></span>
      <span class="name-text">${name}</span>
      <button class="name-remove" data-index="${i}" title="Remove">✕</button>
    `;
        item.querySelector('.name-remove').addEventListener('click', () => {
            names.splice(i, 1);
            if (lastWinnerIndex >= names.length) lastWinnerIndex = -1;
            renderNames();
            drawWheel();
        });
        namesList.appendChild(item);
    });
    btnSpin.disabled = names.length < 2;
    drawWheel();
}

function addName() {
    const name = nameInput.value.trim();
    if (!name) return;
    names.push(name);
    nameInput.value = '';
    renderNames();
    nameInput.focus();
    // Scroll to bottom
    namesList.scrollTop = namesList.scrollHeight;
}

btnAdd.addEventListener('click', addName);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(); });

btnRemoveWinner.addEventListener('click', () => {
    if (lastWinnerIndex >= 0 && lastWinnerIndex < names.length) {
        names.splice(lastWinnerIndex, 1);
        lastWinnerIndex = -1;
        winnerDisplay.textContent = '';
        btnRemoveWinner.style.display = 'none';
        renderNames();
    }
});

// ---- Draw Wheel ----
function drawWheel() {
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth || 420;
    const displayH = canvas.clientHeight || 420;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = displayW / 2, cy = displayH / 2, r = Math.min(cx, cy) - 6;
    const n = names.length;

    ctx.clearRect(0, 0, displayW, displayH);

    if (n === 0) {
        // Empty state
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.03)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.textAlign = 'center';
        ctx.fillText('Add names to begin', cx, cy);
        return;
    }

    const arc = (2 * Math.PI) / n;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentAngle);

    for (let i = 0; i < n; i++) {
        const startAngle = i * arc;
        const endAngle = startAngle + arc;

        // Segment
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        const fontSize = Math.min(24, Math.max(13, 260 / n));
        ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,.6)';
        ctx.shadowBlur = 4;
        const maxLen = Math.floor(r / (fontSize * 0.6));
        const text = names[i].length > maxLen ? names[i].slice(0, maxLen - 1) + '…' : names[i];
        ctx.fillText(text, r - 14, fontSize * 0.35);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(16, r * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a1a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

// ---- Spin ----
btnSpin.addEventListener('click', () => {
    if (spinning || names.length < 2) return;
    spinning = true;
    btnSpin.disabled = true;
    winnerDisplay.textContent = '';
    btnRemoveWinner.style.display = 'none';

    const n = names.length;
    const arc = (2 * Math.PI) / n;
    const targetIndex = Math.floor(Math.random() * n);

    // Pointer at top = -π/2. Segment center at currentAngle + i*arc + arc/2.
    const baseTarget = -Math.PI / 2 - targetIndex * arc - arc / 2;
    const spins = 5 + Math.floor(Math.random() * 4);
    const targetAngleFinal = baseTarget - spins * 2 * Math.PI;
    const offset = (Math.random() - 0.5) * arc * 0.6;

    const startAngle = currentAngle;
    const totalDelta = (targetAngleFinal + offset) - startAngle;
    const duration = 5000;
    const startTime = performance.now();

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        currentAngle = startAngle + totalDelta * easeOut(progress);
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            spinning = false;
            btnSpin.disabled = false;
            lastWinnerIndex = targetIndex;
            winnerDisplay.textContent = '🎉 ' + names[targetIndex];
            btnRemoveWinner.style.display = '';
        }
    }

    requestAnimationFrame(animate);
});

// ---- Init with some sample names ----
names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
renderNames();

// ---- Particles ----
(function () {
    const c2 = document.getElementById('particles'), ctx2 = c2.getContext('2d');
    let w, h, pts;
    function resize() { w = c2.width = innerWidth; h = c2.height = innerHeight; }
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
