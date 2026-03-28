const distractionMap = {
  maze: mazeDistraction,
  wordle: wordleDistraction,
  zip: zipDistraction,
  queens: queensDistraction,
};

const ACTIVITY_PING_MS = 1000;
let lastInteractionPingAt = 0;
let lastInteractionAt = Date.now();
let interactionOccurredSinceLastPing = false;
let contentScriptActive = true;
let activityIntervalId = null;
let isBlockingNudgeActive = false;
const NUDGES_SCRIPT_VERSION = "nudges-safe-v2";

console.log("[ChromeRot][Nudges][Content] loaded", NUDGES_SCRIPT_VERSION);

if (!document.getElementById("chromerot-nudge-style")) {
  const style = document.createElement("style");
  style.id = "chromerot-nudge-style";
  style.textContent = `
    @keyframes chromerotNudgePulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.015); }
      100% { transform: scale(1); }
    }

    @keyframes chromerotPresenceAlertPulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45), 0 24px 60px rgba(0, 0, 0, 0.72);
      }
      50% {
        transform: scale(1.035);
        box-shadow: 0 0 0 26px rgba(239, 68, 68, 0), 0 30px 78px rgba(0, 0, 0, 0.85);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 24px 60px rgba(0, 0, 0, 0.72);
      }
    }

    @keyframes chromerotPresenceAlertColor {
      0% { border-color: #f59e0b; color: #fbbf24; }
      40% { border-color: #f97316; color: #fb923c; }
      75% { border-color: #ef4444; color: #f87171; }
      100% { border-color: #f59e0b; color: #fbbf24; }
    }
  `;
  document.documentElement.appendChild(style);
}

function invalidateContext(reason) {
  if (!contentScriptActive) return;
  contentScriptActive = false;
  if (activityIntervalId) {
    clearInterval(activityIntervalId);
    activityIntervalId = null;
  }
  console.debug("[ChromeRot][Nudges][Content] disabled:", reason);
}

function safeSendMessage(payload, onResponse) {
  if (!contentScriptActive) return;

  try {
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      invalidateContext("runtime unavailable");
      return;
    }

    chrome.runtime.sendMessage(payload, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        const msg = err.message || "runtime error";
        if (
          msg.includes("Extension context invalidated") ||
          msg.includes("Receiving end does not exist") ||
          msg.includes("message port closed")
        ) {
          invalidateContext(msg);
          return;
        }
        console.debug("[ChromeRot][Nudges][Content] runtime warning:", msg);
        return;
      }

      if (onResponse) onResponse(response);
    });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes("Extension context invalidated")) {
      invalidateContext(msg);
      return;
    }
    console.debug("[ChromeRot][Nudges][Content] send failed:", msg);
  }
}

function launchDistraction(name) {
  const keys = Object.keys(distractionMap);
  const randomName = keys[Math.floor(Math.random() * keys.length)];
  const pick = distractionMap[name] || distractionMap[randomName];
  pick(onDistractionComplete);
}

function onDistractionComplete() {
  safeSendMessage({ type: "DISTRACTION_COMPLETE" });
}

function showSuggestionToast(suggestion) {
  if (!suggestion || !suggestion.message) return;
  if (isBlockingNudgeActive) return;

  if (suggestion.blockPage) {
    showBlockingNudgeOverlay(suggestion);
    return;
  }

  const existing = document.getElementById("chromerot-nudge-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "chromerot-nudge-toast";

  const isBreak = suggestion.tone === "break";
  const isPresence = suggestion.tone === "presence";
  const level = Math.max(1, Number(suggestion.level) || 1);
  const border = isPresence
    ? (level >= 3 ? "#f59e0b" : "#fbbf24")
    : (isBreak ? (level >= 3 ? "#34d399" : "#10b981") : (level >= 3 ? "#f87171" : "#ef4444"));
  const bg = isPresence ? "#17130a" : (level >= 3 ? "#1a1111" : "#0f1419");
  const pulse = level >= 3 ? "chromerotNudgePulse 1s ease-in-out infinite" : "none";
  const title = isPresence ? "Still There?" : (isBreak ? "Break Suggestion" : "Work Suggestion");

  toast.style.cssText = `
    position: fixed;
    right: 16px;
    bottom: 16px;
    max-width: 320px;
    padding: 12px 14px;
    background: ${bg};
    color: #e8eaed;
    border: 2px solid ${border};
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.45);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.35;
    z-index: 2147483647;
    animation: ${pulse};
  `;

  toast.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 4px; color: ${border};">${title}</div>
    <div style="font-size: 13px;">${suggestion.message}</div>
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4500);
}

