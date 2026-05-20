const player = document.getElementById('player');
const enemyContainer = document.getElementById('enemy-container');
const bulletsContainer = document.getElementById('bullets-container');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const highScoreDisplay = document.getElementById('high-score');
const powerStatusDisplay = document.getElementById('power-status');
const message = document.getElementById('message');
const messageTitle = message.querySelector('h1');
const messageText = document.getElementById('message-text');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const instructionsButton = document.getElementById('instructions-button');
const instructionsPanel = document.getElementById('instructions-panel');
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
const soundToggle = document.getElementById('sound-toggle');
const backgroundSelect = document.getElementById('background-select');
const shipSelect = document.getElementById('ship-select');
const exitButton = document.getElementById('exit-button');
const touchButtons = document.querySelectorAll('.touch-button');

const enemyTypes = [
  { name: 'scout', className: 'enemy scout', hp: 1, points: 10, speed: 1.1, sway: 0 },
  { name: 'raider', className: 'enemy raider', hp: 1, points: 15, speed: 1.45, sway: 1.2 },
  { name: 'brute', className: 'enemy brute', hp: 2, points: 25, speed: 0.8, sway: 0.45 },
];

const soundSettings = {
  shoot: { frequency: 620, endFrequency: 980, duration: 0.07, type: 'square', gain: 0.045 },
  explosion: { frequency: 150, endFrequency: 45, duration: 0.22, type: 'sawtooth', gain: 0.085 },
  power: { frequency: 520, endFrequency: 900, duration: 0.16, type: 'triangle', gain: 0.07 },
  hit: { frequency: 110, endFrequency: 70, duration: 0.18, type: 'sawtooth', gain: 0.08 },
  bossShot: { frequency: 210, endFrequency: 130, duration: 0.11, type: 'square', gain: 0.045 },
  gameOver: { frequency: 260, endFrequency: 90, duration: 0.45, type: 'triangle', gain: 0.08 },
  boss: { frequency: 90, endFrequency: 210, duration: 0.5, type: 'sawtooth', gain: 0.075 },
  level: { frequency: 360, endFrequency: 720, duration: 0.18, type: 'triangle', gain: 0.06 },
};

let animationFrame;
let enemySpawnInterval;
let audioContext;
let bullets = [];
let bossBullets = [];
let enemies = [];
let powerUps = [];
let pressedKeys = new Set();
let score = 0;
let lives = 3;
let level = 1;
let shieldCharges = 0;
let doubleShotEndsAt = 0;
let highScore = loadHighScore();
let isRunning = false;
let isPaused = false;
let lastShotAt = 0;
let activeBossLevel = null;
let defeatedBossLevels = new Set();
let nextBossLevel = 5;
let isSoundEnabled = loadSoundSetting();
let selectedBackground = loadBackgroundSetting();
let selectedShip = loadShipSetting();

soundToggle.checked = isSoundEnabled;
backgroundSelect.value = selectedBackground;
shipSelect.value = selectedShip;
applyBackground(selectedBackground);
applyShip(selectedShip);

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function playSound(name) {
  if (!isSoundEnabled) {
    return;
  }

  const context = getAudioContext();
  const settings = soundSettings[name];

  if (!context || !settings) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(settings.endFrequency, now + settings.duration);
  gain.gain.setValueAtTime(settings.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + settings.duration);
}

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

function loadSoundSetting() {
  try {
    return localStorage.getItem('spaceInvadersSoundEnabled') !== 'false';
  } catch (error) {
    return true;
  }
}

function saveSoundSetting() {
  try {
    localStorage.setItem('spaceInvadersSoundEnabled', String(isSoundEnabled));
  } catch (error) {
    // Sound preference is optional; gameplay does not depend on storage.
  }
}

function loadBackgroundSetting() {
  try {
    return localStorage.getItem('spaceInvadersBackground') || 'red-nebula';
  } catch (error) {
    return 'red-nebula';
  }
}

function saveBackgroundSetting() {
  try {
    localStorage.setItem('spaceInvadersBackground', selectedBackground);
  } catch (error) {
    // Background preference is optional; the default still works.
  }
}

