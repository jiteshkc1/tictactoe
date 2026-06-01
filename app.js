/**
 * टिक टैक ग्लो - मोबाइल के खिलाफ (बुजुर्गों के अनुकूल)
 * Senior-Friendly Hindi Engine with Animated Overlays & Career Sets
 */

// Game State Object
const state = {
    playerName: '',
    stats: {
        setsPlayed: 0,
        setsWonPlayer: 0,
        setsWonMobile: 0
    },
    
    // Series stats for the current 5-game set
    currentGameInSet: 1, // 1 to 5
    setScores: { player: 0, mobile: 0, ties: 0 },
    setRoundHistory: [], // Array tracking outcomes: 'player', 'mobile', 'tie'
    
    // Symbols & turn tracking for active game
    playerSymbol: 'X',
    mobileSymbol: 'O',
    currentPlayer: 'X',
    isGameOver: false,
    soundEnabled: true,
    difficulty: 'easy'
};

const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Web Audio API Sound System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (!state.soundEnabled) return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'win') {
            osc.type = 'triangle';
            const notes = [261.63, 329.63, 392.00, 523.25];
            gainNode.gain.setValueAtTime(0.18, now);
            gainNode.gain.linearRampToValueAtTime(0.18, now + 0.35);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            notes.forEach((freq, index) => {
                osc.frequency.setValueAtTime(freq, now + (index * 0.1));
            });
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (type === 'lose') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.linearRampToValueAtTime(140, now + 0.5);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'tie') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(200, now + 0.3);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.error(e);
    }
}

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const modalContainer = document.getElementById('modal-container');

const profileCreation = document.getElementById('profile-creation');
const profileDashboard = document.getElementById('profile-dashboard');
const playerNameInput = document.getElementById('player-name-input');
const btnSkipName = document.getElementById('btn-skip-name');
const welcomeBackMsg = document.getElementById('welcome-back-msg');
const statsPlayed = document.getElementById('stats-played');
const statsWon = document.getElementById('stats-won');
const btnChangeProfile = document.getElementById('btn-change-profile');

const btnStartGame = document.getElementById('btn-start-game');
const difficultyPickerScreen = document.getElementById('difficulty-picker-screen');
const btnBackToStart = document.getElementById('btn-back-to-start');

const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const gameStatusEl = document.getElementById('game-status');
const btnQuitGame = document.getElementById('btn-quit-game');
const btnToggleSound = document.getElementById('btn-toggle-sound');

const careerSetTracker = document.getElementById('career-set-tracker');
const careerSetsPlayer = document.getElementById('career-sets-player');
const careerSetsMobile = document.getElementById('career-sets-mobile');

const gameP1Name = document.getElementById('game-p1-name');
const scorePlayer = document.getElementById('score-player');
const scoreMobile = document.getElementById('score-mobile');
const currentGameNumber = document.getElementById('current-game-number');
const roundIndicatorsContainer = document.getElementById('round-indicators');

// Winner Overlays Elements
const gameWinnerOverlay = document.getElementById('game-winner-overlay');
const gameOverlayText = document.getElementById('game-overlay-text');

const setWinnerOverlay = document.getElementById('set-winner-overlay');
const setCelebrationIcon = document.getElementById('set-celebration-icon');
const setOverlayTitle = document.getElementById('set-overlay-title');
const setOverlayMessage = document.getElementById('set-overlay-message');
const overlayConfetti = document.getElementById('overlay-confetti');

const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalSetSummary = document.getElementById('modal-set-summary');
const btnModalYes = document.getElementById('btn-modal-yes');
const btnModalNo = document.getElementById('btn-modal-no');

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
    loadProfile();
});

// Event Triggers
btnStartGame.addEventListener('click', transitionToDifficultyPicker);
btnBackToStart.addEventListener('click', backToStartScreen);
btnSkipName.addEventListener('click', () => {
    playerNameInput.value = 'खिलाड़ी जी';
    transitionToDifficultyPicker();
});

btnChangeProfile.addEventListener('click', handleProfileReset);
btnQuitGame.addEventListener('click', quitToMainMenu);
btnModalYes.addEventListener('click', startNewSet);
btnModalNo.addEventListener('click', () => {
    modalContainer.classList.add('hidden');
    quitToMainMenu();
});

btnToggleSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    const icon = btnToggleSound.querySelector('i');
    if (state.soundEnabled) {
        icon.className = 'fa-solid fa-volume-high';
    } else {
        icon.className = 'fa-solid fa-volume-xmark';
    }
});