function showBlockingNudgeOverlay(suggestion) {
  const existingToast = document.getElementById("chromerot-nudge-toast");
  if (existingToast) existingToast.remove();

  const existingBlock = document.getElementById("chromerot-nudge-block");
  if (existingBlock) existingBlock.remove();
  isBlockingNudgeActive = true;

  const isBreak = suggestion.tone === "break";
  const isPresence = suggestion.tone === "presence";
  const accent = isPresence ? "#f59e0b" : (isBreak ? "#10b981" : "#ef4444");

  const overlay = document.createElement("div");
  overlay.id = "chromerot-nudge-block";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: ${isPresence
      ? "radial-gradient(circle at center, rgba(127, 29, 29, 0.32) 0%, rgba(8, 11, 16, 0.98) 56%)"
      : "rgba(8, 11, 16, 0.97)"};
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width: min(560px, 92vw);
    background: #0f1419;
    border: 3px solid ${accent};
    border-radius: 14px;
    padding: 24px;
    color: #e8eaed;
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
    text-align: center;
    transform-origin: center;
    animation: ${isPresence ? "chromerotPresenceAlertPulse 0.46s cubic-bezier(0.19, 1, 0.22, 1) infinite" : "none"};
  `;

  const title = document.createElement("div");
  title.textContent = isPresence ? "PHONE CHECK-IN" : (isBreak ? "Break Required" : "Back To Work");
  title.style.cssText = `
    font-size: ${isPresence ? "1.85rem" : "1.4rem"};
    letter-spacing: ${isPresence ? "0.08em" : "0"};
    font-weight: 800;
    color: ${accent};
    margin-bottom: 8px;
    animation: ${isPresence ? "chromerotPresenceAlertColor 0.85s linear infinite" : "none"};
  `;

  const msg = document.createElement("div");
  msg.textContent = suggestion.message;
  msg.style.cssText = `
    font-size: ${isPresence ? "1.12rem" : "1rem"};
    line-height: 1.5;
    margin-bottom: 18px;
    font-weight: ${isPresence ? "700" : "400"};
  `;

  const hint = document.createElement("div");
  hint.textContent = isPresence
    ? "Click below to confirm you are back and focused."
    : (isBreak
      ? "Take a brief break. Try the Meditation Space for a quick reset."
      : "Close distractions and return to your main task.");
  hint.style.cssText = "font-size: 0.9rem; color: #a8aeb8; margin-bottom: 18px;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex; gap:10px; justify-content:center; flex-wrap:wrap;";

  if (isBreak) {
    const meditateBtn = document.createElement("button");
    meditateBtn.textContent = "Open Meditation Space";
    meditateBtn.style.cssText = `
      padding: 10px 16px;
      border-radius: 8px;
      border: 2px solid #5b6eee;
      background: #5b6eee;
      color: #0f1419;
      font-weight: 700;
      cursor: pointer;
    `;
    meditateBtn.addEventListener("click", () => {
      safeSendMessage({ type: "OPEN_MEDITATION_PAGE" });
    });
    actions.appendChild(meditateBtn);
  }

  const btn = document.createElement("button");
  btn.textContent = isPresence ? "I am here" : (isBreak ? "I took a short break" : "I am back to work");
  btn.style.cssText = `
    padding: 10px 16px;
    border-radius: 8px;
    border: 2px solid ${accent};
    background: ${accent};
    color: #0f1419;
    font-weight: 700;
    cursor: pointer;
  `;
  btn.addEventListener("click", () => {
    isBlockingNudgeActive = false;
    overlay.remove();
    safeSendMessage({ type: "ACK_NUDGE_BLOCK", tone: suggestion.tone });
  });
  actions.appendChild(btn);

  card.appendChild(title);
  card.appendChild(msg);
  card.appendChild(hint);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function pingActivity() {
  if (!contentScriptActive || isBlockingNudgeActive) return;

  const now = Date.now();
  const idleMs = now - lastInteractionAt;
  const interactionOccurred = interactionOccurredSinceLastPing;
  interactionOccurredSinceLastPing = false;

  safeSendMessage(
    {
      type: "ACTIVITY_PING",
      hostname: window.location.hostname,
      pageHasFocus: document.hasFocus(),
      idleMs,
      interactionOccurred,
    },
    (response) => {
      console.log("[ChromeRot][Nudges][Content] ping response", response);
      if (!isBlockingNudgeActive && response && response.suggestion) {
        console.log("[ChromeRot][Nudges][Content] showing suggestion", response.suggestion);
        showSuggestionToast(response.suggestion);
      }
    }
  );
}

function pingActivityFromInteraction() {
  const now = Date.now();
  lastInteractionAt = now;
  interactionOccurredSinceLastPing = true;
  if (now - lastInteractionPingAt < ACTIVITY_PING_MS) return;
  lastInteractionPingAt = now;
  pingActivity();
}

function checkAndLaunch() {
  if (!contentScriptActive) return;

  safeSendMessage({ type: "CHECK_DISTRACTION" }, (response) => {
    if (!contentScriptActive || !response) {
      if (contentScriptActive) setTimeout(checkAndLaunch, 5000);
      return;
    }

    if (response.launch) {
      launchDistraction(response.forced);
    } else {
      setTimeout(checkAndLaunch, response.remaining);
    }
  });
}

activityIntervalId = setInterval(pingActivity, ACTIVITY_PING_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) pingActivity();
});
document.addEventListener("mousemove", pingActivityFromInteraction, { passive: true });
document.addEventListener("keydown", pingActivityFromInteraction);
document.addEventListener("click", pingActivityFromInteraction);
document.addEventListener("scroll", pingActivityFromInteraction, { passive: true });
document.addEventListener("touchstart", pingActivityFromInteraction, { passive: true });
document.addEventListener("touchmove", pingActivityFromInteraction, { passive: true });

pingActivity();
checkAndLaunch();
