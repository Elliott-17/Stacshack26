// ── Patterns ───────────────────────────────────────────────────────────────────

const PATTERNS = {
  box: {
    desc: 'in 4  ·  hold 4  ·  out 4  ·  hold 4',
    phases: [
      { name: 'breathe in',  duration: 4, scale: 2.8, border: 4,   ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
      { name: 'hold',        duration: 4, scale: 2.8, border: 4,   ease: 'linear' },
      { name: 'breathe out', duration: 4, scale: 1,   border: 1.5, ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
      { name: 'hold',        duration: 4, scale: 1,   border: 1.5, ease: 'linear' },
    ],
  },
  '478': {
    desc: 'in 4  ·  hold 7  ·  out 8',
    phases: [
      { name: 'breathe in',  duration: 4, scale: 2.8, border: 4,   ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
      { name: 'hold',        duration: 7, scale: 2.8, border: 4,   ease: 'linear' },
      { name: 'breathe out', duration: 8, scale: 1,   border: 1.5, ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
    ],
  },
  calm: {
    desc: 'in 5  ·  out 7',
    phases: [
      { name: 'breathe in',  duration: 5, scale: 2.8, border: 4,   ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
      { name: 'breathe out', duration: 7, scale: 1,   border: 1.5, ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
    ],
  },
};

// ── State ──────────────────────────────────────────────────────────────────────

let currentPatternKey = 'box';
let phaseIndex        = 0;
let countdown         = 0;
let ticker            = null;
let running           = false;

// ── DOM refs ───────────────────────────────────────────────────────────────────

const circle      = document.getElementById('breath-circle');
const countEl     = document.getElementById('breath-count');
const phaseEl     = document.getElementById('breath-phase');
const descEl      = document.getElementById('pattern-desc');

// ── Core logic ─────────────────────────────────────────────────────────────────

function currentPattern() {
  return PATTERNS[currentPatternKey];
}

function applyPhase(index) {
  const phase = currentPattern().phases[index];
  circle.style.transition = `transform ${phase.duration}s ${phase.ease}, border-width ${phase.duration}s ${phase.ease}`;
  circle.style.transform  = `scale(${phase.scale})`;
  circle.style.borderWidth = `${phase.border}px`;
  phaseEl.textContent     = phase.name;
  countdown               = phase.duration;
  countEl.textContent     = countdown;
}

function tick() {
  countdown--;
  countEl.textContent = countdown;

  // Ripple pulse on each tick
  circle.classList.remove('tick');
  void circle.offsetWidth; // force reflow so animation restarts
  circle.classList.add('tick');

  if (countdown <= 0) {
    phaseIndex = (phaseIndex + 1) % currentPattern().phases.length;
    applyPhase(phaseIndex);
  }
}

function start() {
  if (running) return;
  running    = true;
  phaseIndex = 0;
  applyPhase(0);
  ticker = setInterval(tick, 1000);
  phaseEl.style.color  = '#d1d0c5';
  countEl.style.color  = '#e2b714';
  circle.style.opacity = '0.85';
}

function pause() {
  if (!running) return;
  running = false;
  clearInterval(ticker);
  ticker = null;

  // Snap circle back to resting size without animation
  circle.classList.remove('tick');
  circle.style.transition  = 'transform 0.6s ease, border-width 0.6s ease, opacity 0.5s';
  circle.style.transform   = 'scale(1)';
  circle.style.borderWidth = '2px';
  circle.style.opacity     = '0.35';
  phaseEl.textContent     = 'paused';
  phaseEl.style.color     = '#646669';
  countEl.textContent     = '–';
  countEl.style.color     = '#646669';
}

function toggle() {
  running ? pause() : start();
}

// ── Pattern switching ──────────────────────────────────────────────────────────

function setPattern(key) {
  const wasRunning = running;
  if (running) pause();

  currentPatternKey = key;
  descEl.textContent = PATTERNS[key].desc;

  // Update tab styles
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pattern === key);
  });

  if (wasRunning) start();
}

function cyclePattern() {
  const keys = Object.keys(PATTERNS);
  const next = keys[(keys.indexOf(currentPatternKey) + 1) % keys.length];
  setPattern(next);
}

// ── Keyboard ───────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === ' ') {
    e.preventDefault();
    toggle();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    cyclePattern();
  }
});

// ── Tab buttons ────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => setPattern(btn.dataset.pattern));
});

// ── Init ───────────────────────────────────────────────────────────────────────

setPattern('box');
