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

class Game {
    constructor() {
        this.gameContainer = document.getElementById('game-container');
        this.player = document.getElementById('player');
        this.scoreElement = document.getElementById('score');
        this.menuElement = document.getElementById('menu');
        this.lanes = Array.from(document.querySelectorAll('.lane'));
        
        // Game state
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.speed = GAME_CONFIG.BASE_SPEED;
        this.isPlaying = false;
        this.isPaused = false;
        this.isJumping = false;
        this.canJump = true;
        this.currentLaneIndex = 1;
        this.obstacles = [];
        this.lastObstacleSpawnTime = 0;
        this.obstacleSpawnInterval = 1500;
        this.countdownActive = false;
        this.gameStartTime = 0;
        this.jumpTimeout = null;
        
        // Bind event handlers
        this.handleTouch = this.handleTouch.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        
        // Add start button handler
        this.startButton = document.getElementById('startButton');
        this.startButton.addEventListener('click', () => this.startGame());
        
        this.setupEventListeners();
        this.showMenu();
    }

    setupEventListeners() {
        // Handle touch events
        document.addEventListener('touchstart', this.handleTouch, { passive: false });
        document.addEventListener('keydown', this.handleKeydown);
    }

    handleTouch(e) {
        e.preventDefault(); // Prevent default touch behavior
        if (this.isPlaying && !this.isPaused) {
            this.jump();
        } else if (!this.isPlaying && e.target.tagName !== 'BUTTON') {
            // Start game on touch if not playing (except when touching buttons)
            this.startGame();
        }
    }

