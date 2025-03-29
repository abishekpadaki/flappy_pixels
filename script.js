const gameContainer = document.getElementById('game-container');
const bird = document.getElementById('bird');
const scoreDisplay = document.getElementById('score-display');
const startMessage = document.getElementById('start-message');
const gameOverMessage = document.getElementById('game-over-message');
const finalScore = document.getElementById('final-score');
const ground = document.getElementById('ground');

// Game Constants & Variables
const gameHeight = gameContainer.clientHeight;
const gameWidth = gameContainer.clientWidth;
const birdHeight = bird.offsetHeight;
const birdWidth = bird.offsetWidth;
const groundHeight = ground.offsetHeight;

let birdY;
let birdVelocity;
let gravity = 0.4;
let jumpStrength = -7;

let pipes = [];
let pipeSpeed = 3;
let pipeGap = 150;
let pipeWidth = 60;
let pipeSpawnRate = 1500; // Milliseconds between pipe spawns

let score;
let gameLoopId; // Renamed from gameLoopInterval for clarity with requestAnimationFrame ID
let pipeSpawnTimeout;
let gameStarted = false;
let isGameOver = false;
let lastTime = 0; // Use 0 to indicate the loop hasn't run yet

// --- Initialization ---
function resetGame() {
    console.log("Resetting game..."); // Debug log
    birdY = gameHeight / 2 - birdHeight / 2;
    birdVelocity = 0;
    bird.style.top = birdY + 'px';
    bird.style.transform = 'rotate(0deg)';

    pipes.forEach(pipeData => {
        pipeData.topPipe.remove();
        pipeData.bottomPipe.remove();
    });
    pipes = [];

    score = 0;
    scoreDisplay.textContent = score;
    scoreDisplay.style.display = 'block';

    gameOverMessage.style.display = 'none';
    startMessage.style.display = 'none';

    isGameOver = false;
    gameStarted = true;

    // Clear any previous timers/loops
    cancelAnimationFrame(gameLoopId);
    clearTimeout(pipeSpawnTimeout);

    // Start game processes
    lastTime = 0; // <<< CHANGE: Reset lastTime to 0 for the first frame calculation in gameLoop
    gameLoopId = requestAnimationFrame(gameLoop);
    scheduleNextPipe(); // <<< CHANGE: Call the function that schedules the *next* pipe (including the first one after a delay)
    console.log("Game reset complete, loop requested, pipe scheduled."); // Debug log
}

function showStartScreen() {
    birdY = gameHeight / 2 - birdHeight / 2;
    bird.style.top = birdY + 'px';
    bird.style.transform = 'rotate(0deg)';
    scoreDisplay.style.display = 'none';
    startMessage.style.display = 'block';
    gameOverMessage.style.display = 'none';
    gameStarted = false;
    isGameOver = false;
    pipes.forEach(pipeData => {
         pipeData.topPipe.remove();
         pipeData.bottomPipe.remove();
    });
    pipes = [];
    // Ensure ground animation is running if it was paused
    // ground.style.animationPlayState = 'running';
}


