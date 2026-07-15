// --- КОНФІГУРАЦІЯ ГРИ ---
const GAME_CONFIG = {
  totalLevels: 4,          // Кількість вузлів для повної перемоги
  baseTime: 25,            // Базовий час на рівень (у секундах)
  gridSize: 16,            // Розмірність сітки (4x4 = 16 елементів)
  keyLength: 4,            // Довжина зашифрованого ключа-відгадки
  symbols: ["Δ", "Ω", "Ψ", "Φ", "Ξ", "Λ", "Σ", "A9", "F2", "0C", "7B", "D4", "E1", "88", "XY", "Z9"], // Набір символів
  timePenalty: 5           // Штраф за помилку (в секундах)
};

// --- ІГРОВИЙ СТАН ---
let gameState = {
  currentLevel: 0,
  score: 0,
  timeLeft: 0,
  targetKey: [],           // Поточний згенерований ключ
  solvedIndex: 0,          // Індекс символу в ключі, який гравець має відгадати наступним
  timerInterval: null
};

// --- ЕЛЕМЕНТИ DOM ---
const startScreen = document.getElementById('start-screen');
const winScreen = document.getElementById('win-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartWinBtn = document.getElementById('restart-win-btn');
const restartFailBtn = document.getElementById('restart-fail-btn');

const nodeProgressText = document.getElementById('node-progress');
const timerDisplay = document.getElementById('timer-display');
const progressBarFill = document.getElementById('progress-bar-fill');
const targetKeyDisplay = document.getElementById('target-key-display');
const nodeGrid = document.getElementById('node-grid');
const consoleLogs = document.getElementById('console-logs');
const finalScoreDisplay = document.getElementById('final-score');

// --- НАЛАШТУВАННЯ МАТРИЧНОГО ДОЩУ ---
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

let cols = 0;
let yPositions = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.floor(canvas.width / 20) + 1;
  yPositions = Array(cols).fill(0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function matrixEffect() {
  ctx.fillStyle = 'rgba(5, 5, 10, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#00ff66';
  ctx.font = '15px monospace';
  
  yPositions.forEach((y, index) => {
    const text = String.fromCharCode(Math.floor(Math.random() * 128));
    const x = index * 20;
    ctx.fillText(text, x, y);
    
    if (y > 100 + Math.random() * 10000) {
      yPositions[index] = 0;
    } else {
      yPositions[index] = y + 20;
    }
  });
}
setInterval(matrixEffect, 50);


// --- ЛОГІКА ТЕРМІНАЛУ (ВИВІД ЛОГІВ) ---
function addConsoleLog(message, isError = false) {
  const line = document.createElement('p');
  line.className = 'console-line';
  if (isError) line.style.color = '#ff0055';
  line.innerText = `> ${message}`;
  consoleLogs.appendChild(line);
  consoleLogs.scrollTop = consoleLogs.scrollHeight; // Прокрутка консолі вниз
}


// --- ІНІЦІАЛІЗАЦІЯ ТА СТАРТ ГРИ ---
function startGame() {
  // Скидаємо стан
  gameState.currentLevel = 1;
  gameState.score = 0;
  gameState.timeLeft = GAME_CONFIG.baseTime;
  
  // Ховаємо модальні вікна
  startScreen.classList.remove('active');
  winScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');
  
  // Чистимо консоль
  consoleLogs.innerHTML = '';
  addConsoleLog('INITIALIZING BYPASS SEQUENCES...');
  
  // Запускаємо таймер та перший рівень
  startTimer();
  generateLevel();
}

// --- СТАРТ ТА ОНОВЛЕННЯ ТАЙМЕРА ---
function startTimer() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft -= 0.1;
    if (gameState.timeLeft <= 0) {
      gameState.timeLeft = 0;
      endGame(false); // Програш за часом
    }
    updateTimerUI();
  }, 100);
}

function updateTimerUI() {
  // Форматуємо до сотих часток
  timerDisplay.innerText = `${gameState.timeLeft.toFixed(1)}s`;
  
  // Визначаємо відсоток заповнення шкали часу
  const percentage = (gameState.timeLeft / GAME_CONFIG.baseTime) * 100;
  progressBarFill.style.width = `${Math.max(0, percentage)}%`;
  
  // Якщо залишилось мало часу - міняємо колір шкали
  if (gameState.timeLeft < 7) {
    progressBarFill.style.backgroundColor = '#ff0055';
    progressBarFill.style.boxShadow = '0 0 8px #ff0055';
  } else {
    progressBarFill.style.backgroundColor = '#00ff66';
    progressBarFill.style.boxShadow = '0 0 8px #00ff66';
  }
}