    handleKeydown(e) {
        if (!this.isPlaying) return;
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scroll on space
            this.jump();
        }
    }

    // Clean up event listeners when game is destroyed
    destroy() {
        document.removeEventListener('touchstart', this.handleTouch);
        document.removeEventListener('keydown', this.handleKeydown);
    }

    movePlayerToLane(laneIndex) {
        const lane = this.lanes[laneIndex];
        if (lane) {
            const laneLeft = lane.offsetLeft;
            this.player.style.left = (laneLeft + GAME_CONFIG.LANE_WIDTH / 2 - this.player.offsetWidth / 2) + 'px';
        }
    }

    movePlayer(direction) {
        if (this.isJumping || this.isPaused) return;
        
        if (direction === 'left') {
            this.currentLaneIndex = Math.max(this.currentLaneIndex - 1, 0);
        } else {
            this.currentLaneIndex = Math.min(this.currentLaneIndex + 1, this.lanes.length - 1);
        }
        this.movePlayerToLane(this.currentLaneIndex);
    }

    resetGame() {
        // Reset semua state game
        this.obstacles.forEach(obstacle => obstacle.element.remove());
        this.obstacles = [];
        this.score = 0;
        this.speed = GAME_CONFIG.BASE_SPEED;
        this.currentLaneIndex = Math.floor(this.lanes.length / 2);
        this.movePlayerToLane(this.currentLaneIndex);
        this.lastObstacleSpawnTime = 0;
        this.obstacleSpawnInterval = GAME_CONFIG.SPAWN_INTERVAL;
        
        // Update UI
        this.scoreElement.textContent = `Score: ${this.score}`;
    }

    startCountdown() {
        this.countdownActive = true;
        let count = GAME_CONFIG.COUNTDOWN_DURATION;
        
        const countdownElement = document.createElement('div');
        countdownElement.className = 'countdown';
        this.gameContainer.appendChild(countdownElement);
        
        const countdownInterval = setInterval(() => {
            if (count > 0) {
                countdownElement.textContent = count;
                count--;
            } else {
                clearInterval(countdownInterval);
                countdownElement.remove();
                this.countdownActive = false;
                this.gameStartTime = Date.now();
                this.isPlaying = true; // Pastikan game sudah playing
                this.gameLoop();
            }
        }, 1000);
    }

    startGame() {
        // Bersihkan state game sebelumnya
        this.isPlaying = false;
        this.isPaused = false;
        this.obstacles.forEach(obstacle => obstacle.element.remove());
        this.obstacles = [];
        
        this.menuElement.style.display = 'none';
        this.resetGame();
        this.startCountdown();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-menu').style.display = 
            this.isPaused ? 'flex' : 'none';
    }

    checkCollision(playerRect, obstacleRect) {
        const tolerance = 10; // Collision tolerance for better gameplay
        return !(
            playerRect.right - tolerance < obstacleRect.left + tolerance ||
            playerRect.left + tolerance > obstacleRect.right - tolerance ||
            playerRect.bottom - tolerance < obstacleRect.top + tolerance ||
            playerRect.top + tolerance > obstacleRect.bottom - tolerance
        );
    }

    showMenu(finalScore = 0) {
        this.menuElement.style.display = 'block';
        const highScoreElement = document.getElementById('high-score');
        highScoreElement.textContent = this.highScore;
        
        // Hapus pesan game over yang lama jika ada
        const oldMessage = this.menuElement.querySelector('.game-over-message');
        if (oldMessage) {
            oldMessage.remove();
        }
        
        if (finalScore > 0) {
            const scoreMessage = document.createElement('p');
            scoreMessage.className = 'game-over-message';
            scoreMessage.textContent = `Game Over! Score: ${finalScore}`;
            this.menuElement.insertBefore(scoreMessage, this.menuElement.firstChild);
        }

        // Reset state game
        this.isPlaying = false;
        this.isPaused = false;
    }

    gameLoop = () => {
        if (!this.isPlaying || this.isPaused) return;

        const currentTime = Date.now();
        // Pastikan game sudah melewati initial delay
        if (currentTime - this.gameStartTime >= GAME_CONFIG.INITIAL_DELAY) {
            this.moveObstacles();
            this.spawnObstacle();
            this.checkCollisions();
        }
        
        // Selalu lanjutkan game loop
        requestAnimationFrame(this.gameLoop);
    }

    updateScore() {
        this.score += 10;
        this.scoreElement.textContent = `Score: ${this.score}`;
    }

    jump() {
        if (!this.canJump || this.isJumping || !this.isPlaying || this.isPaused) return;

        this.isJumping = true;
        this.canJump = false;
        
        // Clear any existing timeout to prevent animation conflicts
        if (this.jumpTimeout) {
            clearTimeout(this.jumpTimeout);
        }

        // Start jump animation immediately
        this.player.classList.add('jumping');
        
        this.jumpTimeout = setTimeout(() => {
            this.player.classList.remove('jumping');
            this.isJumping = false;
            this.canJump = true; // Allow next jump immediately after landing
        }, 600); // Increase duration to 600ms for slower animation
    }

    getRandomObstacleSize() {
        // Generate random size between MIN and MAX, but keep aspect ratio
        const height = Math.random() * 
            (GAME_CONFIG.MAX_OBSTACLE_SIZE - GAME_CONFIG.MIN_OBSTACLE_SIZE) + 
            GAME_CONFIG.MIN_OBSTACLE_SIZE;
        
        // Width akan sedikit lebih kecil dari height untuk memudahkan lompatan
        const width = (height * 0.8);
        
        return { width, height };
    }

    createObstacle(laneIndex) {
        const obstacle = document.createElement('div');
        obstacle.classList.add('obstacle');
        const lane = this.lanes[laneIndex];
        if (lane) {
            const laneLeft = lane.offsetLeft;
            const startPosition = window.innerWidth + 100; // Gunakan window.innerWidth untuk konsistensi
            const size = this.getRandomObstacleSize();
            
            // Set random size
            obstacle.style.width = `${size.width}px`;
            obstacle.style.height = `${size.height}px`;
            obstacle.style.left = `${laneLeft}px`;
            obstacle.style.transform = `translateX(${startPosition}px)`;
            obstacle.style.bottom = '0';
            
            this.gameContainer.appendChild(obstacle);
            this.obstacles.push({
                element: obstacle,
                lane: laneIndex,
                position: startPosition,
                passed: false, // Track apakah obstacle sudah dilewati
                size: size
            });
        }
    }

    moveObstacles() {
        const toRemove = [];
        const containerRect = this.gameContainer.getBoundingClientRect();
        const playerRect = this.player.getBoundingClientRect();
        
        this.obstacles.forEach((obstacle, index) => {
            obstacle.position -= this.speed;
            const lane = this.lanes[obstacle.lane];
            const laneLeft = lane.offsetLeft;
            
            // Update posisi obstacle
            obstacle.element.style.left = `${laneLeft}px`;
            obstacle.element.style.transform = `translateX(${obstacle.position}px)`;
            
            // Cek posisi obstacle relatif terhadap pemain
            const obstacleRect = obstacle.element.getBoundingClientRect();
            
            // Update score saat obstacle melewati pemain
            if (!obstacle.passed && obstacleRect.right < playerRect.left) {
                this.updateScore();
                obstacle.passed = true;
            }
            
            // Hapus hanya jika benar-benar sudah keluar layar
            if (obstacleRect.right < containerRect.left - 100) {
                toRemove.push(index);
                obstacle.element.remove();
            }
        });
        
        // Hapus obstacles yang sudah keluar layar
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.obstacles.splice(toRemove[i], 1);
        }
    }

    spawnObstacle() {
        const currentTime = Date.now();
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        
        const minDistanceOK = !lastObstacle || 
            (lastObstacle.position < window.innerWidth - GAME_CONFIG.MIN_OBSTACLE_DISTANCE);
        
        if (currentTime - this.lastObstacleSpawnTime > GAME_CONFIG.SPAWN_INTERVAL && 
            minDistanceOK && 
            this.obstacles.length < GAME_CONFIG.MAX_OBSTACLES) {
            
            const randomLaneIndex = Math.floor(Math.random() * this.lanes.length);
            this.createObstacle(randomLaneIndex);
            this.lastObstacleSpawnTime = currentTime;
        }
    }

    checkCollisions() {
        const playerRect = this.player.getBoundingClientRect();
        
        for (const obstacle of this.obstacles) {
            const obstacleRect = obstacle.element.getBoundingClientRect();
            if (this.checkCollision(playerRect, obstacleRect)) {
                this.gameOver();
                return;
            }
        }
    }

    gameOver() {
        this.isPlaying = false;
        const finalScore = this.score;
        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            localStorage.setItem('highScore', this.highScore);
        }
        
        // Langsung tampilkan menu dengan score
        this.showMenu(finalScore);
    }
}

// Initialize game and make it globally available
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
