// --- Distraction Framework ---
const distractions = [
  mazeDistraction,
  wordleDistraction,
  // add more here later
];

const MIN_COOLDOWN = 10 * 1000;  // 10 seconds
const MAX_COOLDOWN = 500 * 60 * 1000; // 60 seconds

function getRandomCooldown() {
  return Math.floor(Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN + 1)) + MIN_COOLDOWN;
}

function launchRandomDistraction() {
  const pick = distractions[Math.floor(Math.random() * distractions.length)];
  pick(() => {
    const cooldown = getRandomCooldown();
    console.log(`[ChromeRot] Next distraction in ${cooldown / 1000}s`);
    setTimeout(launchRandomDistraction, cooldown);
  });
}

launchRandomDistraction();