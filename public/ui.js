/**
 * ui.js
 * All DOM manipulation, animations, and visual feedback.
 */

const UI = (() => {

  // ── Element cache ─────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const screens = {
    start: $('screen-start'),
    game:  $('screen-game'),
    win:   $('screen-win'),
    lose:  $('screen-lose'),
  };

  const el = {
    lightRed:           $('light-red'),
    lightGreen:         $('light-green'),
    doll:               $('doll'),
    dollSpeech:         $('doll-speech'),
    statusBanner:       $('status-banner'),
    statusText:         $('status-text'),
    livesDisplay:       $('lives-display'),
    scoreValue:         $('score-value'),
    roundValue:         $('round-value'),
    countdownOverlay:   $('countdown-overlay'),
    countdownNumber:    $('countdown-number'),
    caughtOverlay:      $('caught-overlay'),
    cameraOverlay:      $('camera-overlay'),
    scanLine:           $('scan-line'),
    movementIndicator:  $('movement-indicator'),
    winScore:           $('win-score'),
    loseScore:          $('lose-score'),
    confettiCanvas:     $('confetti-canvas'),
  };

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

  // ── Doll ──────────────────────────────────────────────────────────────────────
  let speechTimeout = null;

  function setDollFacing(facing) {
    el.doll.className = facing === 'turned' ? 'doll-turned' : 'doll-front';
  }

  function setDollAngry() {
    el.doll.className = 'doll-angry';
    setTimeout(() => { el.doll.className = 'doll-turned'; }, 1200);
  }

  function setDollSpeech(text) {
    clearTimeout(speechTimeout);
    if (!text) {
      el.dollSpeech.classList.remove('visible');
      return;
    }
    el.dollSpeech.textContent = text;
    el.dollSpeech.classList.add('visible');
    speechTimeout = setTimeout(() => {
      el.dollSpeech.classList.remove('visible');
    }, 2500);
  }

  // ── Status Banner ─────────────────────────────────────────────────────────────
  function setStatus(text, state) {
    el.statusText.textContent = text;
    el.statusBanner.className = '';
    if (state === 'green')   el.statusBanner.classList.add('state-green');
    else if (state === 'red') el.statusBanner.classList.add('state-red');
    else                      el.statusBanner.classList.add('state-neutral');
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────
  function updateLives(current, max) {
    el.livesDisplay.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const heart = document.createElement('span');
      heart.className = 'life-heart' + (i >= current ? ' lost' : '');
      heart.textContent = '❤️';
      el.livesDisplay.appendChild(heart);
    }
  }

  function updateScore(value) {
    el.scoreValue.textContent = value;
    // Pop animation
    el.scoreValue.style.transform = 'scale(1.4)';
    el.scoreValue.style.color = '#fff';
    setTimeout(() => {
      el.scoreValue.style.transform = '';
      el.scoreValue.style.color = '';
    }, 300);
  }

  function updateRound(current, max) {
    el.roundValue.textContent = `${current}/${max}`;
  }

  // ── Camera Overlay ────────────────────────────────────────────────────────────
  function setCameraOverlay(cls) {
    el.cameraOverlay.className = '';
    if (cls) el.cameraOverlay.classList.add(cls);
  }

  function setScanLine(active) {
    if (active) el.scanLine.classList.add('active');
    else        el.scanLine.classList.remove('active');
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
  function showCountdown(number) {
    el.countdownOverlay.classList.remove('hidden');
    const colors = ['#ff2d2d', '#ffd600', '#00e676'];
    el.countdownNumber.textContent = number;
    el.countdownNumber.style.color = colors[(number - 1) % colors.length];
    // Re-trigger animation
    el.countdownNumber.style.animation = 'none';
    el.countdownNumber.offsetHeight; // reflow
    el.countdownNumber.style.animation = '';
  }

  function hideCountdown() {
    el.countdownOverlay.classList.add('hidden');
  }

  // ── Caught Overlay ────────────────────────────────────────────────────────────
  let caughtTimer = null;

  function showCaughtOverlay() {
    el.caughtOverlay.classList.remove('hidden');
    clearTimeout(caughtTimer);
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

  // ── Confetti ──────────────────────────────────────────────────────────────────
  let confettiRaf = null;
  const confettiParticles = [];

  function launchConfetti() {
    const canvas = el.confettiCanvas;
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles.length = 0;
    const colors = ['#ff2d2d','#ffd600','#00e676','#e94560','#00b4d8','#ff9f1c','#ffffff'];

    for (let i = 0; i < 180; i++) {
      confettiParticles.push({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height - canvas.height,
        w:     rand(6, 14),
        h:     rand(4, 10),
        color: colors[Math.floor(Math.random() * colors.length)],
        vx:    (Math.random() - 0.5) * 4,
        vy:    Math.random() * 4 + 2,
        angle: Math.random() * 360,
        spin:  (Math.random() - 0.5) * 6,
        alpha: 1,
      });
    }

    function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.forEach(p => {
        p.x     += p.vx;
        p.y     += p.vy;
        p.angle += p.spin;
        p.vy    += 0.08; // gravity
        if (frame > 120) p.alpha -= 0.008;
        p.alpha = Math.max(p.alpha, 0);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle * Math.PI / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (frame < 240) {
        confettiRaf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiRaf = requestAnimationFrame(draw);
  }

  return {
    showScreen,
    setLight,
    setDollFacing,
    setDollAngry,
    setDollSpeech,
    setStatus,
    updateLives,
    updateScore,
    updateRound,
    setCameraOverlay,
    setScanLine,
    setMovementIndicator,
    showCountdown,
    hideCountdown,
    showCaughtOverlay,
    hideCaughtOverlay,
    showWinScreen,
    showLoseScreen,
    launchConfetti,
  };

})();