// Difficulty Picker Selectors
document.querySelectorAll('.difficulty-options .btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn');
        state.difficulty = targetBtn.getAttribute('data-diff');
        launchGameSet();
    });
});

cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        handlePlayerMove(index);
    });
});

// Profile Managers
function loadProfile() {
    const savedName = localStorage.getItem('glow_player_name');
    const savedSetsPlayed = parseInt(localStorage.getItem('glow_career_sets_played') || '0');
    const savedSetsWon = parseInt(localStorage.getItem('glow_career_sets_won_player') || '0');
    const savedSetsWonMobile = parseInt(localStorage.getItem('glow_career_sets_won_mobile') || '0');

    state.stats.setsPlayed = savedSetsPlayed;
    state.stats.setsWonPlayer = savedSetsWon;
    state.stats.setsWonMobile = savedSetsWonMobile;

    if (savedName) {
        state.playerName = savedName;
        profileCreation.classList.add('hidden');
        profileDashboard.classList.remove('hidden');
        welcomeBackMsg.textContent = `नमस्ते, ${savedName}!`;
        statsPlayed.textContent = savedSetsPlayed;
        statsWon.textContent = savedSetsWon;
        playerNameInput.value = savedName;
    } else {
        profileCreation.classList.remove('hidden');
        profileDashboard.classList.add('hidden');
    }
}

function saveProfile() {
    localStorage.setItem('glow_player_name', state.playerName);
    localStorage.setItem('glow_career_sets_played', state.stats.setsPlayed);
    localStorage.setItem('glow_career_sets_won_player', state.stats.setsWonPlayer);
    localStorage.setItem('glow_career_sets_won_mobile', state.stats.setsWonMobile);
}

function handleProfileReset() {
    state.playerName = '';
    localStorage.removeItem('glow_player_name');
    loadProfile();
}

// Navigation Flows
function transitionToDifficultyPicker() {
    if (!state.playerName) {
        const inputName = playerNameInput.value.trim();
        if (!inputName) {
            alert('कृपया आगे बढ़ने के लिए अपना नाम लिखें जी।');
            return;
        }
        state.playerName = inputName;
        saveProfile();
    }
    
    profileCreation.classList.add('hidden');
    profileDashboard.classList.add('hidden');
    btnStartGame.classList.add('hidden');
    difficultyPickerScreen.classList.remove('hidden');
}

function backToStartScreen() {
    difficultyPickerScreen.classList.add('hidden');
    btnStartGame.classList.remove('hidden');
    loadProfile();
}

function launchGameSet() {
    state.currentGameInSet = 1;
    state.setScores = { player: 0, mobile: 0, ties: 0 };
    state.setRoundHistory = [];

    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    modalContainer.classList.add('hidden');
    gameWinnerOverlay.classList.add('hidden');
    setWinnerOverlay.classList.add('hidden');
    
    gameP1Name.textContent = state.playerName;
    
    updateSetScoreboards();
    startNewGameRound();
}

function startNewSet() {
    modalContainer.classList.add('hidden');
    launchGameSet();
}

// Gameplay Round controller
function startNewGameRound() {
    state.board = Array(9).fill('');
    state.isGameOver = false;

    // Hide overlays
    gameWinnerOverlay.classList.add('hidden');

    // Alternate starting player (Game 1, 3, 5 -> Player first; Game 2, 4 -> Mobile first)
    const isPlayerFirst = (state.currentGameInSet % 2 !== 0);
    // Player is ALWAYS 'X', Mobile is ALWAYS 'O'
    state.playerSymbol = 'X';
    state.mobileSymbol = 'O';

    if (isPlayerFirst) {
        state.currentPlayer = 'X'; // Player starts
    } else {
        state.currentPlayer = 'O'; // Mobile starts
    }

    cells.forEach(cell => {
        cell.className = 'cell';
        cell.textContent = '';
    });

    updateTurnStatus();
    updateRoundIndicators();
    updateSetScoreboards();

    // Mobile move triggered if mobile starts
    if (state.currentPlayer === state.mobileSymbol) {
        setTimeout(makeMobileMove, 1000);
    }
}

function updateTurnStatus() {
    if (state.isGameOver) return;
    
    const isPlayerTurn = (state.currentPlayer === state.playerSymbol);
    if (isPlayerTurn) {
        gameStatusEl.textContent = `आपकी बारी (${state.playerSymbol}) जी`;
        gameStatusEl.className = 'game-status turn-p1';
    } else {
        gameStatusEl.textContent = 'मोबाइल की बारी है जी...';
        gameStatusEl.className = 'game-status turn-p2';
    }
}