// --- ГЕНЕРАЦІЯ РІВНЯ ---
function generateLevel() {
  gameState.solvedIndex = 0;
  nodeProgressText.innerText = `${gameState.currentLevel - 1}/${GAME_CONFIG.totalLevels}`;
  addConsoleLog(`SECURING NODECONNECTION #${gameState.currentLevel}...`);
  
  // 1. Генерація цільового ключа
  gameState.targetKey = [];
  const shuffledSymbols = [...GAME_CONFIG.symbols].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < GAME_CONFIG.keyLength; i++) {
    gameState.targetKey.push(shuffledSymbols[i]);
  }
  
  // Рендеримо ключі у верхній панелі
  targetKeyDisplay.innerHTML = '';
  gameState.targetKey.forEach(symbol => {
    const charDiv = document.createElement('div');
    charDiv.className = 'key-char';
    charDiv.innerText = symbol;
    targetKeyDisplay.appendChild(charDiv);
  });

  // 2. Генерація сітки кнопок
  nodeGrid.innerHTML = '';
  
  // Створюємо масив для сітки, куди обов'язково кладемо символи з ключа
  let gridArray = [...gameState.targetKey];
  
  // Додаємо випадкові "сміттєві" символи для заповнення сітки
  const unusedSymbols = GAME_CONFIG.symbols.filter(s => !gameState.targetKey.includes(s));
  const remainingSize = GAME_CONFIG.gridSize - gridArray.length;
  
  const shuffledUnused = unusedSymbols.sort(() => 0.5 - Math.random());
  for (let i = 0; i < remainingSize; i++) {
    gridArray.push(shuffledUnused[i]);
  }
  
  // Перемішуємо елементи сітки
  gridArray.sort(() => 0.5 - Math.random());
  
  // Рендеримо кнопки у сітку HTML
  gridArray.forEach(symbol => {
    const btn = document.createElement('button');
    btn.className = 'grid-btn';
    btn.innerText = symbol;
    btn.addEventListener('click', () => handleNodeClick(btn, symbol));
    nodeGrid.appendChild(btn);
  });
  
  addConsoleLog('TARGET KEY GENERATED. ENTER THE DECRYPTION SEQUENCE.');
}


// --- ОБРОБКА КЛІКУ ПО ВУЗЛУ ---
function handleNodeClick(buttonElement, clickedSymbol) {
  // Якщо гра вже закінчена або вікна активні - блокуємо клік
  if (gameState.timeLeft <= 0 || startScreen.classList.contains('active')) return;
  
  const expectedSymbol = gameState.targetKey[gameState.solvedIndex];
  
  if (clickedSymbol === expectedSymbol) {
    // ВІРНИЙ КЛІК
    buttonElement.classList.add('success-flash');
    addConsoleLog(`DECRYPTED VALUE: [${clickedSymbol}] - SUCCESS`);
    
    // Підсвічуємо розгаданий символ у верхньому ключі
    const keyDOMElements = targetKeyDisplay.querySelectorAll('.key-char');
    keyDOMElements[gameState.solvedIndex].classList.add('solved');
    
    gameState.solvedIndex++;
    gameState.score += 50; // Бонусні очки за клік
    
    // Перевіряємо, чи розгадано весь ключ
    if (gameState.solvedIndex === GAME_CONFIG.keyLength) {
      handleLevelComplete();
    }
  } else {
    // НЕВІРНИЙ КЛІК
    buttonElement.classList.add('error-flash');
    
    // Штрафуємо за часом
    gameState.timeLeft = Math.max(0, gameState.timeLeft - GAME_CONFIG.timePenalty);
    addConsoleLog(`ERROR! INVALID SIGNATURE DETECTED. TIME SHIELD PENALTY -${GAME_CONFIG.timePenalty}s`, true);
    
    // Скидаємо прогрес розгадування поточного ключа
    gameState.solvedIndex = 0;
    const keyDOMElements = targetKeyDisplay.querySelectorAll('.key-char');
    keyDOMElements.forEach(el => el.classList.remove('solved'));
    
    // Візуальний відгук для помилки на кнопці
    setTimeout(() => {
      buttonElement.classList.remove('error-flash');
    }, 200);
  }
}


// --- ЗАВЕРШЕННЯ РІВНЯ ТА КІНЕЦЬ ГРИ ---
function handleLevelComplete() {
  clearInterval(gameState.timerInterval);
  
  addConsoleLog(`NODE #${gameState.currentLevel} BYPASSED SUCCESSFULLY!`, false);
  gameState.score += Math.floor(gameState.timeLeft * 10); // Очки за залишок часу
  
  // Додаємо трішки часу в якості бонусу за розгадування вузла
  gameState.timeLeft = Math.min(GAME_CONFIG.baseTime, gameState.timeLeft + 8);
  
  if (gameState.currentLevel < GAME_CONFIG.totalLevels) {
    gameState.currentLevel++;
    // Невелика затримка перед наступним рівнем, щоб гравець побачив успіх
    setTimeout(() => {
      generateLevel();
      startTimer();
    }, 1000);
  } else {
    // Повна перемога
    setTimeout(() => {
      endGame(true);
    }, 1000);
  }
}

function endGame(isVictory) {
  clearInterval(gameState.timerInterval);
  
  if (isVictory) {
    addConsoleLog('ACCESS STATUS: GRANTED. CORE ENCRYPTED.');
    finalScoreDisplay.innerText = gameState.score;
    winScreen.classList.add('active');
  } else {
    addConsoleLog('ACCESS STATUS: CONNECTION TERMINATED. LOCKDOWN.', true);
    gameOverScreen.classList.add('active');
  }
}


// --- ОБРОБНИКИ ПОДІЙ ДЛЯ КНОПОК ---
startBtn.addEventListener('click', startGame);
restartWinBtn.addEventListener('click', startGame);
restartFailBtn.addEventListener('click', startGame);
