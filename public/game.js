/**
 * game.js
 * Game state machine — Red Light, Green Light
 * States: IDLE → COUNTDOWN → GREEN → RED → WIN | LOSE
 */

const Game = (() => {

  // ── Difficulty presets ────────────────────────────────────────────────────────
  const DIFFICULTY = {
    easy:   { lives: 5, rounds: 5,  greenMs: 6000, redMs: 5000, threshold: 25 },
    medium: { lives: 3, rounds: 7,  greenMs: 4500, redMs: 4000, threshold: 18 },
    hard:   { lives: 1, rounds: 10, greenMs: 3000, redMs: 3000, threshold: 12 },
  };

  // Daruma speech per state, per language
  const DOLL_SPEECH = {
    en: { green: 'Go go go! 🏃', red: "Don't move! 👁️", caught: 'You moved!! 😡', safe: 'Lucky... 😤', win: 'You beat me! 🎉', lose: 'Got you! 😈' },
    ja: { green: '進め！🏃',      red: '動くな！👁️',      caught: '動いた！！😡',     safe: 'ラッキー... 😤', win: '負けた！🎉',   lose: 'やった！😈' },
    hi: { green: 'जाओ! 🏃',      red: 'मत हिलो! 👁️',   caught: 'हिले!! 😡',       safe: 'बचे... 😤',    win: 'जीत गए! 🎉', lose: 'पकड़ा! 😈' },
    ta: { green: 'போ! 🏃',       red: 'அசையாதே! 👁️',  caught: 'அசைந்தாய்!! 😡',  safe: 'தப்பித்தாய்... 😤', win: 'வெற்றி! 🎉', lose: 'பிடித்தேன்! 😈' },
  };

  // ── State ─────────────────────────────────────────────────────────────────────
  let state      = 'IDLE';
  let difficulty = 'easy';
  let lang       = 'en';
  let config     = DIFFICULTY.easy;
  let lives      = 0;
  let score      = 0;
  let round      = 0;
  let playerName = '';
  let isCaught   = false;

  let phaseTimer    = null;   // setTimeout for phase transition
  let timerInterval = null;   // setInterval for HUD countdown
  let phaseStart    = 0;      // timestamp when current phase began

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clearPhaseTimer() { if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; } }
  function clearTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

  function speech(key) { return DOLL_SPEECH[lang]?.[key] || DOLL_SPEECH.en[key] || ''; }

  // ── Phase timer tick (updates HUD ring) ──────────────────────────────────────
  function startTimerTick(totalMs, phase) {
    clearTimerInterval();
    phaseStart = Date.now();

    timerInterval = setInterval(() => {
      const elapsed = Date.now() - phaseStart;
      const left    = Math.max(0, (totalMs - elapsed) / 1000);
      UI.updateTimer(left, totalMs / 1000, phase);
      if (left <= 0) clearTimerInterval();
    }, 100);
  }

  // ── Start ─────────────────────────────────────────────────────────────────────
  async function start(diff, language, name) {
    difficulty = diff    || 'easy';
    lang       = language || 'en';
    playerName = (name || 'Player').trim() || 'Player';
    config     = DIFFICULTY[difficulty];
    lives      = config.lives;
    score      = 0;
    round      = 0;
    isCaught   = false;

    Audio.setLang(lang);
    Detector.setThreshold(config.threshold);
    Detector.setOnCaught(onPlayerCaught);
    Detector.setOnMovementLevel(onMovementLevel);

    UI.showScreen('game');
    UI.updateLives(lives, config.lives);
    UI.updateScore(score);
    UI.updateRound(0, config.rounds);
    UI.resetTimer();
    UI.setDarumaState('idle');
    UI.setLight('none');
    UI.setStatus('Loading camera & AI... 📷', 'neutral');

    try {
      await Detector.init(
        document.getElementById('webcam'),
        document.getElementById('pose-canvas')
      );
    } catch (err) {
      alert('Camera error: ' + err.message);
      UI.showScreen('start');
      return;
    }

    startCountdown();
  }

  // ── Countdown ─────────────────────────────────────────────────────────────────
  function startCountdown() {
    state = 'COUNTDOWN';
    UI.setStatus('Get ready...', 'neutral');
    UI.setDarumaState('idle');
    UI.setLight('none');
    UI.resetTimer();

    let count = 3;
    UI.showCountdown(count);
    Audio.playBeep('mid');
    Audio.speakCountdown(0);  // index 0 = "3"

    const tick = () => {
      count--;
      if (count > 0) {
        UI.showCountdown(count);
        Audio.playBeep('mid');
        Audio.speakCountdown(3 - count);   // index 1="2", 2="1"
        phaseTimer = setTimeout(tick, 900);
      } else {
        UI.showCountdown('GO!', '#00e676');
        Audio.playBeep('high');
        Audio.speakCountdown(3);           // index 3 = "Go!"
        phaseTimer = setTimeout(() => { UI.hideCountdown(); enterGreen(); }, 800);
      }
    };
    phaseTimer = setTimeout(tick, 900);
  }

  // ── GREEN LIGHT ───────────────────────────────────────────────────────────────
  function enterGreen() {
    state    = 'GREEN';
    isCaught = false;
    round++;

    const duration = rand(config.greenMs * 0.7, config.greenMs * 1.3);

    UI.updateRound(round, config.rounds);
    UI.setLight('green');
    UI.setStatus('🟢 GREEN LIGHT — Move!', 'green');
    UI.setDarumaState('green');
    UI.setDollSpeech(speech('green'));
    UI.setCameraOverlay('state-green');
    UI.setScanLine(false);
    UI.setMovementIndicator('', false);

    Detector.stopWatching();
    Audio.playGreenLight();
    Audio.speak('greenLight');

    startTimerTick(duration, 'green');
    phaseTimer = setTimeout(enterRed, duration);
  }

  // ── RED LIGHT ─────────────────────────────────────────────────────────────────
  function enterRed() {
    state    = 'RED';
    isCaught = false;

    const duration = rand(config.redMs * 0.7, config.redMs * 1.3);

    UI.setLight('red');
    UI.setStatus('🔴 RED LIGHT — Freeze!', 'red');
    UI.setDarumaState('red');
    UI.setDollSpeech(speech('red'));
    UI.setCameraOverlay('state-red');
    UI.setScanLine(true);

    Audio.playRedLight();
    Audio.speak('redLight');

    // Grace period before detection starts
    phaseTimer = setTimeout(() => {
      Detector.startWatching(Detector.getLastPoses());

      startTimerTick(duration, 'red');
      phaseTimer = setTimeout(onRedSafe, duration);
    }, 700);
  }

  // ── Survived RED ─────────────────────────────────────────────────────────────
  function onRedSafe() {
    if (state !== 'RED') return;
    Detector.stopWatching();
    clearTimerInterval();

    score += 100 + round * 10;
    UI.updateScore(score);
    UI.setMovementIndicator('✓ SAFE', true);
    UI.setDollSpeech(speech('safe'));
    Audio.playSafe();
    Audio.speak('safe');

    if (round >= config.rounds) {
      phaseTimer = setTimeout(enterWin, 1100);
    } else {
      phaseTimer = setTimeout(enterGreen, 1300);
    }
  }

  // ── Player Caught ─────────────────────────────────────────────────────────────
  function onPlayerCaught() {
    if (state !== 'RED' || isCaught) return;
    isCaught = true;

    clearPhaseTimer();
    clearTimerInterval();
    Detector.stopWatching();

    lives--;
    UI.updateLives(lives, config.lives);
    UI.showCaughtOverlay('❌ YOU MOVED!');
    UI.setDarumaState('angry');
    UI.setDollSpeech(speech('caught'));
    UI.setCameraOverlay('state-caught');
    UI.setMovementIndicator('❌ CAUGHT!', false);

    Audio.playCaught();
    Audio.speak('caught');

    if (lives <= 0) {
      phaseTimer = setTimeout(enterLose, 1600);
    } else {
      phaseTimer = setTimeout(() => {
        UI.hideCaughtOverlay();
        enterGreen();
      }, 1600);
    }
  }

  // ── Live movement indicator ───────────────────────────────────────────────────
  function onMovementLevel(delta, threshold) {
    if (state !== 'RED') return;
    const ratio  = delta / threshold;
    const moving = ratio > 0.6;
    UI.setMovementIndicator(
      moving ? `⚠ Moving (${Math.round(delta)})` : `✓ Still (${Math.round(delta)})`,
      !moving
    );
  }

  // ── Win ───────────────────────────────────────────────────────────────────────
  function enterWin() {
    state = 'WIN';
    Detector.stopWatching();
    clearTimerInterval();
    UI.setDollSpeech(speech('win'));
    UI.saveScore(playerName, score, difficulty);
    UI.showWinScreen(score);
    Audio.playWin();
    Audio.speak('win');
    UI.launchConfetti();
  }

  // ── Lose ──────────────────────────────────────────────────────────────────────
  function enterLose() {
    state = 'LOSE';
    Detector.stopWatching();
    clearTimerInterval();
    UI.setDollSpeech(speech('lose'));
    UI.saveScore(playerName, score, difficulty);
    UI.showLoseScreen(score);
    Audio.playLose();
    Audio.speak('lose');
  }

  // ── Restart ───────────────────────────────────────────────────────────────────
  function restart() {
    clearPhaseTimer();
    clearTimerInterval();
    Detector.destroy();
    start(difficulty, lang, playerName);
  }

  function goHome() {
    clearPhaseTimer();
    clearTimerInterval();
    Detector.destroy();
    UI.showScreen('start');
    state = 'IDLE';
  }

  return { start, restart, goHome };

})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(function bootstrap() {
  let selectedDiff = 'easy';
  let selectedLang = 'en';

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiff = btn.dataset.diff;
    });
  });

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLang = btn.dataset.lang;
    });
  });

  // Start
  document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    Game.start(selectedDiff, selectedLang, name);
  });

  // Leaderboard
  const openLb = () => UI.showLeaderboard();
  document.getElementById('btn-leaderboard').addEventListener('click', openLb);
  document.getElementById('btn-lb-win').addEventListener('click',  openLb);
  document.getElementById('btn-lb-lose').addEventListener('click', openLb);

  document.getElementById('btn-lb-close').addEventListener('click', () => UI.hideLeaderboard());
  document.getElementById('btn-lb-reset').addEventListener('click', () => {
    if (confirm('Reset all scores?')) {
      localStorage.removeItem('rlgl_leaderboard');
      UI.showLeaderboard(); // re-render empty
    }
  });

  // Play again
  document.getElementById('btn-play-again-win').addEventListener('click',  () => Game.restart());
  document.getElementById('btn-play-again-lose').addEventListener('click', () => Game.restart());
})();
