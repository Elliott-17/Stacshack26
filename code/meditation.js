// ── Breathing patterns ─────────────────────────────────────────────────────────

const PATTERNS = {
  box: {
    desc: 'in 4  ·  hold 4  ·  out 4  ·  hold 4',
    phases: [
      { name: 'breathe in',  duration: 4, scale: 2.8, border: 4, ease: 'cubic-bezier(0.4, 0, 0.6, 1)', glow: 1.0, glowOpacity: 0.9 },
      { name: 'hold',        duration: 4, scale: 2.8, border: 4, ease: 'linear',                        glow: 1.0, glowOpacity: 0.7 },
      { name: 'breathe out', duration: 4, scale: 1,   border: 4, ease: 'cubic-bezier(0.4, 0, 0.6, 1)', glow: 0.4, glowOpacity: 0.3 },
      { name: 'hold',        duration: 4, scale: 1,   border: 4, ease: 'linear',                        glow: 0.3, glowOpacity: 0.1 },
    ],
  },
  '478': {
    desc: 'in 4  ·  hold 7  ·  out 8',
    phases: [
      { name: 'breathe in',  duration: 4, scale: 2.8, border: 4, ease: 'cubic-bezier(0.4, 0, 0.6, 1)', glow: 1.0, glowOpacity: 0.9 },
      { name: 'hold',        duration: 7, scale: 2.8, border: 4, ease: 'linear',                        glow: 1.0, glowOpacity: 0.7 },
      { name: 'breathe out', duration: 8, scale: 1,   border: 4, ease: 'cubic-bezier(0.4, 0, 0.6, 1)', glow: 0.4, glowOpacity: 0.3 },
    ],
  },
  calm: {
    desc: 'in 5  ·  out 7',
    phases: [
      { name: 'breathe in',  duration: 5, scale: 2.8, border: 4, ease: 'cubic-bezier(0.4, 0, 0.6, 1)', glow: 1.0, glowOpacity: 0.9 },
      { name: 'breathe out', duration: 7, scale: 1,   border: 4, ease: 'cubic-bezier(0.4, 0, 0.6, 1)', glow: 0.4, glowOpacity: 0.3 },
    ],
  },
};

// ── Gogh themes ────────────────────────────────────────────────────────────────

const THEMES = {
  default:    { label: 'Default',    bg: '#0f1419', fg: '#e8eaed', muted: '#a8aeb8', dim: '#3e424a', accent: '#6366f1', accentRgb: '99,102,241'   },
  dracula:    { label: 'Dracula',    bg: '#282a36', fg: '#f8f8f2', muted: '#6272a4', dim: '#44475a', accent: '#bd93f9', accentRgb: '189,147,249'  },
  nord:       { label: 'Nord',       bg: '#2e3440', fg: '#eceff4', muted: '#81a1c1', dim: '#4c566a', accent: '#88c0d0', accentRgb: '136,192,208'  },
  gruvbox:    { label: 'Gruvbox',    bg: '#1d2021', fg: '#ebdbb2', muted: '#928374', dim: '#3c3836', accent: '#fabd2f', accentRgb: '250,189,47'   },
  monokai:    { label: 'Monokai',    bg: '#272822', fg: '#f8f8f2', muted: '#75715e', dim: '#49483e', accent: '#a6e22e', accentRgb: '166,226,46'   },
  tokyo:      { label: 'Tokyo Night',bg: '#1a1b26', fg: '#c0caf5', muted: '#565f89', dim: '#3b4261', accent: '#7aa2f7', accentRgb: '122,162,247'  },
  catppuccin: { label: 'Catppuccin', bg: '#1e1e2e', fg: '#cdd6f4', muted: '#6c7086', dim: '#313244', accent: '#cba6f7', accentRgb: '203,166,247'  },
  solarized:  { label: 'Solarized',  bg: '#002b36', fg: '#93a1a1', muted: '#586e75', dim: '#275662', accent: '#268bd2', accentRgb: '38,139,210'   },
  onedark:    { label: 'One Dark',   bg: '#282c34', fg: '#abb2bf', muted: '#5c6370', dim: '#5e5452', accent: '#e5c07b', accentRgb: '229,192,123'  },
};

// ── Arc constants ──────────────────────────────────────────────────────────────

const ARC_R     = 120;
const ARC_TOTAL = 2 * Math.PI * ARC_R; // ≈753.98

// ── State ──────────────────────────────────────────────────────────────────────

let currentPatternKey = 'box';
let phaseIndex        = 0;
let countdown         = 0;
let ticker            = null;
let running           = false;
let arcOffset         = 0;
let arcStep           = 0;

// ── DOM refs ───────────────────────────────────────────────────────────────────

const circle    = document.getElementById('breath-circle');
const countEl   = document.getElementById('breath-count');
const phaseEl   = document.getElementById('breath-phase');
const descEl    = document.getElementById('pattern-desc');
const bgGlow    = document.getElementById('bg-glow');
const arcCircle = document.getElementById('arc-circle');

