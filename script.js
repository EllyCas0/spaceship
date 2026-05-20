const player = document.getElementById('player');
const enemyContainer = document.getElementById('enemy-container');
const bulletsContainer = document.getElementById('bullets-container');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const highScoreDisplay = document.getElementById('high-score');
const message = document.getElementById('message');
const messageTitle = message.querySelector('h1');
const messageText = document.getElementById('message-text');
const startButton = document.getElementById('start-button');

let animationFrame;
let enemySpawnInterval;
let bullets = [];
let enemies = [];
let pressedKeys = new Set();
let score = 0;
let lives = 3;
let level = 1;
let highScore = loadHighScore();
let isRunning = false;
let isPaused = false;
let lastShotAt = 0;

function loadHighScore() {
  try {
    return Number(localStorage.getItem('spaceInvadersHighScore')) || 0;
  } catch (error) {
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem('spaceInvadersHighScore', highScore);
  } catch (error) {
    // The game still works if private mode or browser settings block storage.
  }
}

function updateHud() {
  scoreDisplay.textContent = 'Puntaje: ' + score;
  livesDisplay.textContent = 'Vidas: ' + lives;
  levelDisplay.textContent = 'Nivel: ' + level;
  highScoreDisplay.textContent = 'Record: ' + highScore;
}

function createEnemy() {
  const enemy = document.createElement('div');
  enemy.className = 'enemy';
  enemy.style.left = Math.random() * (window.innerWidth - 40) + 'px';
  enemy.style.top = '-40px';
  enemyContainer.appendChild(enemy);
  enemies.push(enemy);
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  isPaused = false;
  updateHud();
  bullets.forEach((bullet) => bullet.remove());
  enemies.forEach((enemy) => enemy.remove());
  bullets = [];
  enemies = [];
  pressedKeys.clear();
  player.style.left = window.innerWidth / 2 - player.offsetWidth / 2 + 'px';
  player.style.transform = 'none';
}

function isColliding(rect1, rect2) {
  return !(
    rect1.top > rect2.bottom ||
    rect1.right < rect2.left ||
    rect1.bottom < rect2.top ||
    rect1.left > rect2.right
  );
}

function movePlayer() {
  const currentLeft = player.offsetLeft;
  const step = 8;
  const maxLeft = window.innerWidth - player.offsetWidth;

  if (pressedKeys.has('ArrowLeft')) {
    player.style.left = Math.max(0, currentLeft - step) + 'px';
    player.style.transform = 'none';
  }

  if (pressedKeys.has('ArrowRight')) {
    player.style.left = Math.min(maxLeft, currentLeft + step) + 'px';
    player.style.transform = 'none';
  }
}

function shoot() {
  const now = Date.now();
  if (!isRunning || isPaused || now - lastShotAt < 180) {
    return;
  }

  lastShotAt = now;
  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  bullet.style.left = player.offsetLeft + player.offsetWidth / 2 - 2.5 + 'px';
  bullet.style.bottom = player.offsetHeight + 'px';
  bulletsContainer.appendChild(bullet);
  bullets.push(bullet);
}

function updateScore(points) {
  score += points;
  if (score > highScore) {
    highScore = score;
    saveHighScore();
  }
  updateLevel();
  updateHud();
}

function createExplosion(left, top) {
  const explosion = document.createElement('div');
  explosion.className = 'explosion';
  explosion.style.left = left;
  explosion.style.top = top;
  enemyContainer.appendChild(explosion);
  setTimeout(() => {
    explosion.remove();
  }, 1000); 
}

function updateBullets() {
  bullets = bullets.filter((bullet) => {
    const nextBottom = parseInt(bullet.style.bottom || 0) + 12;
    bullet.style.bottom = nextBottom + 'px';

    if (nextBottom > window.innerHeight) {
      bullet.remove();
      return false;
    }

    return true;
  });
}

function updateEnemies() {
  enemies = enemies.filter((enemy) => {
    const nextTop = parseInt(enemy.style.top || 0) + getEnemySpeed();
    enemy.style.top = nextTop + 'px';

    if (nextTop > window.innerHeight) {
      enemy.remove();
      return false;
    }

    if (isColliding(player.getBoundingClientRect(), enemy.getBoundingClientRect())) {
      enemy.remove();
      loseLife();
      return false;
    }

    return true;
  });
}

function checkHits() {
  enemies.forEach((enemy) => {
    bullets.forEach((bullet) => {
      if (!enemy.isConnected || !bullet.isConnected) {
        return;
      }

      if (isColliding(bullet.getBoundingClientRect(), enemy.getBoundingClientRect())) {
        createExplosion(enemy.style.left, enemy.style.top);
        enemy.remove();
        bullet.remove();
        updateScore(10);
      }
    });
  });

  enemies = enemies.filter((enemy) => enemy.isConnected);
  bullets = bullets.filter((bullet) => bullet.isConnected);
}

function gameLoop() {
  if (!isRunning || isPaused) {
    return;
  }

  movePlayer();
  updateBullets();
  updateEnemies();
  checkHits();
  animationFrame = requestAnimationFrame(gameLoop);
}

function startGame() {
  clearInterval(enemySpawnInterval);
  cancelAnimationFrame(animationFrame);
  resetGame();
  isRunning = true;
  messageTitle.textContent = 'Space Invaders';
  messageText.textContent = 'Flechas para moverte, espacio para disparar, P para pausar.';
  startButton.textContent = 'Jugar';
  message.classList.add('hidden');
  enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
  animationFrame = requestAnimationFrame(gameLoop);
}

function endGame() {
  isRunning = false;
  isPaused = false;
  clearInterval(enemySpawnInterval);
  cancelAnimationFrame(animationFrame);
  messageTitle.textContent = 'Game Over';
  messageText.textContent = 'Puntaje: ' + score + ' | Record: ' + highScore;
  startButton.textContent = 'Volver a jugar';
  message.classList.remove('hidden');
}

function getEnemySpeed() {
  return 2 + level;
}

function getSpawnDelay() {
  return Math.max(320, 950 - level * 80);
}

function updateLevel() {
  const nextLevel = Math.floor(score / 100) + 1;
  if (nextLevel === level) {
    return;
  }

  level = nextLevel;
  clearInterval(enemySpawnInterval);
  enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
}

function loseLife() {
  if (!isRunning) {
    return;
  }

  lives -= 1;
  updateHud();
  player.classList.add('hit');
  setTimeout(() => player.classList.remove('hit'), 400);

  if (lives <= 0) {
    endGame();
  }
}

function togglePause() {
  if (!isRunning) {
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    clearInterval(enemySpawnInterval);
    cancelAnimationFrame(animationFrame);
    messageTitle.textContent = 'Pausa';
    messageText.textContent = 'Presiona P para seguir jugando.';
    startButton.textContent = 'Reiniciar';
    message.classList.remove('hidden');
    return;
  }

  message.classList.add('hidden');
  enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
  animationFrame = requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
  if (event.key && event.key.toLowerCase() === 'p') {
    togglePause();
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    shoot();
    return;
  }

  pressedKeys.add(event.key);
});

document.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.key);
});

startButton.addEventListener('click', startGame);
updateHud();
