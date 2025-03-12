const GAME_CONFIG = {
    JUMP_HEIGHT: 150,
    JUMP_DURATION: 500,
    BASE_SPEED: 5,          // Kecepatan tetap
    MIN_OBSTACLE_DISTANCE: 200,
    SPAWN_INTERVAL: 2000,
    MIN_OBSTACLE_SIZE: 40,
    MAX_OBSTACLE_SIZE: 80,
    MAX_OBSTACLES: 10,
    COUNTDOWN_DURATION: 3,
    INITIAL_DELAY: 2000
};

// Game state
const gameState = {
    score: 0,
    highScore: parseInt(localStorage.getItem('highScore')) || 0,
    speed: GAME_CONFIG.BASE_SPEED,
    isPlaying: false,
    isPaused: false,
    isJumping: false,
    canJump: true,
    currentLaneIndex: 1,
    obstacles: [],
    lastObstacleSpawnTime: 0,
    obstacleSpawnInterval: 1500,
    countdownActive: false,
    gameStartTime: 0,
    jumpTimeout: null
};

// DOM Elements
const elements = {
    gameContainer: document.getElementById('game-container'),
    player: document.getElementById('player'),
    scoreElement: document.getElementById('score'),
    menuElement: document.getElementById('menu'),
    startButton: document.getElementById('startButton'),
    lanes: Array.from(document.querySelectorAll('.lane'))
};

// Event Handlers
function handleTouch(e) {
    e.preventDefault();
    if (gameState.isPlaying && !gameState.isPaused) {
        jump();
    } else if (!gameState.isPlaying && e.target.tagName !== 'BUTTON') {
        startGame();
    }
}

function handleKeydown(e) {
    if (!gameState.isPlaying) return;
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
}

// Game Functions
function movePlayerToLane(laneIndex) {
    const lane = elements.lanes[laneIndex];
    if (lane) {
        const laneLeft = lane.offsetLeft;
        elements.player.style.left = `${laneLeft + GAME_CONFIG.LANE_WIDTH / 2 - elements.player.offsetWidth / 2}px`;
    }
}

function jump() {
    if (!gameState.canJump || gameState.isJumping || !gameState.isPlaying || gameState.isPaused) return;

    gameState.isJumping = true;
    gameState.canJump = false;

    if (gameState.jumpTimeout) {
        clearTimeout(gameState.jumpTimeout);
    }

    elements.player.classList.add('jumping');
    gameState.jumpTimeout = setTimeout(() => {
        elements.player.classList.remove('jumping');
        gameState.isJumping = false;
        gameState.canJump = true;
    }, 600);
}

function resetGame() {
    gameState.obstacles.forEach(obstacle => obstacle.element.remove());
    gameState.obstacles = [];
    gameState.score = 0;
    gameState.speed = GAME_CONFIG.BASE_SPEED;
    gameState.currentLaneIndex = Math.floor(elements.lanes.length / 2);
    movePlayerToLane(gameState.currentLaneIndex);
    updateScore();
}

function startCountdown() {
    gameState.countdownActive = true;
    let count = GAME_CONFIG.COUNTDOWN_DURATION;
    
    const countdownElement = document.createElement('div');
    countdownElement.className = 'countdown';
    elements.gameContainer.appendChild(countdownElement);
    
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            countdownElement.textContent = count;
            count--;
        } else {
            clearInterval(countdownInterval);
            countdownElement.remove();
            gameState.countdownActive = false;
            gameState.gameStartTime = Date.now();
            gameState.isPlaying = true;
            gameLoop();
        }
    }, 1000);
}

function startGame() {
    gameState.isPlaying = false;
    gameState.isPaused = false;
    elements.menuElement.style.display = 'none';
    resetGame();
    startCountdown();
}

function gameLoop() {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const currentTime = Date.now();
    if (currentTime - gameState.gameStartTime >= GAME_CONFIG.INITIAL_DELAY) {
        moveObstacles();
        spawnObstacle();
        checkCollisions();
    }

    requestAnimationFrame(gameLoop);
}

function updateScore() {
    gameState.score += 10;
    elements.scoreElement.textContent = `Score: ${gameState.score}`;
}