// --- Game Loop ---
function gameLoop(timestamp) { // timestamp is provided by requestAnimationFrame
    if (isGameOver) return;

    // <<< CHANGE: Handle the very first frame gracefully >>>
    if (lastTime === 0) {
        lastTime = timestamp; // Set the initial time
        gameLoopId = requestAnimationFrame(gameLoop); // Request the next frame
        return; // Skip calculations on the very first frame
    }

    // Calculate time delta for smooth, frame-rate independent movement
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp; // Update lastTime for the next frame
    // Avoid huge jumps if the tab was inactive
    const deltaMultiplier = Math.min(deltaTime / (1000 / 60), 3); // Normalize based on 60 FPS, max multiplier of 3


    // Update Bird
    birdVelocity += gravity * deltaMultiplier;
    birdY += birdVelocity * deltaMultiplier;
    bird.style.top = birdY + 'px';

    // Bird rotation based on velocity
    let rotation = Math.min(Math.max(-30, birdVelocity * 4), 90);
    bird.style.transform = `rotate(${rotation}deg)`;


    // Update Pipes
    // <<< CHANGE: Iterate backwards when removing elements to avoid index issues >>>
    for (let i = pipes.length - 1; i >= 0; i--) {
        let pipeData = pipes[i];
        pipeData.x -= pipeSpeed * deltaMultiplier;
        pipeData.topPipe.style.left = pipeData.x + 'px';
        pipeData.bottomPipe.style.left = pipeData.x + 'px';

        // Score Check
        if (!pipeData.scored && pipeData.x + pipeWidth < bird.offsetLeft + birdWidth / 2) {
            score++;
            scoreDisplay.textContent = score;
            pipeData.scored = true;
            // console.log("Score!", score); // Debug log
        }

        // Remove off-screen pipes
        if (pipeData.x < -pipeWidth) {
            pipeData.topPipe.remove();
            pipeData.bottomPipe.remove();
            pipes.splice(i, 1); // Remove from array
        }
    }


    // Collision Detection
    if (checkCollision()) {
        // console.log("Collision detected in game loop"); // Debug log
        endGame();
        return; // Stop the loop immediately
    }

    // Continue the loop
    if (!isGameOver) { // Double check just in case
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// --- Pipe Management ---
function createPipe() {
    if (isGameOver || !gameStarted) return;

    const minHeight = 50;
    const maxPipeTopHeight = gameHeight - groundHeight - pipeGap - minHeight;
    const pipeTopHeight = Math.random() * (maxPipeTopHeight - minHeight) + minHeight;
    const pipeBottomHeight = gameHeight - groundHeight - pipeTopHeight - pipeGap;

    const topPipe = document.createElement('div');
    topPipe.classList.add('pipe', 'pipe-top');
    topPipe.style.height = pipeTopHeight + 'px';
    topPipe.style.left = gameWidth + 'px';

    const bottomPipe = document.createElement('div');
    bottomPipe.classList.add('pipe', 'pipe-bottom');
    bottomPipe.style.height = pipeBottomHeight + 'px';
    bottomPipe.style.left = gameWidth + 'px';
    bottomPipe.style.bottom = groundHeight + 'px';


    gameContainer.appendChild(topPipe);
    gameContainer.appendChild(bottomPipe);

    pipes.push({
        topPipe: topPipe,
        bottomPipe: bottomPipe,
        x: gameWidth,
        scored: false
    });
    // console.log("Pipe created at x:", gameWidth); // Debug log
}

// <<< CHANGE: Modified pipe scheduling logic >>>
function scheduleNextPipe() {
    if (isGameOver || !gameStarted) return;
    // Clear any existing timeout just in case
    clearTimeout(pipeSpawnTimeout);
    // Set a timeout to create the *next* pipe
    pipeSpawnTimeout = setTimeout(() => {
        createPipe();
        scheduleNextPipe(); // Schedule the one after this one
    }, pipeSpawnRate);
}


// --- Collision Detection ---
function checkCollision() {
    const birdRect = bird.getBoundingClientRect();
    const gameRect = gameContainer.getBoundingClientRect();

    // Ground collision
    // <<< CHANGE: Use gameRect.bottom which is relative to viewport, matching birdRect >>>
    if (birdRect.bottom > gameRect.bottom - groundHeight) {
        // console.log("Ground Collision: birdBottom=", birdRect.bottom, " groundTop=", gameRect.bottom - groundHeight); // Debug log
        birdY = gameHeight - groundHeight - birdHeight; // Position bird exactly on ground
        bird.style.top = birdY + 'px';
        return true;
    }

    // Ceiling collision
    // <<< CHANGE: Use gameRect.top >>>
    if (birdRect.top < gameRect.top) {
        // console.log("Ceiling Collision: birdTop=", birdRect.top, " ceilingBottom=", gameRect.top); // Debug log
         birdY = 0;
         birdVelocity = Math.max(0, birdVelocity);
         bird.style.top = birdY + 'px';
         return true;
    }

    // Pipe collision
    for (let pipeData of pipes) {
        // <<< OPTIMIZATION: Only get pipe rects if potentially colliding >>>
        // Check rough X overlap first based on logical position 'pipeData.x'
        const birdRightEdge = bird.offsetLeft + birdWidth;
        const birdLeftEdge = bird.offsetLeft;
        const pipeRightEdge = pipeData.x + pipeWidth;
        const pipeLeftEdge = pipeData.x;

        // If bird's right edge is past pipe's left AND bird's left edge is before pipe's right
        if (birdRightEdge > pipeLeftEdge && birdLeftEdge < pipeRightEdge) {
            const topPipeRect = pipeData.topPipe.getBoundingClientRect();
            const bottomPipeRect = pipeData.bottomPipe.getBoundingClientRect();

            // Need birdRect again here as it reflects current position in viewport
            const currentBirdRect = bird.getBoundingClientRect();

            // Check precise X overlap using getBoundingClientRect
            const xOverlap = currentBirdRect.right > topPipeRect.left && currentBirdRect.left < topPipeRect.right;

            if (xOverlap) {
                const yOverlapTop = currentBirdRect.top < topPipeRect.bottom;
                const yOverlapBottom = currentBirdRect.bottom > bottomPipeRect.top;

                if (yOverlapTop || yOverlapBottom) {
                    // console.log("Pipe Collision"); // Debug log
                    return true;
                }
            }
        }
    }

    return false;
}

// --- Game State Control ---
function endGame() {
    if (isGameOver) return;
    console.log("Game Over"); // Debug log

    isGameOver = true;
    gameStarted = false;

    cancelAnimationFrame(gameLoopId);
    clearTimeout(pipeSpawnTimeout); // Stop new pipes from spawning

    // Optional: Stop ground animation
    // ground.style.animationPlayState = 'paused';

    finalScore.textContent = score;
    gameOverMessage.style.display = 'block';
    scoreDisplay.style.display = 'none';

    // No delay needed here for restart logic, the input handler checks state
}

// --- Input Handling ---
function handleInput(event) {
    // Allow spacebar or click/tap
    if (event.type === 'keydown' && event.code !== 'Space') {
        return;
    }

    event.preventDefault(); // Important for spacebar and touch

    if (!gameStarted) {
         // This covers both initial start and restart after game over
        console.log("Input detected - Starting/Restarting Game"); // Debug log
        resetGame(); // Reset and start the game loop + pipe spawning
    } else if (!isGameOver) {
        // If game is running, make the bird jump
        birdVelocity = jumpStrength;
        // Optional: Add instant rotation feedback on jump
        bird.style.transform = 'rotate(-20deg)';
    }
    // If isGameOver is true and gameStarted is false, the next input will trigger resetGame()
}


// --- Event Listeners ---
document.addEventListener('keydown', handleInput);
document.addEventListener('mousedown', handleInput);
document.addEventListener('touchstart', handleInput);


// --- Initial Setup ---
showStartScreen();
console.log("Initial setup complete, showing start screen."); // Debug log