function applyBackground(backgroundName) {
  document.body.classList.remove('bg-red-nebula', 'bg-deep-space', 'bg-blue-rift', 'bg-violet-storm');
  document.body.classList.add('bg-' + backgroundName);
}

function loadShipSetting() {
  try {
    return localStorage.getItem('spaceInvadersShip') || 'classic';
  } catch (error) {
    return 'classic';
  }
}

function saveShipSetting() {
  try {
    localStorage.setItem('spaceInvadersShip', selectedShip);
  } catch (error) {
    // Ship preference is optional; the classic ship remains available.
  }
}

function applyShip(shipName) {
  player.classList.remove('ship-classic', 'ship-frost', 'ship-solar', 'ship-shadow');
  player.classList.add('ship-' + shipName);
}

function updateHud() {
  const hasDoubleShot = Date.now() < doubleShotEndsAt;
  const activePowers = [];

  if (shieldCharges > 0) {
    activePowers.push('Shield x' + shieldCharges);
  }

  if (hasDoubleShot) {
    activePowers.push('Double Shot');
  }

  scoreDisplay.textContent = 'Score: ' + score;
  livesDisplay.textContent = 'Lives: ' + lives;
  levelDisplay.textContent = 'Level: ' + level;
  highScoreDisplay.textContent = 'Best: ' + highScore;
  powerStatusDisplay.textContent = 'Power: ' + (activePowers.join(' + ') || 'None');
}

function pickEnemyType() {
  const roll = Math.random();

  if (level >= 3 && roll > 0.72) {
    return enemyTypes[2];
  }

  if (level >= 2 && roll > 0.5) {
    return enemyTypes[1];
  }

  return enemyTypes[0];
}

function createEnemy() {
  if (activeBossLevel !== null) {
    return;
  }

  const type = pickEnemyType();
  const enemy = document.createElement('div');
  enemy.className = type.className;
  enemy.dataset.hp = String(type.hp);
  enemy.dataset.points = String(type.points);
  enemy.dataset.speed = String(type.speed);
  enemy.dataset.sway = String(type.sway);
  enemy.dataset.drift = String(Math.random() > 0.5 ? 1 : -1);
  enemy.style.left = Math.random() * (window.innerWidth - 46) + 'px';
  enemy.style.top = '-46px';
  enemyContainer.appendChild(enemy);
  enemies.push(enemy);
}

