const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreDisplay = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
let CANVAS_WIDTH, CANVAS_HEIGHT;
let GAME_SPEED = 2; // Increased slightly over time
let GRAVITY = 0.25;
let JUMP_STRENGTH = -5.5;
let PIPE_WIDTH = 60;
let PIPE_GAP = 160;
let PIPE_SPAWN_RATE = 1500; // ms

// Game Variables
let state = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let bestScore = localStorage.getItem('flappyCrocBest') || 0;
let frameCount = 0;
let animationId;
let lastPipeSpawnTime = 0;

// Resize canvas to fit container
function resize() {
    CANVAS_WIDTH = canvas.parentElement.clientWidth;
    CANVAS_HEIGHT = canvas.parentElement.clientHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}
window.addEventListener('resize', resize);
resize();

bestScoreEl.innerText = bestScore;

// Entities
const croc = {
    x: 50,
    y: CANVAS_HEIGHT / 2,
    radius: 15,
    velocity: 0,
    emoji: '🐊',
    
    draw() {
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Tilt up when jumping, tilt down when falling
        let rotation = this.velocity * 0.1;
        // Clamp rotation
        if (rotation > Math.PI / 4) rotation = Math.PI / 4;
        if (rotation < -Math.PI / 4) rotation = -Math.PI / 4;
        
        ctx.rotate(rotation);
        
        // Draw emoji
        // Offset a bit since standard emojis might not be perfectly centered
        ctx.fillText(this.emoji, 0, 5);
        ctx.restore();
        
        // Debug hitbox
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        // ctx.strokeStyle = 'red';
        // ctx.stroke();
    },
    
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Hit bottom
        if (this.y + this.radius >= CANVAS_HEIGHT) {
            this.y = CANVAS_HEIGHT - this.radius;
            gameOver();
        }
        
        // Hit ceiling
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },
    
    jump() {
        this.velocity = JUMP_STRENGTH;
    },
    
    reset() {
        this.y = CANVAS_HEIGHT / 2;
        this.velocity = 0;
    }
};

let pipes = [];

class Pipe {
    constructor() {
        this.x = CANVAS_WIDTH;
        // Random top height between min and max
        const minHeight = 50;
        const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
        this.topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
        
        this.bottomY = this.topHeight + PIPE_GAP;
        this.width = PIPE_WIDTH;
        this.passed = false; // Used for scoring
    }
    
    draw() {
        ctx.fillStyle = '#74BF2E'; // Green pipe
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Pipe cap top
        ctx.fillRect(this.x - 5, this.topHeight - 20, this.width + 10, 20);
        
        // Bottom pipe
        ctx.fillRect(this.x, this.bottomY, this.width, CANVAS_HEIGHT - this.bottomY);
        // Pipe cap bottom
        ctx.fillRect(this.x - 5, this.bottomY, this.width + 10, 20);
        
        // Optional dark stroke for retro feel
        ctx.strokeStyle = '#543847';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, 0, this.width, this.topHeight);
        ctx.strokeRect(this.x - 5, this.topHeight - 20, this.width + 10, 20);
        ctx.strokeRect(this.x, this.bottomY, this.width, CANVAS_HEIGHT - this.bottomY);
        ctx.strokeRect(this.x - 5, this.bottomY, this.width + 10, 20);
    }
    
    update() {
        this.x -= GAME_SPEED;
    }
    
    checkCollision(circle) {
        // Simple AABB vs Circle collision check
        
        // Top Pipe rectangle
        let rect1 = {x: this.x, y: 0, w: this.width, h: this.topHeight};
        // Bottom Pipe rectangle
        let rect2 = {x: this.x, y: this.bottomY, w: this.width, h: CANVAS_HEIGHT - this.bottomY};
        
        return circleRectCollision(circle, rect1) || circleRectCollision(circle, rect2);
    }
}