// Tambahkan fungsi-fungsi obstacle
function getRandomObstacleSize() {
    const height = Math.random() * 
        (GAME_CONFIG.MAX_OBSTACLE_SIZE - GAME_CONFIG.MIN_OBSTACLE_SIZE) + 
        GAME_CONFIG.MIN_OBSTACLE_SIZE;
    return {
        width: height * 0.8,
        height: height
    };
}

function createObstacle(laneIndex) {
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    const lane = elements.lanes[laneIndex];
    if (lane) {
        const laneLeft = lane.offsetLeft;
        const startPosition = window.innerWidth;
        const size = getRandomObstacleSize();

        obstacle.style.width = `${size.width}px`;
        obstacle.style.height = `${size.height}px`;
        obstacle.style.left = `${laneLeft}px`;
        obstacle.style.transform = `translateX(${startPosition}px)`;
        
        elements.gameContainer.appendChild(obstacle);
        gameState.obstacles.push({
            element: obstacle,
            lane: laneIndex,
            position: startPosition,
            passed: false,
            size: size
        });
    }
}

function moveObstacles() {
    const toRemove = [];
    const containerRect = elements.gameContainer.getBoundingClientRect();
    const playerRect = elements.player.getBoundingClientRect();
    
    gameState.obstacles.forEach((obstacle, index) => {
        obstacle.position -= gameState.speed;
        const obstacleRect = obstacle.element.getBoundingClientRect();
        
        // Update position
        obstacle.element.style.transform = `translateX(${obstacle.position}px)`;
        
        // Check if passed player
        if (!obstacle.passed && obstacleRect.right < playerRect.left) {
            obstacle.passed = true;
            updateScore();
        }
        
        // Check if out of screen
        if (obstacleRect.right < containerRect.left - 100) {
            toRemove.push(index);
            obstacle.element.remove();
        }
    });
    
    // Remove out-of-screen obstacles
    for (let i = toRemove.length - 1; i >= 0; i--) {
        gameState.obstacles.splice(toRemove[i], 1);
    }
}

function spawnObstacle() {
    const currentTime = Date.now();
    const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1];
    
    const minDistanceOK = !lastObstacle || 
        (lastObstacle.position < window.innerWidth - GAME_CONFIG.MIN_OBSTACLE_DISTANCE);
    
    if (currentTime - gameState.lastObstacleSpawnTime > GAME_CONFIG.SPAWN_INTERVAL && 
        minDistanceOK && 
        gameState.obstacles.length < GAME_CONFIG.MAX_OBSTACLES) {
        
        const randomLaneIndex = Math.floor(Math.random() * elements.lanes.length);
        createObstacle(randomLaneIndex);
        gameState.lastObstacleSpawnTime = currentTime;
    }
}

function checkCollisions() {
    const playerRect = elements.player.getBoundingClientRect();
    
    for (const obstacle of gameState.obstacles) {
        const obstacleRect = obstacle.element.getBoundingClientRect();
        if (checkCollision(playerRect, obstacleRect)) {
            gameOver();
            return;
        }
    }
}

function checkCollision(rect1, rect2) {
    const tolerance = 10;
    return !(
        rect1.right - tolerance < rect2.left + tolerance ||
        rect1.left + tolerance > rect2.right - tolerance ||
        rect1.bottom - tolerance < rect2.top + tolerance ||
        rect1.top + tolerance > rect2.bottom - tolerance
    );
}

function gameOver() {
    gameState.isPlaying = false;
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }
    showMenu(gameState.score);
}

function showMenu(finalScore = 0) {
    elements.menuElement.style.display = 'block';
    document.getElementById('high-score').textContent = gameState.highScore;
    
    const oldMessage = elements.menuElement.querySelector('.game-over-message');
    if (oldMessage) oldMessage.remove();
    
    if (finalScore > 0) {
        const scoreMessage = document.createElement('p');
        scoreMessage.className = 'game-over-message';
        scoreMessage.textContent = `Game Over! Score: ${finalScore}`;
        elements.menuElement.insertBefore(scoreMessage, elements.menuElement.firstChild);
    }
}

// Initialize game
function initGame() {
    elements.startButton.addEventListener('click', startGame);
    document.addEventListener('touchstart', handleTouch, { passive: false });
    document.addEventListener('keydown', handleKeydown);
}

// Start everything
window.addEventListener('DOMContentLoaded', initGame);