// ── Theme ──────────────────────────────────────────────────────────────────────

function applyTheme(key) {
  const t = THEMES[key];
  if (!t) return;
  const root = document.documentElement;
  root.style.setProperty('--bg',         t.bg);
  root.style.setProperty('--fg',         t.fg);
  root.style.setProperty('--muted',      t.muted);
  root.style.setProperty('--dim',        t.dim);
  root.style.setProperty('--accent',     t.accent);
  root.style.setProperty('--accent-rgb', t.accentRgb);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === key);
  });
  try { localStorage.setItem('breathe-theme', key); } catch (_) {}
}

function buildThemePicker() {
  const picker = document.getElementById('theme-picker');
  Object.entries(THEMES).forEach(([key, t]) => {
    const dot = document.createElement('button');
    dot.className = 'swatch';
    dot.dataset.theme = key;
    dot.title = t.label;
    dot.style.background = t.accent;
    dot.addEventListener('click', () => applyTheme(key));
    picker.appendChild(dot);
  });
}

// ── Core breathing logic ───────────────────────────────────────────────────────

function currentPattern() {
  return PATTERNS[currentPatternKey];
}

function applyPhase(index) {
  const phase = currentPattern().phases[index];

  // Circle scale + border
  circle.style.transition  = `transform ${phase.duration}s ${phase.ease}, border-width ${phase.duration}s ${phase.ease}`;
  circle.style.transform   = `scale(${phase.scale})`;
  circle.style.borderWidth = `${phase.border}px`;

  // Background glow — expands on inhale, fades on exhale
  bgGlow.style.transition = `transform ${phase.duration}s ${phase.ease}, opacity ${phase.duration * 0.55}s ease`;
  bgGlow.style.transform  = `scale(${phase.glow})`;
  bgGlow.style.opacity    = phase.glowOpacity;

  // Arc — snap to full then count down each tick
  arcCircle.style.transition       = 'none';
  arcCircle.style.strokeDashoffset = '0';
  void arcCircle.getBoundingClientRect(); // force reflow
  arcCircle.style.transition       = 'stroke-dashoffset 0.95s linear, opacity 0.4s ease';
  arcCircle.style.opacity          = '0.5';
  arcOffset = 0;
  arcStep   = ARC_TOTAL / (phase.duration - 1);

  // Phase label fade-in
  phaseEl.classList.remove('phase-in');
  void phaseEl.offsetWidth;
  phaseEl.classList.add('phase-in');
  phaseEl.textContent = phase.name;

  countdown           = phase.duration;
  countEl.textContent = countdown;
}

function tick() {
  countdown--;
  countEl.textContent = countdown;

  // Arc progress
  arcOffset += arcStep;
  arcCircle.style.strokeDashoffset = String(arcOffset);

  // Circle ripple
  circle.classList.remove('tick');
  void circle.offsetWidth;
  circle.classList.add('tick');

  // Count number micro-pop
  countEl.classList.remove('count-pop');
  void countEl.offsetWidth;
  countEl.classList.add('count-pop');

  if (countdown <= 0) {
    phaseIndex = (phaseIndex + 1) % currentPattern().phases.length;
    applyPhase(phaseIndex);
  }
}

function start() {
  if (running) return;
  running    = true;
  phaseIndex = 0;
  circle.style.opacity = '0.85';
  countEl.style.color  = 'var(--accent)';
  phaseEl.style.color  = 'var(--fg)';
  applyPhase(0);
  ticker = setInterval(tick, 1000);
}

function pause() {
  if (!running) return;
  running = false;
  clearInterval(ticker);
  ticker = null;

  circle.classList.remove('tick');
  circle.style.transition  = 'transform 0.6s ease, border-width 0.6s ease, opacity 0.5s ease';
  circle.style.transform   = 'scale(1)';
  circle.style.borderWidth = '4px';
  circle.style.opacity     = '0.35';

  bgGlow.style.transition = 'transform 0.6s ease, opacity 0.5s ease';
  bgGlow.style.transform  = 'scale(0.35)';
  bgGlow.style.opacity    = '0';

  arcCircle.style.transition       = 'stroke-dashoffset 0.5s ease, opacity 0.4s ease';
  arcCircle.style.strokeDashoffset = String(ARC_TOTAL);
  arcCircle.style.opacity          = '0.1';

  phaseEl.classList.remove('phase-in');
  phaseEl.textContent = 'paused';
  phaseEl.style.color = 'var(--dim)';
  countEl.textContent = '–';
  countEl.style.color = 'var(--dim)';
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

buildThemePicker();

const savedTheme = (() => { try { return localStorage.getItem('breathe-theme'); } catch (_) { return null; } })();
applyTheme(savedTheme && THEMES[savedTheme] ? savedTheme : 'default');

setPattern('box');
