/**
 * ui.js
 * DOM manipulation, Daruma animations, timer ring, leaderboard, confetti.
 */

const UI = (() => {

  const $ = id => document.getElementById(id);

  const screens = {
    start: $('screen-start'),
    game:  $('screen-game'),
    win:   $('screen-win'),
    lose:  $('screen-lose'),
  };

  const el = {
    lightRed:          $('light-red'),
    lightGreen:        $('light-green'),
    daruma:            $('daruma-game'),
    dollSpeech:        $('doll-speech'),
    statusBanner:      $('status-banner'),
    statusText:        $('status-text'),
    livesDisplay:      $('lives-display'),
    scoreValue:        $('score-value'),
    roundValue:        $('round-value'),
    timerProgress:     $('timer-progress'),
    timerNumber:       $('timer-number'),
    countdownOverlay:  $('countdown-overlay'),
    countdownNumber:   $('countdown-number'),
    caughtOverlay:     $('caught-overlay'),
    caughtText:        $('caught-text'),
    cameraOverlay:     $('camera-overlay'),
    scanLine:          $('scan-line'),
    movementIndicator: $('movement-indicator'),
    winScore:          $('win-score'),
    loseScore:         $('lose-score'),
    confettiCanvas:    $('confetti-canvas'),
    lbModal:           $('leaderboard-modal'),
    lbTbody:           $('lb-tbody'),
    lbEmpty:           $('lb-empty'),
  };

  // Timer ring circumference for r=27: 2π×27 ≈ 169.6
  const CIRCUMFERENCE = 169.6;

  // ── Screens ───────────────────────────────────────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
  }

  // ── Traffic Light ─────────────────────────────────────────────────────────────
  function setLight(color) {
    el.lightRed.classList.remove('on');
    el.lightGreen.classList.remove('on');
    if (color === 'red')   el.lightRed.classList.add('on');
    if (color === 'green') el.lightGreen.classList.add('on');
  }

  // ── Daruma character ──────────────────────────────────────────────────────────
  let speechTimeout = null;

  function setDarumaState(state) {
    // state: 'idle' | 'green' | 'red' | 'angry'
    if (!el.daruma) return;
    el.daruma.className = 'daruma-svg daruma-' + state;
  }

  function setDollSpeech(text) {
    clearTimeout(speechTimeout);
    if (!text) {
      el.dollSpeech.classList.remove('visible');
      el.dollSpeech.textContent = '';
      return;
    }
    el.dollSpeech.textContent = text;
    el.dollSpeech.classList.add('visible');
    speechTimeout = setTimeout(() => el.dollSpeech.classList.remove('visible'), 2800);
  }

  // ── Status Banner ─────────────────────────────────────────────────────────────
  function setStatus(text, state) {
    el.statusText.textContent = text;
    el.statusBanner.className = 'state-' + (state || 'neutral');
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────
  function updateLives(current, max) {
    el.livesDisplay.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const h = document.createElement('span');
      h.className = 'life-heart' + (i >= current ? ' lost' : '');
      h.textContent = '❤️';
      el.livesDisplay.appendChild(h);
    }
  }

  function updateScore(value) {
    el.scoreValue.textContent = value;
    el.scoreValue.style.transform = 'scale(1.45)';
    el.scoreValue.style.color = '#fff';
    setTimeout(() => { el.scoreValue.style.transform = ''; el.scoreValue.style.color = ''; }, 280);
  }

  function updateRound(current, max) {
    el.roundValue.textContent = `${current}/${max}`;
  }

  // ── Timer Ring ────────────────────────────────────────────────────────────────
  function updateTimer(secondsLeft, totalSeconds, phase) {
    const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
    const offset   = CIRCUMFERENCE * (1 - progress);
    el.timerProgress.style.strokeDashoffset = offset;
    el.timerNumber.textContent = secondsLeft > 0 ? Math.ceil(secondsLeft) : '--';

    // Color: green phase → green ring, red phase → red ring
    el.timerProgress.style.stroke = phase === 'green' ? '#00e676' : '#ff2d2d';
  }

  function resetTimer() {
    el.timerProgress.style.strokeDashoffset = 0;
    el.timerNumber.textContent = '--';
    el.timerProgress.style.stroke = '#ffd600';
  }

  // ── Camera Overlay ────────────────────────────────────────────────────────────
  function setCameraOverlay(cls) {
    el.cameraOverlay.className = cls || '';
  }

  function setScanLine(active) {
    el.scanLine.classList.toggle('active', active);
  }

  function setMovementIndicator(text, isSafe) {
    if (!text) {
      el.movementIndicator.classList.remove('visible', 'safe', 'moving');
      return;
    }
    el.movementIndicator.textContent = text;
    el.movementIndicator.classList.add('visible');
    el.movementIndicator.classList.remove('safe', 'moving');
    el.movementIndicator.classList.add(isSafe ? 'safe' : 'moving');
  }

  // ── Countdown ─────────────────────────────────────────────────────────────────
  function showCountdown(text, color) {
    el.countdownOverlay.classList.remove('hidden');
    el.countdownNumber.textContent = text;
    const colors = { 3: '#ff2d2d', 2: '#ffd600', 1: '#00e676', go: '#00e676' };
    el.countdownNumber.style.color = color || colors[text] || '#fff';
    // Re-trigger CSS animation
    el.countdownNumber.style.animation = 'none';
    void el.countdownNumber.offsetHeight;
    el.countdownNumber.style.animation = '';
  }

  function hideCountdown() {
    el.countdownOverlay.classList.add('hidden');
  }

  // ── Caught Overlay ────────────────────────────────────────────────────────────
  function showCaughtOverlay(message) {
    if (message) el.caughtText.textContent = message;
    el.caughtOverlay.classList.remove('hidden');
  }

  function hideCaughtOverlay() {
    el.caughtOverlay.classList.add('hidden');
  }

  // ── Result Screens ────────────────────────────────────────────────────────────
  function showWinScreen(score) {
    el.winScore.textContent = score;
    showScreen('win');
  }

  function showLoseScreen(score) {
    el.loseScore.textContent = score;
    hideCaughtOverlay();
    showScreen('lose');
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────────
  const LB_KEY = 'rlgl_leaderboard';
  const LB_MAX = 20;

  function saveScore(name, score, difficulty) {
    const entries = getScores();
    entries.push({
      name: name || 'Player',
      score,
      difficulty,
      date: new Date().toLocaleDateString(),
    });
    entries.sort((a, b) => b.score - a.score);
    if (entries.length > LB_MAX) entries.length = LB_MAX;
    localStorage.setItem(LB_KEY, JSON.stringify(entries));
  }

  function getScores() {
    try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
    catch { return []; }
  }

  function resetScores() {
    localStorage.removeItem(LB_KEY);
    renderLeaderboard();
  }

  const MEDALS = ['🥇', '🥈', '🥉'];
  const DIFF_LABELS = { easy: '😊', medium: '😤', hard: '😈' };

  function renderLeaderboard() {
    const entries = getScores();
    el.lbTbody.innerHTML = '';

    if (entries.length === 0) {
      el.lbEmpty.classList.remove('hidden');
      return;
    }
    el.lbEmpty.classList.add('hidden');

    entries.forEach((e, i) => {
      const tr = document.createElement('tr');
      const medal = MEDALS[i] || `${i + 1}`;
      tr.innerHTML = `
        <td>${medal}</td>
        <td>${escHtml(e.name)}</td>
        <td>${e.score}</td>
        <td>${DIFF_LABELS[e.difficulty] || e.difficulty}</td>
        <td>${e.date}</td>
      `;
      el.lbTbody.appendChild(tr);
    });
  }

  function showLeaderboard() {
    renderLeaderboard();
    el.lbModal.classList.remove('hidden');
  }

  function hideLeaderboard() {
    el.lbModal.classList.add('hidden');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Confetti ──────────────────────────────────────────────────────────────────
  let confettiRaf = null;

  function launchConfetti() {
    const canvas = el.confettiCanvas;
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#ff2d2d','#ffd600','#00e676','#e94560','#00b4d8','#ff9f1c','#ffffff','#a855f7'];
    const particles = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: rand(5, 13), h: rand(4, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 6,
      alpha: 1,
    }));

    function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.09;
        p.angle += p.spin;
        if (frame > 100) p.alpha = Math.max(0, p.alpha - 0.01);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle * Math.PI / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < 260) confettiRaf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiRaf = requestAnimationFrame(draw);
  }

  return {
    showScreen,
    setLight,
    setDarumaState,
    setDollSpeech,
    setStatus,
    updateLives,
    updateScore,
    updateRound,
    updateTimer,
    resetTimer,
    setCameraOverlay,
    setScanLine,
    setMovementIndicator,
    showCountdown,
    hideCountdown,
    showCaughtOverlay,
    hideCaughtOverlay,
    showWinScreen,
    showLoseScreen,
    saveScore,
    showLeaderboard,
    hideLeaderboard,
    launchConfetti,
  };

})();
