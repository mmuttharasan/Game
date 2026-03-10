/**
 * audio.js
 * Sound effects (Web Audio API) + Voice announcements (Web Speech API)
 * Supports: English, Japanese, Hindi, Tamil
 */

const Audio = (() => {

  // ── Web Audio context ─────────────────────────────────────────────────────────
  let actx = null;
  function getCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  // ── Tone helpers ──────────────────────────────────────────────────────────────
  function tone(freq, dur, type = 'sine', vol = 0.38, delay = 0) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur + 0.05);
  }

  function noise(dur, vol = 0.15, delay = 0) {
    const c = getCtx();
    const len = c.sampleRate * dur;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    src.connect(gain); gain.connect(c.destination);
    src.start(c.currentTime + delay);
    src.stop(c.currentTime + delay + dur + 0.05);
  }

  // ── Sound effects ─────────────────────────────────────────────────────────────
  function playBeep(pitch = 'mid') {
    const f = pitch === 'high' ? 880 : pitch === 'low' ? 220 : 440;
    tone(f, 0.12, 'square', 0.28);
  }

  function playGreenLight() {
    tone(523,  0.14, 'triangle', 0.33, 0.00);
    tone(659,  0.14, 'triangle', 0.33, 0.12);
    tone(784,  0.18, 'triangle', 0.33, 0.24);
    tone(1047, 0.24, 'triangle', 0.28, 0.36);
  }

  function playRedLight() {
    tone(880, 0.10, 'sawtooth', 0.28, 0.00);
    tone(698, 0.10, 'sawtooth', 0.28, 0.10);
    tone(587, 0.10, 'sawtooth', 0.28, 0.20);
    tone(440, 0.32, 'sawtooth', 0.32, 0.30);
  }

  function playSafe() {
    tone(659, 0.11, 'sine', 0.28, 0.00);
    tone(784, 0.11, 'sine', 0.28, 0.11);
    tone(988, 0.20, 'sine', 0.28, 0.22);
  }

  function playCaught() {
    tone(120, 0.50, 'sawtooth', 0.48, 0.00);
    tone(100, 0.38, 'sawtooth', 0.38, 0.10);
    noise(0.40, 0.18, 0.00);
    tone(55,  0.55, 'square',   0.32, 0.20);
  }

  function playWin() {
    [[523,0.12,0],[659,0.12,0.12],[784,0.12,0.24],[1047,0.12,0.36],[1319,0.22,0.48],[1047,0.10,0.70],[1319,0.42,0.80]]
      .forEach(([f,d,dl]) => tone(f,d,'triangle',0.33,dl));
  }

  function playLose() {
    [[392,0.24,0],[349,0.24,0.24],[330,0.24,0.48],[294,0.58,0.72]]
      .forEach(([f,d,dl]) => tone(f,d,'sawtooth',0.33,dl));
  }

  // ── Speech API ────────────────────────────────────────────────────────────────
  const TEXTS = {
    en: {
      langCode:    'en-US',
      greenLight:  'Green Light! Go go go!',
      redLight:    'Red Light! Stop! Don\'t move!',
      caught:      'You moved! You\'re out!',
      safe:        'Safe! Well done!',
      win:         'You win! Amazing job!',
      lose:        'Game over! Try again!',
      countdown:   ['3', '2', '1', 'Go!'],
    },
    ja: {
      langCode:    'ja-JP',
      greenLight:  '青信号！進め！',
      redLight:    '赤信号！止まれ！動くな！',
      caught:      '動いた！アウト！',
      safe:        'セーフ！よくできました！',
      win:         '勝ち！すごい！',
      lose:        'ゲームオーバー！もう一度！',
      countdown:   ['さん', 'に', 'いち', 'はじめ！'],
    },
    hi: {
      langCode:    'hi-IN',
      greenLight:  'हरी बत्ती! जाओ जाओ!',
      redLight:    'लाल बत्ती! रुको! मत हिलो!',
      caught:      'तुम हिले! आउट!',
      safe:        'सेफ! शाबाश!',
      win:         'जीत गए! बहुत बढ़िया!',
      lose:        'खेल खत्म! फिर कोशिश करो!',
      countdown:   ['तीन', 'दो', 'एक', 'जाओ!'],
    },
    ta: {
      langCode:    'ta-IN',
      greenLight:  'பச்சை விளக்கு! போ போ!',
      redLight:    'சிவப்பு விளக்கு! நில்! அசையாதே!',
      caught:      'அசைந்தாய்! அவுட்!',
      safe:        'சேஃப்! சபாஷ்!',
      win:         'வெற்றி! அருமை!',
      lose:        'விளையாட்டு முடிந்தது! மீண்டும் முயற்சி!',
      countdown:   ['மூன்று', 'இரண்டு', 'ஒன்று', 'செல்!'],
    },
  };

  let currentLang = 'en';
  let voiceCache  = {};

  function setLang(lang) {
    currentLang = TEXTS[lang] ? lang : 'en';
    voiceCache  = {};
  }

  function getVoice(langCode) {
    if (voiceCache[langCode]) return voiceCache[langCode];
    const voices = speechSynthesis.getVoices();
    // Prefer exact match, then language prefix match
    let v = voices.find(v => v.lang === langCode)
         || voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    if (v) voiceCache[langCode] = v;
    return v || null;
  }

  function speak(key, overrideLang) {
    if (!window.speechSynthesis) return;
    const lang = overrideLang || currentLang;
    const t    = TEXTS[lang];
    if (!t || !t[key]) return;

    // Cancel any currently speaking
    speechSynthesis.cancel();

    const text = t[key];
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang  = t.langCode;
    utt.rate  = 0.95;
    utt.pitch = 1.1;
    utt.volume = 0.9;

    const voice = getVoice(t.langCode);
    if (voice) utt.voice = voice;

    speechSynthesis.speak(utt);
  }

  function speakCountdown(index, overrideLang) {
    if (!window.speechSynthesis) return;
    const lang = overrideLang || currentLang;
    const t    = TEXTS[lang];
    if (!t || !t.countdown[index]) return;

    speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(t.countdown[index]);
    utt.lang   = t.langCode;
    utt.rate   = 1.0;
    utt.pitch  = 1.2;
    utt.volume = 0.9;
    const voice = getVoice(t.langCode);
    if (voice) utt.voice = voice;
    speechSynthesis.speak(utt);
  }

  // Pre-load voices when available
  if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => { voiceCache = {}; };
  }

  return {
    playBeep,
    playGreenLight,
    playRedLight,
    playSafe,
    playCaught,
    playWin,
    playLose,
    setLang,
    speak,
    speakCountdown,
  };

})();
