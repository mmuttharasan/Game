/**
 * game.js
 * Game state machine for Red Light, Green Light.
 *
 * States:  IDLE → COUNTDOWN → GREEN → RED → RESULT
 *          RESULT → WIN  (survived all rounds)
 *          RESULT → LOSE (all lives gone)
 */

const Game = (() => {

  // ── Difficulty presets ────────────────────────────────────────────────────────
  const DIFFICULTY = {
    easy:   { lives: 5, rounds: 5, greenMin: 4000, greenMax: 7000, redMin: 3000, redMax: 6000, threshold: 25 },
    medium: { lives: 3, rounds: 7, greenMin: 3000, greenMax: 6000, redMin: 2500, redMax: 5000, threshold: 18 },
    hard:   { lives: 1, rounds:10, greenMin: 2000, greenMax: 4000, redMin: 2000, redMax: 4500, threshold: 12 },
  };

  // ── State ─────────────────────────────────────────────────────────────────────
  let state       = 'IDLE';  // IDLE | COUNTDOWN | GREEN | RED | TRANSITIONING | WIN | LOSE
  let difficulty  = 'easy';
  let config      = DIFFICULTY.easy;
  let lives       = 0;
  let score       = 0;
  let round       = 0;
  let phaseTimer  = null;
  let isCaught    = false;   // debounce — ignore extra catches during animation

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function clearTimer() { if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; } }

  // ── Public: Start Game ────────────────────────────────────────────────────────
  async function start(diff) {
    difficulty = diff || 'easy';
    config     = DIFFICULTY[difficulty];
    lives      = config.lives;
    score      = 0;
    round      = 0;
    isCaught   = false;

    Detector.setThreshold(config.threshold);
    Detector.setOnCaught(onPlayerCaught);
    Detector.setOnMovementLevel(onMovementLevel);

    UI.showScreen('game');
    UI.updateLives(lives, config.lives);
    UI.updateScore(score);
    UI.updateRound(round, config.rounds);

    // Init camera + model
    UI.setStatus('Loading camera & AI model... 📷', 'neutral');
    UI.setDollSpeech('');
    try {
      await Detector.init(
        document.getElementById('webcam'),
        document.getElementById('pose-canvas')
      );
    } catch (err) {
      alert('Could not access camera: ' + err.message);
      UI.showScreen('start');
      return;
    }

    startCountdown();
  }

  // ── Countdown before first GREEN ──────────────────────────────────────────────
  function startCountdown() {
    state = 'COUNTDOWN';
    UI.setStatus('Get ready...', 'neutral');
    UI.setDollSpeech('');
    UI.setDollFacing('front');
    UI.setLight('none');

    let count = 3;
    UI.showCountdown(count);

    const tick = () => {
      count--;
      if (count > 0) {
        UI.showCountdown(count);
        Audio.playBeep('mid');
        phaseTimer = setTimeout(tick, 900);
      } else {
        UI.hideCountdown();
        Audio.playBeep('high');
        enterGreen();
      }
    };

    Audio.playBeep('mid');
    phaseTimer = setTimeout(tick, 900);
  }

  // ── GREEN LIGHT ───────────────────────────────────────────────────────────────
  function enterGreen() {
    state = 'GREEN';
    round++;
    isCaught = false;

    UI.updateRound(round, config.rounds);
    UI.setLight('green');
    UI.setStatus('🟢 GREEN LIGHT — Move!', 'green');
    UI.setDollFacing('front');   // doll faces forward (turned away from players in lore)
    UI.setDollSpeech('Go go go! 🏃');
    UI.setCameraOverlay('state-green');
    UI.setScanLine(false);
    UI.setMovementIndicator('', false);

    Detector.stopWatching();
    Audio.playGreenLight();

    const duration = rand(config.greenMin, config.greenMax);
    phaseTimer = setTimeout(enterRed, duration);
  }

  // ── RED LIGHT ─────────────────────────────────────────────────────────────────
  function enterRed() {
    state = 'RED';
    isCaught = false;

    UI.setLight('red');
    UI.setStatus('🔴 RED LIGHT — Freeze!', 'red');
    UI.setDollFacing('turned');   // doll "turns around" to watch
    UI.setDollSpeech('Don\'t move! 👁️');
    UI.setCameraOverlay('state-red');
    UI.setScanLine(true);

    Audio.playRedLight();

    // Give a tiny grace period before starting detection
    phaseTimer = setTimeout(() => {
      Detector.startWatching(Detector.getLastPoses());

      const duration = rand(config.redMin, config.redMax);
      phaseTimer = setTimeout(onRedLightSafe, duration);
    }, 600);
  }

  // ── Survived RED LIGHT ────────────────────────────────────────────────────────
  function onRedLightSafe() {
    if (state !== 'RED') return;
    Detector.stopWatching();

    score += 100 + round * 10;
    UI.updateScore(score);
    UI.setMovementIndicator('✓ SAFE', true);

    Audio.playSafe();

    if (round >= config.rounds) {
      phaseTimer = setTimeout(enterWin, 1000);
    } else {
      phaseTimer = setTimeout(enterGreen, 1200);
    }
  }

  // ── Player Caught Moving ──────────────────────────────────────────────────────
  function onPlayerCaught(delta) {
    if (state !== 'RED' || isCaught) return;
    isCaught = true;
    clearTimer();
    Detector.stopWatching();

    lives--;
    UI.updateLives(lives, config.lives);
    UI.showCaughtOverlay();
    UI.setDollSpeech('You moved!! 😡');
    UI.setDollAngry();
    UI.setCameraOverlay('state-caught');
    UI.setMovementIndicator('❌ CAUGHT!', false);

    Audio.playCaught();

    if (lives <= 0) {
      phaseTimer = setTimeout(enterLose, 1500);
    } else {
      phaseTimer = setTimeout(() => {
        UI.hideCaughtOverlay();
        enterGreen();
      }, 1500);
    }
  }

  // ── Movement Level (live indicator) ──────────────────────────────────────────
  function onMovementLevel(delta, threshold) {
    if (state !== 'RED') return;
    const moving = delta > threshold * 0.6;
    UI.setMovementIndicator(
      moving ? `⚠ Moving (${Math.round(delta)})` : `✓ Still (${Math.round(delta)})`,
      !moving
    );
  }

  // ── Win ───────────────────────────────────────────────────────────────────────
  function enterWin() {
    state = 'WIN';
    Detector.stopWatching();
    UI.showWinScreen(score);
    Audio.playWin();
    UI.launchConfetti();
  }

  // ── Lose ──────────────────────────────────────────────────────────────────────
  function enterLose() {
    state = 'LOSE';
    Detector.stopWatching();
    UI.showLoseScreen(score);
    Audio.playLose();
  }

  // ── Public: Restart ───────────────────────────────────────────────────────────
  function restart() {
    clearTimer();
    Detector.destroy();
    start(difficulty);
  }

  function goHome() {
    clearTimer();
    Detector.destroy();
    UI.showScreen('start');
    state = 'IDLE';
  }

  return { start, restart, goHome };

})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(function bootstrap() {
  let selectedDiff = 'easy';

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiff = btn.dataset.diff;
    });
  });

  // Start button
  document.getElementById('btn-start').addEventListener('click', () => {
    Game.start(selectedDiff);
  });

  // Play again buttons
  document.getElementById('btn-play-again-win').addEventListener('click',  () => Game.restart());
  document.getElementById('btn-play-again-lose').addEventListener('click', () => Game.restart());
})();
