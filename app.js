/**
 * टिक टैक ग्लो - मोबाइल के खिलाफ
 * Core Hindi Gameplay Engine with TTS and Stats Persistence
 */

// Game State Object
const state = {
    playerName: '',
    stats: {
        played: 0,
        won: 0
    },
    gamesInSession: 0, // Used to alternate starting player
    difficulty: 'easy', // 'easy', 'medium', 'hard'
    board: Array(9).fill(''),
    
    // Symbols for current round
    playerSymbol: 'X',
    mobileSymbol: 'O',
    startingSymbol: 'X', // Whichever symbol goes first ('X')
    currentPlayer: 'X',  // Tracks current turn symbol ('X' or 'O')
    
    sessionScores: { player: 0, mobile: 0 },
    isGameOver: false,
    soundEnabled: true
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
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'win') {
            osc.type = 'triangle';
            const notes = [261.63, 329.63, 392.00, 523.25];
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            notes.forEach((freq, index) => {
                osc.frequency.setValueAtTime(freq, now + (index * 0.08));
            });
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'lose') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.4);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'tie') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(330, now);
            osc.frequency.linearRampToValueAtTime(220, now + 0.25);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) {
        console.error(e);
    }
}

// Text-to-Speech Engine (Hindi)
function speakHindi(text, callback) {
    if (!state.soundEnabled) {
        if (callback) setTimeout(callback, 2000);
        return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95; // Slightly slower for clarity
    
    // Try to find a native Hindi voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(voice => voice.lang.includes('hi') || voice.lang.includes('IN'));
    if (hindiVoice) {
        utterance.voice = hindiVoice;
    }

    let callbackCalled = false;
    utterance.onend = () => {
        if (!callbackCalled) {
            callbackCalled = true;
            if (callback) callback();
        }
    };

    utterance.onerror = () => {
        if (!callbackCalled) {
            callbackCalled = true;
            if (callback) callback();
        }
    };

    window.speechSynthesis.speak(utterance);

    // Fallback: If TTS speech API freezes or fails to trigger onend
    setTimeout(() => {
        if (!callbackCalled) {
            callbackCalled = true;
            if (callback) callback();
        }
    }, 4000);
}

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const modalContainer = document.getElementById('modal-container');

const profileCreation = document.getElementById('profile-creation');
const profileDashboard = document.getElementById('profile-dashboard');
const playerNameInput = document.getElementById('player-name-input');
const welcomeBackMsg = document.getElementById('welcome-back-msg');
const statsPlayed = document.getElementById('stats-played');
const statsWon = document.getElementById('stats-won');
const btnChangeProfile = document.getElementById('btn-change-profile');

const btnStartGame = document.getElementById('btn-start-game');
const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const gameStatusEl = document.getElementById('game-status');
const btnQuitGame = document.getElementById('btn-quit-game');
const btnToggleSound = document.getElementById('btn-toggle-sound');

const gameP1Name = document.getElementById('game-p1-name');
const scorePlayer = document.getElementById('score-player');
const scoreMobile = document.getElementById('score-mobile');

const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const btnModalYes = document.getElementById('btn-modal-yes');
const btnModalNo = document.getElementById('btn-modal-no');

// Initial Load Handler
window.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    
    // Trigger getVoices load (some browsers load voices asynchronously)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
});

// Event Listeners
btnStartGame.addEventListener('click', handleStartClick);
btnChangeProfile.addEventListener('click', handleProfileChange);
btnQuitGame.addEventListener('click', quitToMainMenu);
btnModalYes.addEventListener('click', startNewGameRound);
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

// Difficulty Picker Event Listeners
document.querySelectorAll('.difficulty-buttons .btn-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.difficulty-buttons .btn-sm').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.difficulty = e.target.getAttribute('data-diff');
    });
});

cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        handlePlayerMove(index);
    });
});

// Profile Management
function loadProfile() {
    const savedName = localStorage.getItem('glow_player_name');
    const savedPlayed = parseInt(localStorage.getItem('glow_stats_played') || '0');
    const savedWon = parseInt(localStorage.getItem('glow_stats_won') || '0');

    if (savedName) {
        state.playerName = savedName;
        state.stats.played = savedPlayed;
        state.stats.won = savedWon;
        
        // Show Dashboard
        profileCreation.classList.add('hidden');
        profileDashboard.classList.remove('hidden');
        welcomeBackMsg.textContent = `नमस्ते, ${savedName}!`;
        statsPlayed.textContent = savedPlayed;
        statsWon.textContent = savedWon;
        playerNameInput.value = savedName;
    } else {
        // Show Creation Input
        profileCreation.classList.remove('hidden');
        profileDashboard.classList.add('hidden');
    }
}