function updateSetScoreboards() {
    scorePlayer.textContent = state.setScores.player;
    scoreMobile.textContent = state.setScores.mobile;
    currentGameNumber.textContent = `${state.currentGameInSet} / 5`;

    careerSetsPlayer.textContent = state.stats.setsWonPlayer;
    careerSetsMobile.textContent = state.stats.setsWonMobile;
    
    if (state.stats.setsPlayed === 0) {
        careerSetTracker.classList.add('hidden');
    } else {
        careerSetTracker.classList.remove('hidden');
    }
}

function updateRoundIndicators() {
    const dots = roundIndicatorsContainer.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        const roundNum = index + 1;
        dot.className = 'dot';
        
        if (roundNum === state.currentGameInSet) {
            dot.classList.add('active-round');
        }
        
        const outcome = state.setRoundHistory[index];
        if (outcome === 'player') {
            dot.classList.add('win-p1');
        } else if (outcome === 'mobile') {
            dot.classList.add('win-p2');
        } else if (outcome === 'tie') {
            dot.classList.add('tie');
        }
    });
}

function handlePlayerMove(index) {
    if (state.isGameOver || state.board[index] !== '') return;
    
    if (state.currentPlayer !== state.playerSymbol) {
        playSound('error');
        return;
    }

    executeGameMove(index, state.playerSymbol);

    if (!state.isGameOver) {
        setTimeout(makeMobileMove, 1000);
    }
}

function executeGameMove(index, symbol) {
    state.board[index] = symbol;
    
    const cell = cells[index];
    cell.textContent = symbol;
    cell.classList.add(symbol === 'X' ? 'x-cell' : 'o-cell');
    
    playSound('move');

    if (checkWin(symbol)) {
        handleGameEnd(symbol === state.playerSymbol ? 'player' : 'mobile');
    } else if (state.board.every(c => c !== '')) {
        handleGameEnd('tie');
    } else {
        state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
        updateTurnStatus();
    }
}

function checkWin(symbol) {
    return WINNING_COMBOS.some(combo => {
        if (combo.every(index => state.board[index] === symbol)) {
            if (!state.isGameOver) {
                combo.forEach(idx => cells[idx].classList.add('winning-cell'));
            }
            return true;
        }
        return false;
    });
}

// Game win overlays (Round completes)
function handleGameEnd(winner) {
    state.isGameOver = true;
    state.setRoundHistory.push(winner);

    let overlayText = '';
    let overlayClass = '';
    
    if (winner === 'player') {
        state.setScores.player++;
        playSound('win');
        gameStatusEl.textContent = 'आप जीत गए जी!';
        gameStatusEl.className = 'game-status turn-p1';
        overlayText = 'आप जीत गए जी! 🎉';
        overlayClass = 'overlay-win-p1';
    } else if (winner === 'mobile') {
        state.setScores.mobile++;
        playSound('lose');
        gameStatusEl.textContent = 'मोबाइल जीत गया जी!';
        gameStatusEl.className = 'game-status turn-p2';
        overlayText = 'मोबाइल जीत गया जी!';
        overlayClass = 'overlay-win-p2';
    } else {
        state.setScores.ties++;
        playSound('tie');
        gameStatusEl.textContent = 'गेम ड्रॉ रहा जी!';
        gameStatusEl.className = 'game-status';
        overlayText = 'गेम ड्रॉ रहा जी!';
        overlayClass = 'overlay-tie';
    }

    updateSetScoreboards();
    updateRoundIndicators();

    // Trigger Game Winner Overlay Banner
    gameOverlayText.textContent = overlayText;
    gameWinnerOverlay.className = 'game-overlay-banner ' + overlayClass;
    gameWinnerOverlay.classList.remove('hidden');

    // Auto-advance after 2 seconds
    setTimeout(() => {
        gameWinnerOverlay.classList.add('hidden');
        if (state.currentGameInSet < 5) {
            state.currentGameInSet++;
            startNewGameRound();
        } else {
            handleSetCompleted();
        }
    }, 2000);
}