function createBoss() {
  if (activeBossLevel !== null || defeatedBossLevels.has(nextBossLevel)) {
    return;
  }

  clearInterval(enemySpawnInterval);
  activeBossLevel = nextBossLevel;

  const boss = document.createElement('div');
  boss.className = 'enemy boss';
  boss.dataset.hp = String(14 + activeBossLevel * 2);
  boss.dataset.points = String(180 + activeBossLevel * 20);
  boss.dataset.speed = '0.35';
  boss.dataset.sway = '2.8';
  boss.dataset.drift = '1';
  boss.dataset.boss = 'true';
  boss.dataset.lastShotAt = String(Date.now());
  boss.style.left = window.innerWidth / 2 - 70 + 'px';
  boss.style.top = '-120px';
  enemyContainer.appendChild(boss);
  enemies.push(boss);
  closeInstructions();
  closeSettings();
  messageTitle.textContent = 'Boss Incoming';
  messageText.textContent = 'Focus fire and stay out of its path.';
  message.classList.add('notice');
  message.classList.remove('hidden');
  setTimeout(() => {
    if (isRunning && !isPaused) {
      message.classList.remove('notice');
      message.classList.add('hidden');
    }
  }, 1200);
  playSound('boss');
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  shieldCharges = 0;
  doubleShotEndsAt = 0;
  isPaused = false;
  activeBossLevel = null;
  defeatedBossLevels = new Set();
  nextBossLevel = 5;
  updateHud();

  bullets.forEach((bullet) => bullet.remove());
  bossBullets.forEach((bullet) => bullet.remove());
  enemies.forEach((enemy) => enemy.remove());
  powerUps.forEach((powerUp) => powerUp.remove());
  bullets = [];
  bossBullets = [];
  enemies = [];
  powerUps = [];
  pressedKeys.clear();
  player.classList.remove('shielded', 'hit');
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

function createBullet(leftOffset) {
  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  bullet.style.left = player.offsetLeft + player.offsetWidth / 2 + leftOffset - 2.5 + 'px';
  bullet.style.bottom = player.offsetHeight + 'px';
  bulletsContainer.appendChild(bullet);
  bullets.push(bullet);
  playSound('shoot');
}

function shoot() {
  const now = Date.now();
  if (!isRunning || isPaused || now - lastShotAt < 180) {
    return;
  }

  lastShotAt = now;

  if (now < doubleShotEndsAt) {
    createBullet(-12);
    createBullet(12);
  } else {
    createBullet(0);
  }
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
  playSound('explosion');
}

function maybeSpawnPowerUp(left, top) {
  if (Math.random() > 0.28) {
    return;
  }

  const type = Math.random() > 0.48 ? 'shield' : 'double';
  const powerUp = document.createElement('div');
  powerUp.className = 'power-up ' + type;
  powerUp.dataset.type = type;
  powerUp.textContent = type === 'shield' ? 'S' : '2x';
  powerUp.style.left = left;
  powerUp.style.top = top;
  enemyContainer.appendChild(powerUp);
  powerUps.push(powerUp);
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

function createBossBullet(boss, leftOffset) {
  const bullet = document.createElement('div');
  bullet.className = 'boss-bullet';
  bullet.style.left = boss.offsetLeft + boss.offsetWidth / 2 + leftOffset - 5 + 'px';
  bullet.style.top = boss.offsetTop + boss.offsetHeight - 4 + 'px';
  bulletsContainer.appendChild(bullet);
  bossBullets.push(bullet);
}

function getBossNumber() {
  return Math.max(1, Math.floor(activeBossLevel / 5));
}

function getBossShotDelay() {
  const bossNumber = getBossNumber();

  if (bossNumber < 2) {
    return null;
  }

  return Math.max(520, 1850 - (bossNumber - 2) * 180);
}

function updateBossShooting(enemy) {
  if (enemy.dataset.boss !== 'true') {
    return;
  }

  const shotDelay = getBossShotDelay();

  if (!shotDelay) {
    return;
  }

  const now = Date.now();
  const lastShotAt = Number(enemy.dataset.lastShotAt) || 0;

  if (now - lastShotAt < shotDelay) {
    return;
  }

  enemy.dataset.lastShotAt = String(now);

  if (getBossNumber() >= 4) {
    createBossBullet(enemy, -28);
    createBossBullet(enemy, 0);
    createBossBullet(enemy, 28);
  } else {
    createBossBullet(enemy, -16);
    createBossBullet(enemy, 16);
  }

  playSound('bossShot');
}

function updateBossBullets() {
  bossBullets = bossBullets.filter((bullet) => {
    const nextTop = parseInt(bullet.style.top || 0) + 7 + Math.min(4, getBossNumber());
    bullet.style.top = nextTop + 'px';

    if (isColliding(player.getBoundingClientRect(), bullet.getBoundingClientRect())) {
      bullet.remove();
      loseLife();
      return false;
    }

    if (nextTop > window.innerHeight) {
      bullet.remove();
      return false;
    }

    return true;
  });
}

function updateEnemies() {
  enemies = enemies.filter((enemy) => {
    const speed = Number(enemy.dataset.speed) * getEnemySpeed();
    const sway = Number(enemy.dataset.sway);
    const drift = Number(enemy.dataset.drift);
    const isBoss = enemy.dataset.boss === 'true';
    const currentTop = parseInt(enemy.style.top || 0);
    const nextTop = isBoss && currentTop > 56 ? currentTop : currentTop + speed;
    const nextLeft = parseFloat(enemy.style.left || 0) + sway * drift;
    const maxLeft = window.innerWidth - enemy.offsetWidth;

    enemy.style.top = nextTop + 'px';
    enemy.style.left = Math.min(Math.max(0, nextLeft), maxLeft) + 'px';
    updateBossShooting(enemy);

    if (nextLeft <= 0 || nextLeft >= maxLeft) {
      enemy.dataset.drift = String(drift * -1);
    }

    if (nextTop > window.innerHeight) {
      enemy.remove();
      return false;
    }

    if (isColliding(player.getBoundingClientRect(), enemy.getBoundingClientRect())) {
      if (isBoss) {
        activeBossLevel = null;
        nextBossLevel = Math.floor(level / 5) * 5 + 5;
        clearInterval(enemySpawnInterval);
        enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
      }
      enemy.remove();
      loseLife();
      return false;
    }

    return true;
  });
}

function updatePowerUps() {
  powerUps = powerUps.filter((powerUp) => {
    const nextTop = parseInt(powerUp.style.top || 0) + 3;
    powerUp.style.top = nextTop + 'px';

    if (isColliding(player.getBoundingClientRect(), powerUp.getBoundingClientRect())) {
      collectPowerUp(powerUp.dataset.type);
      powerUp.remove();
      return false;
    }

    if (nextTop > window.innerHeight) {
      powerUp.remove();
      return false;
    }

    return true;
  });
}

function collectPowerUp(type) {
  if (type === 'shield') {
    shieldCharges = Math.min(3, shieldCharges + 1);
    player.classList.add('shielded');
  }

  if (type === 'double') {
    doubleShotEndsAt = Date.now() + 9000;
  }

  updateHud();
  playSound('power');
}

function checkHits() {
  enemies.forEach((enemy) => {
    bullets.forEach((bullet) => {
      if (!enemy.isConnected || !bullet.isConnected) {
        return;
      }

      if (isColliding(bullet.getBoundingClientRect(), enemy.getBoundingClientRect())) {
        const nextHp = Number(enemy.dataset.hp) - 1;
        bullet.remove();

        if (nextHp > 0) {
          enemy.dataset.hp = String(nextHp);
          enemy.classList.add('damaged');
          setTimeout(() => enemy.classList.remove('damaged'), 120);
          return;
        }

        createExplosion(enemy.style.left, enemy.style.top);
        if (enemy.dataset.boss === 'true') {
          const defeatedBossLevel = activeBossLevel;
          defeatedBossLevels.add(defeatedBossLevel);
          maybeSpawnPowerUp(enemy.style.left, enemy.style.top);
          maybeSpawnPowerUp(parseFloat(enemy.style.left) + 54 + 'px', enemy.style.top);
          enemy.remove();
          updateScore(Number(enemy.dataset.points));
          activeBossLevel = null;
          nextBossLevel = Math.floor(level / 5) * 5 + 5;
          clearInterval(enemySpawnInterval);
          enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
          return;
        } else {
          maybeSpawnPowerUp(enemy.style.left, enemy.style.top);
        }
        enemy.remove();
        updateScore(Number(enemy.dataset.points));
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
  updateBossBullets();
  updateEnemies();
  updatePowerUps();
  checkHits();
  updateHud();
  animationFrame = requestAnimationFrame(gameLoop);
}

function startGame() {
  clearInterval(enemySpawnInterval);
  cancelAnimationFrame(animationFrame);
  resetGame();
  isRunning = true;
  messageTitle.textContent = 'Space Invaders';
  messageText.textContent = 'Use arrow keys to move, space to shoot, and P to pause.';
  startButton.textContent = 'Play';
  pauseButton.textContent = 'Pause';
  message.classList.remove('notice');
  closeInstructions();
  closeSettings();
  message.classList.add('hidden');
  enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
  animationFrame = requestAnimationFrame(gameLoop);
  playSound('level');
}

function endGame() {
  isRunning = false;
  isPaused = false;
  clearInterval(enemySpawnInterval);
  cancelAnimationFrame(animationFrame);
  messageTitle.textContent = 'Game Over';
  messageText.textContent = 'Score: ' + score + ' | Best: ' + highScore;
  startButton.textContent = 'Play Again';
  pauseButton.textContent = 'Pause';
  message.classList.remove('notice');
  message.classList.remove('hidden');
  playSound('gameOver');
}

function getEnemySpeed() {
  return 1.6 + level * 0.35;
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
  playSound('level');

  if (activeBossLevel !== null) {
    return;
  }

  clearInterval(enemySpawnInterval);

  if (level >= nextBossLevel) {
    createBoss();
    return;
  }

  enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
}

function loseLife() {
  if (!isRunning) {
    return;
  }

  if (shieldCharges > 0) {
    shieldCharges -= 1;
    if (shieldCharges === 0) {
      player.classList.remove('shielded');
    }
    updateHud();
    playSound('hit');
    return;
  }

  lives -= 1;
  updateHud();
  player.classList.add('hit');
  setTimeout(() => player.classList.remove('hit'), 400);
  playSound('hit');

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
    messageTitle.textContent = 'Paused';
    messageText.textContent = 'Press P or the pause button to keep playing.';
    startButton.textContent = 'Restart';
    pauseButton.textContent = 'Resume';
    message.classList.remove('notice');
    message.classList.remove('hidden');
    return;
  }

  message.classList.add('hidden');
  pauseButton.textContent = 'Pause';
  enemySpawnInterval = setInterval(createEnemy, getSpawnDelay());
  animationFrame = requestAnimationFrame(gameLoop);
}

function closeInstructions() {
  instructionsPanel.classList.add('hidden');
  instructionsButton.setAttribute('aria-expanded', 'false');
  instructionsButton.textContent = 'How to Play';
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
  settingsButton.setAttribute('aria-expanded', 'false');
}

function toggleSettings() {
  const isOpen = !settingsPanel.classList.contains('hidden');
  settingsPanel.classList.toggle('hidden', isOpen);
  settingsButton.setAttribute('aria-expanded', String(!isOpen));
}

function toggleInstructions() {
  const isOpen = !instructionsPanel.classList.contains('hidden');
  instructionsPanel.classList.toggle('hidden', isOpen);
  instructionsButton.setAttribute('aria-expanded', String(!isOpen));
  instructionsButton.textContent = isOpen ? 'How to Play' : 'Hide Instructions';
}

function exitToMenu() {
  isRunning = false;
  isPaused = false;
  clearInterval(enemySpawnInterval);
  cancelAnimationFrame(animationFrame);
  resetGame();
  closeInstructions();
  closeSettings();
  messageTitle.textContent = 'Space Invaders';
  messageText.textContent = 'Use arrow keys to move, space to shoot, and P to pause.';
  startButton.textContent = 'Play';
  pauseButton.textContent = 'Pause';
  message.classList.remove('notice');
  message.classList.remove('hidden');
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

  if (event.key) {
    pressedKeys.add(event.key);
  }
});

document.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.key);
});

touchButtons.forEach((button) => {
  const action = button.dataset.action;

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();

    if (action === 'shoot') {
      shoot();
      return;
    }

    pressedKeys.add(action === 'left' ? 'ArrowLeft' : 'ArrowRight');
  });

  button.addEventListener('pointerup', () => {
    pressedKeys.delete(action === 'left' ? 'ArrowLeft' : 'ArrowRight');
  });

  button.addEventListener('pointerleave', () => {
    pressedKeys.delete(action === 'left' ? 'ArrowLeft' : 'ArrowRight');
  });
});

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
instructionsButton.addEventListener('click', toggleInstructions);
settingsButton.addEventListener('click', toggleSettings);
soundToggle.addEventListener('change', () => {
  isSoundEnabled = soundToggle.checked;
  saveSoundSetting();
});
backgroundSelect.addEventListener('change', () => {
  selectedBackground = backgroundSelect.value;
  applyBackground(selectedBackground);
  saveBackgroundSetting();
});
shipSelect.addEventListener('change', () => {
  selectedShip = shipSelect.value;
  applyShip(selectedShip);
  saveShipSetting();
});
exitButton.addEventListener('click', exitToMenu);
updateHud();