function handleStartClick() {
    // If first time, grab name
    if (!state.playerName) {
        const nameVal = playerNameInput.value.trim();
        if (!nameVal) {
            alert('कृपया आगे बढ़ने के लिए अपना नाम लिखें।');
            return;
        }
        state.playerName = nameVal;
        state.stats.played = 0;
        state.stats.won = 0;
        saveProfile();
    }
    
    // Start game session
    state.gamesInSession = 0;
    state.sessionScores = { player: 0, mobile: 0 };
    
    // Setup UI and launch
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    modalContainer.classList.add('hidden');
    
    gameP1Name.textContent = state.playerName;
    scorePlayer.textContent = '0';
    scoreMobile.textContent = '0';
    
    startNewGameRound();
}

function handleProfileChange() {
    state.playerName = '';
    localStorage.removeItem('glow_player_name');
    loadProfile();
}

function saveProfile() {
    localStorage.setItem('glow_player_name', state.playerName);
    localStorage.setItem('glow_stats_played', state.stats.played);
    localStorage.setItem('glow_stats_won', state.stats.won);
}

// Gameplay Loop
function startNewGameRound() {
    modalContainer.classList.add('hidden');
    state.board = Array(9).fill('');
    state.isGameOver = false;
    
    // Alternate starting player
    // Even games (0, 2, 4...) -> Player starts first (Player is 'X', Mobile is 'O')
    // Odd games (1, 3, 5...) -> Mobile starts first (Mobile is 'X', Player is 'O')
    if (state.gamesInSession % 2 === 0) {
        state.playerSymbol = 'X';
        state.mobileSymbol = 'O';
        state.currentPlayer = 'X'; // Player starts
    } else {
        state.playerSymbol = 'O';
        state.mobileSymbol = 'X';
        state.currentPlayer = 'X'; // Mobile starts
    }
    
    // Clear Board GUI
    cells.forEach(cell => {
        cell.className = 'cell';
        cell.textContent = '';
    });
    
    updateTurnStatus();
    
    // If Mobile starts first ('X'), trigger Mobile's move after 1 second delay
    if (state.currentPlayer === state.mobileSymbol) {
        setTimeout(makeMobileMove, 1000);
    }
}

function updateTurnStatus() {
    if (state.isGameOver) return;
    
    const isPlayerTurn = (state.currentPlayer === state.playerSymbol);
    if (isPlayerTurn) {
        gameStatusEl.textContent = 'आपकी बारी (X)';
        gameStatusEl.className = 'game-status turn-p1';
    } else {
        gameStatusEl.textContent = 'मोबाइल की बारी...';
        gameStatusEl.className = 'game-status turn-p2';
    }
}

function handlePlayerMove(index) {
    if (state.isGameOver || state.board[index] !== '') return;
    
    // Verify it is Player's turn
    if (state.currentPlayer !== state.playerSymbol) {
        playSound('error');
        return;
    }
    
    executeMove(index, state.playerSymbol);
    
    if (!state.isGameOver) {
        // Shift turn to Mobile and trigger Mobile's move after 1 second
        setTimeout(makeMobileMove, 1000);
    }
}

function executeMove(index, symbol) {
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

function handleGameEnd(winner) {
    state.isGameOver = true;
    state.gamesInSession++;
    state.stats.played++;
    
    let announcementText = '';
    
    if (winner === 'player') {
        state.sessionScores.player++;
        state.stats.won++;
        scorePlayer.textContent = state.sessionScores.player;
        playSound('win');
        
        gameStatusEl.textContent = 'आप जीत गए!';
        gameStatusEl.className = 'game-status turn-p1';
        announcementText = `बधाई हो ${state.playerName}! आप जीत गए!`;
    } else if (winner === 'mobile') {
        state.sessionScores.mobile++;
        scoreMobile.textContent = state.sessionScores.mobile;
        playSound('lose');
        
        gameStatusEl.textContent = 'मोबाइल जीत गया!';
        gameStatusEl.className = 'game-status turn-p2';
        announcementText = `मोबाइल जीत गया। बेहतर किस्मत अगली बार।`;
    } else {
        playSound('tie');
        
        gameStatusEl.textContent = 'मैच ड्रॉ रहा!';
        gameStatusEl.className = 'game-status';
        announcementText = `यह मैच ड्रॉ रहा!`;
    }
    
    saveProfile();
    
    // Announce result via Text-to-Speech, then trigger the play again modal
    setTimeout(() => {
        speakHindi(announcementText, () => {
            // Show the modal
            modalTitle.textContent = winner === 'player' ? 'बधाई हो!' : 'मैच समाप्त';
            modalMessage.textContent = 'क्या आप एक और मैच खेलना चाहते हैं?';
            modalContainer.classList.remove('hidden');
        });
    }, 600);
}

function quitToMainMenu() {
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    modalContainer.classList.add('hidden');
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
        // Medium: 60% standard minimax, 40% random
        move = probability < 0.60 ? getBeatableMove() : getEasyMove();
    } else {
        // Hard (but not unbeatable): 85% standard minimax, 15% random
        move = probability < 0.85 ? getBeatableMove() : getEasyMove();
    }
    
    if (move !== undefined && move !== -1) {
        executeMove(move, state.mobileSymbol);
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
    // Calculates minimax best move
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