function circleRectCollision(circle, rect) {
    let distX = Math.abs(circle.x - rect.x - rect.w/2);
    let distY = Math.abs(circle.y - rect.y - rect.h/2);

    if (distX > (rect.w/2 + circle.radius)) { return false; }
    if (distY > (rect.h/2 + circle.radius)) { return false; }

    if (distX <= (rect.w/2)) { return true; } 
    if (distY <= (rect.h/2)) { return true; }

    let dx = distX - rect.w/2;
    let dy = distY - rect.h/2;
    return (dx*dx + dy*dy <= (circle.radius*circle.radius));
}

// Background
const numClouds = 5;
const clouds = [];
for (let i=0; i<numClouds; i++) {
    clouds.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT / 2),
        speed: Math.random() * 0.5 + 0.1,
        scale: Math.random() * 0.5 + 0.5
    });
}

function drawBackground() {
    // Fill sky
    ctx.fillStyle = '#71c5cf';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw clouds loosely
    ctx.fillStyle = 'white';
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + 100 < 0) {
            cloud.x = CANVAS_WIDTH;
            cloud.y = Math.random() * (CANVAS_HEIGHT / 2);
        }
        
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 20 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 15 * cloud.scale, cloud.y - 10 * cloud.scale, 25 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30 * cloud.scale, cloud.y, 20 * cloud.scale, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw city skyline silhouette (optional)
    ctx.fillStyle = '#ded895';
    // ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50); // ground
}


// Input Handling
function handleInput(e) {
    // Prevent default scrolling on touch
    if (e.type === 'touchstart') e.preventDefault();
    
    // Accept spacebar for keyboard
    if (e.type === 'keydown' && e.code !== 'Space') return;
    
    if (state === 'START') {
        startGame();
    } else if (state === 'PLAYING') {
        croc.jump();
    } else if (state === 'GAMEOVER') {
        // Can optionally allow jump to restart here, but we have a button.
    }
}

// Event Listeners
window.addEventListener('keydown', handleInput);
window.addEventListener('touchstart', handleInput, { passive: false });
window.addEventListener('mousedown', (e) => {
    // Ignore clicks on buttons so they still work
    if(e.target.tagName !== 'BUTTON') {
        handleInput(e);
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

function startGame() {
    state = 'PLAYING';
    startScreen.classList.remove('active');
    scoreDisplay.style.display = 'block';
    
    croc.reset();
    croc.jump(); // Initial jump
    pipes = [];
    score = 0;
    scoreDisplay.innerText = score;
    lastPipeSpawnTime = performance.now(); // or Date.now()
    GAME_SPEED = 2.5; // Reset speed
    
    cancelAnimationFrame(animationId);
    gameLoop();
}

function restartGame() {
    gameOverScreen.classList.remove('active');
    startGame();
}

function gameOver() {
    if (state === 'GAMEOVER') return; // Prevent multiple calls
    
    state = 'GAMEOVER';
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyCrocBest', bestScore);
    }
    
    finalScoreEl.innerText = score;
    bestScoreEl.innerText = bestScore;
    
    scoreDisplay.style.display = 'none';
    gameOverScreen.classList.add('active');
}

function updateScore() {
    pipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + pipe.width < croc.x) {
            score++;
            scoreDisplay.innerText = score;
            pipe.passed = true;
            
            // Speed up slightly over time
            if (score % 5 === 0) {
                GAME_SPEED += 0.2;
            }
        }
    });
}

// Game Loop
function gameLoop(timestamp) {
    if (state !== 'PLAYING') return;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    
    // Spawn pipes
    if (timestamp - lastPipeSpawnTime > PIPE_SPAWN_RATE / (GAME_SPEED / 2.5)) {
        pipes.push(new Pipe());
        lastPipeSpawnTime = timestamp;
    }
    
    // Update and draw pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.update();
        p.draw();
        
        // Remove off-screen pipes
        if (p.x + p.width < 0) {
            pipes.splice(i, 1);
        }
        
        // Collision
        if (p.checkCollision(croc)) {
            gameOver();
        }
    }
    
    croc.update();
    croc.draw();
    
    updateScore();
    
    if (state === 'PLAYING') {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Initial draw
drawBackground();
croc.draw();