// Set celebration overlays (Set completes)
function handleSetCompleted() {
    state.stats.setsPlayed++;
    
    let setWinner = '';
    let titleText = '';
    let messageText = '';
    let icon = '';
    let iconClass = '';
    
    if (state.setScores.player > state.setScores.mobile) {
        setWinner = 'player';
        state.stats.setsWonPlayer++;
        titleText = 'शानदार जीत! 🏆';
        messageText = `बधाई हो जी! आपने मोबाइल को हराकर सेट जीत लिया है!`;
        icon = '🏆';
        iconClass = 'set-icon-spin';
        triggerOverlayConfetti();
    } else if (state.setScores.mobile > state.setScores.player) {
        setWinner = 'mobile';
        state.stats.setsWonMobile++;
        titleText = 'सेट समाप्त!';
        messageText = 'यह सेट मोबाइल जी ने जीत लिया है। फिर कोशिश करें!';
        icon = '📱';
        iconClass = 'set-icon-shake';
    } else {
        setWinner = 'tie';
        titleText = 'कड़ा मुकाबला!';
        messageText = 'यह पूरा सेट ड्रॉ रहा जी! दोनों ने शानदार खेल दिखाया!';
        icon = '🤝';
        iconClass = 'set-icon-spin';
    }

    saveProfile();
    updateSetScoreboards();

    // Render Set Celebration Overlay
    setCelebrationIcon.textContent = icon;
    setCelebrationIcon.className = 'set-icon-container ' + iconClass;
    setOverlayTitle.textContent = titleText;
    setOverlayMessage.textContent = messageText;
    
    setWinnerOverlay.classList.remove('hidden');

    // Transition to set-restart modal prompt after 3.5 seconds
    setTimeout(() => {
        setWinnerOverlay.classList.add('hidden');
        modalTitle.textContent = setWinner === 'player' ? 'बधाई हो जी!' : 'सेट समाप्त जी';
        modalMessage.textContent = 'क्या आप मोबाइल के साथ एक और सेट खेलना चाहते हैं जी?';
        modalSetSummary.textContent = `कुल स्कोर: आप ${state.stats.setsWonPlayer} - ${state.stats.setsWonMobile} मोबाइल`;
        modalContainer.classList.remove('hidden');
    }, 3500);
}

// Confetti Particle System for Set Victory
function triggerOverlayConfetti() {
    overlayConfetti.innerHTML = '';
    const colors = ['#4cc9f0', '#f72585', '#ffb703', '#4caf50'];
    
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = Math.random() * 100 + '%';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = Math.random() * 2 + 's';
        p.style.animationDuration = Math.random() * 1.5 + 1.5 + 's';
        
        const size = Math.random() * 8 + 6;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        
        overlayConfetti.appendChild(p);
    }
}

function quitToMainMenu() {
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    modalContainer.classList.add('hidden');
    gameWinnerOverlay.classList.add('hidden');
    setWinnerOverlay.classList.add('hidden');
    
    difficultyPickerScreen.classList.add('hidden');
    btnStartGame.classList.remove('hidden');
    loadProfile();
}

// --- MOBILE (AI) DECISION MAKING ---

function makeMobileMove() {
    if (state.isGameOver) return;
    
    let move;
    const probability = Math.random();
    
    if (state.difficulty === 'easy') {
        move = getEasyMove();
    } else if (state.difficulty === 'medium') {
        move = probability < 0.60 ? getBeatableMove() : getEasyMove();
    } else {
        move = probability < 0.85 ? getBeatableMove() : getEasyMove();
    }
    
    if (move !== undefined && move !== -1) {
        executeGameMove(move, state.mobileSymbol);
    }
}

function getEasyMove() {
    const emptyCells = [];
    state.board.forEach((val, idx) => {
        if (val === '') emptyCells.push(idx);
    });
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getBeatableMove() {
    let bestVal = -Infinity;
    let bestMove = -1;
    
    for (let i = 0; i < 9; i++) {
        if (state.board[i] === '') {
            state.board[i] = state.mobileSymbol;
            let moveVal = minimax(state.board, 0, false);
            state.board[i] = '';
            if (moveVal > bestVal) {
                bestVal = moveVal;
                bestMove = i;
            }
        }
    }
    return bestMove;
}

function minimax(board, depth, isMax) {
    if (checkWin(state.mobileSymbol)) return 10 - depth;
    if (checkWin(state.playerSymbol)) return depth - 10;
    if (board.every(cell => cell !== '')) return 0;

    if (isMax) {
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = state.mobileSymbol;
                best = Math.max(best, minimax(board, depth + 1, false));
                board[i] = '';
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = state.playerSymbol;
                best = Math.min(best, minimax(board, depth + 1, true));
                board[i] = '';
            }
        }
        return best;
    }
}
