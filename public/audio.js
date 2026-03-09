/**
 * audio.js
 * Sound effects generated via Web Audio API — no external files needed.
 */

const Audio = (() => {

  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── Core Helpers ──────────────────────────────────────────────────────────────

  function tone(frequency, duration, type = 'sine', volume = 0.4, delay = 0) {
    const c   = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime + delay);

    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.05);
  }

  function noise(duration, volume = 0.15, delay = 0) {
    const c      = getCtx();
    const bufLen = c.sampleRate * duration;
    const buf    = c.createBuffer(1, bufLen, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

    const src  = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(volume, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    src.connect(gain);
    gain.connect(c.destination);
    src.start(c.currentTime + delay);
    src.stop(c.currentTime + delay + duration + 0.05);
  }

  // ── Sound Effects ─────────────────────────────────────────────────────────────

  /** Countdown tick beep */
  function playBeep(pitch = 'mid') {
    const freq = pitch === 'high' ? 880 : pitch === 'low' ? 220 : 440;
    tone(freq, 0.12, 'square', 0.3);
  }

  /** Green light — cheerful ascending arpeggio */
  function playGreenLight() {
    tone(523, 0.15, 'triangle', 0.35, 0.00);  // C5
    tone(659, 0.15, 'triangle', 0.35, 0.12);  // E5
    tone(784, 0.20, 'triangle', 0.35, 0.24);  // G5
    tone(1047,0.25, 'triangle', 0.3,  0.36);  // C6
  }

  /** Red light — dramatic descending alarm */
  function playRedLight() {
    tone(880, 0.10, 'sawtooth', 0.3,  0.00);
    tone(698, 0.10, 'sawtooth', 0.3,  0.10);
    tone(587, 0.10, 'sawtooth', 0.3,  0.20);
    tone(440, 0.35, 'sawtooth', 0.35, 0.30);
  }

  /** Safe — soft reward jingle */
  function playSafe() {
    tone(659, 0.12, 'sine', 0.3, 0.00);  // E5
    tone(784, 0.12, 'sine', 0.3, 0.12);  // G5
    tone(988, 0.20, 'sine', 0.3, 0.24);  // B5
  }

  /** Caught — harsh buzzer + noise */
  function playCaught() {
    tone(120, 0.5, 'sawtooth', 0.5,  0.00);
    tone(100, 0.4, 'sawtooth', 0.4,  0.10);
    noise(0.4, 0.2, 0.00);
    // Low dramatic hit
    tone(55,  0.6, 'square',   0.35, 0.20);
  }

  /** Win — triumphant fanfare */
  function playWin() {
    const notes = [
      [523, 0.12, 0.00],  // C5
      [659, 0.12, 0.12],  // E5
      [784, 0.12, 0.24],  // G5
      [1047,0.12, 0.36],  // C6
      [1319,0.20, 0.48],  // E6
      [1047,0.10, 0.68],  // C6
      [1319,0.40, 0.78],  // E6 long
    ];
    notes.forEach(([f, d, delay]) => tone(f, d, 'triangle', 0.35, delay));
  }

  /** Lose — sad trombone-ish */
  function playLose() {
    const notes = [
      [392, 0.25, 0.00],   // G4
      [349, 0.25, 0.25],   // F4
      [330, 0.25, 0.50],   // E4
      [294, 0.60, 0.75],   // D4 — long
    ];
    notes.forEach(([f, d, delay]) => tone(f, d, 'sawtooth', 0.35, delay));
  }

  return {
    playBeep,
    playGreenLight,
    playRedLight,
    playSafe,
    playCaught,
    playWin,
    playLose,
  };

})();
