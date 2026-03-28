let nextDistractionTime = null;
let forcedDistraction = null;
let activeDistraction = null; // tracks what's currently supposed to be showing
let mode = "focus";

const MIN_COOLDOWN = 10 * 1000;
const MAX_COOLDOWN = 30 * 1000;
const distractionMap = ["maze", "wordle", "zip", "queens"];

function getRandomCooldown() {
  return Math.floor(Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN + 1)) + MIN_COOLDOWN;
}

self.forceDistraction = (name) => {
  if (!distractionMap.includes(name)) {
    console.log(`[ChromeRot] Unknown distraction. Options: ${distractionMap.join(", ")}`);
    return;
  }
  forcedDistraction = name;
  nextDistractionTime = Date.now();
  console.log(`[ChromeRot] ${name} queued — navigate to any page to trigger it`);
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_MODE") {
    sendResponse({ mode });
  }

  if (msg.type === "SET_MODE") {
    mode = msg.mode;
    if (mode === "unproductive" && !nextDistractionTime) {
      nextDistractionTime = Date.now() + getRandomCooldown();
    }
    sendResponse({ ok: true });
  }

  if (msg.type === "CHECK_DISTRACTION") {
    if (mode !== "unproductive" && !forcedDistraction) {
      sendResponse({ launch: false, remaining: 5000 });
      return true;
    }

    // If a distraction was already active when the page refreshed, relaunch it
    if (activeDistraction) {
      sendResponse({ launch: true, forced: activeDistraction });
      return true;
    }

    const now = Date.now();
    if (!nextDistractionTime) nextDistractionTime = now + getRandomCooldown();

    const remaining = nextDistractionTime - now;
    console.log("Time to next distraction: " + remaining);

    if (remaining <= 0) {
      const forced = forcedDistraction;
      forcedDistraction = null;
      // Pick and lock in which distraction is active
      activeDistraction = forced || distractionMap[Math.floor(Math.random() * distractionMap.length)];
      sendResponse({ launch: true, forced: activeDistraction });
    } else {
      sendResponse({ launch: false, remaining });
    }
  }

  // Only clear activeDistraction when the user actually completes it
  if (msg.type === "DISTRACTION_COMPLETE") {
    activeDistraction = null;
    nextDistractionTime = Date.now() + getRandomCooldown();
  }

  return true;
});