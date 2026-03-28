let nextDistractionTime = null;
let forcedDistraction = null;
let activeDistraction = null;
let mode = "focus";

let nudgesEnabled = false;
let presenceCheckinsEnabled = false;
const presenceByTab = {};
const PRESENCE_IDLE_THRESHOLD_MS = 5000;
const PRESENCE_CHECKIN_COOLDOWN_MS = 5000;
let lastNudgeAt = 0;
const DEBUG_NUDGES = true;

const MIN_COOLDOWN = 10 * 1000;
const MAX_COOLDOWN = 30 * 1000;
const distractionMap = ["maze", "wordle", "zip", "queens"];

const PRODUCTIVE_THRESHOLD_MS = 10000;
const UNPRODUCTIVE_THRESHOLD_MS = 10000;
const NUDGE_COOLDOWN_MS = 5000;
const MAX_HEARTBEAT_DELTA_MS = 1000;
const NUDGE_ESCALATION_WINDOW_MS = 20000; 
const NUDGE_BLOCK_LEVEL = 4;
const nudgeEscalation = {
  break: { level: 0, lastAt: 0 },
  work: { level: 0, lastAt: 0 },
  presence: { level: 0, lastAt: 0 },
};
const productiveTotals = { ms: 0 };
const unproductiveTotals = { ms: 0 };
  nudgeEscalation.presence.level = 0;
  nudgeEscalation.presence.lastAt = 0;
  Object.keys(presenceByTab).forEach((k) => delete presenceByTab[k]);
const lastByTab = {};


function debugLog(...args) {
  if (!DEBUG_NUDGES) return;
  console.log("[ChromeRot][Nudges]", ...args);
}

const PRODUCTIVE_SITES = [
  "github.com",
  "stackoverflow.com",
  "leetcode.com",
  "docs.",
  "developer.mozilla.org",
  "w3schools.com",
  "notion.so",
  "calendar.google.com",
  "jira",
  "linear.app",
  "figma.com",
  "chat.openai.com",
  "typst.app",
  "overleaf.com",
];

const UNPRODUCTIVE_SITES = [
    "youtube.com",
    "reddit.com",
    "x.com",
    "twitter.com",
    "instagram.com",
    "tiktok.com",
    "netflix.com",
    "hulu.com",
    "disneyplus.com",
    "primevideo.com",
    "spotify.com",
    "soundcloud.com",
    "9gag.com",
    "buzzfeed.com",
    "boredpanda.com",
    "imdb.com",
    "rotten tomatoes",
    "espn.com",
    "cnn.com",
    "bbc.com",
    "news.ycombinator.com",
    "medium.com",
    "quora.com",
    "pinterest.com",
    "twitch.tv",
    "facebook.com",
    "nytimes.com",
];

function getRandomCooldown() {
  return Math.floor(Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN + 1)) + MIN_COOLDOWN;
}

function hostnameMatches(hostname, pattern) {
  return hostname === pattern || hostname.endsWith(`.${pattern}`) || hostname.includes(pattern);
}

function classifySite(hostname) {
  const host = (hostname || "").toLowerCase().replace(/^www\./, "");
  if (!host) return null;

  if (PRODUCTIVE_SITES.some((site) => hostnameMatches(host, site))) {
    debugLog("classifySite", host, "=> productive");
    return "productive";
  }
  if (UNPRODUCTIVE_SITES.some((site) => hostnameMatches(host, site))) {
    debugLog("classifySite", host, "=> unproductive");
    return "unproductive";
  }
  debugLog("classifySite", host, "=> ignored");
  return null;
}

function resetNudgeTracking() {
  productiveTotals.ms = 0;
  unproductiveTotals.ms = 0;
  lastNudgeAt = 0;
  Object.keys(lastByTab).forEach((k) => delete lastByTab[k]);
  nudgeEscalation.break.level = 0;
  nudgeEscalation.break.lastAt = 0;
  nudgeEscalation.work.level = 0;
  nudgeEscalation.work.lastAt = 0;
  debugLog("resetNudgeTracking");
}

function buildEscalatedSuggestion(tone, now) {
  const state = nudgeEscalation[tone];
  if (now - state.lastAt > NUDGE_ESCALATION_WINDOW_MS) {
    state.level = 0;
  }

  state.level = Math.min(state.level + 1, NUDGE_BLOCK_LEVEL);
  state.lastAt = now;

  let message = "";
  if (tone === "break") {
    if (state.level === 1) message = "You have been productive for a while. Take a short break.";
    if (state.level === 2) message = "Reminder: step away for 2 minutes to reset focus.";
    if (state.level === 3) message = "Strong reminder: take a break now before continuing.";
    if (state.level >= NUDGE_BLOCK_LEVEL) message = "You really should take a break. Page is paused until you acknowledge.";
  } else {
    if (tone === "work") {
      if (state.level === 1) message = "You have been unproductive for a while. Time to get back to work.";
      if (state.level === 2) message = "Reminder: close distractions and return to your task.";
      if (state.level === 3) message = "Strong reminder: you need to get back to work now.";
      if (state.level >= NUDGE_BLOCK_LEVEL) message = "Stop procrastinating, time to work. Page is paused until you acknowledge.";
    } else {
      if (state.level === 1) message = "Still there? Quick check-in: come back when you can.";
      if (state.level === 2) message = "No activity detected. If you are doomscrolling on your phone, switch back now.";
      if (state.level === 3) message = "Still no activity. Put the phone down and refocus on this page.";
      if (state.level >= NUDGE_BLOCK_LEVEL) message = "PUT YOUR PHONE DOWN. REELS ARE NOT THAT GOOD. Please get back to work.";
    }
  }

  const suggestion = {
    tone,
    level: state.level,
    blockPage: state.level >= NUDGE_BLOCK_LEVEL,
    message,
  };

  debugLog("buildEscalatedSuggestion", suggestion);
  return suggestion;
}

function maybeBuildSuggestion(now, tabId, idleMs, interactionOccurred) {
  const sinceLast = now - lastNudgeAt;
  if (sinceLast < NUDGE_COOLDOWN_MS) {
    debugLog("maybeBuildSuggestion", "cooldown active", {
      sinceLast,
      cooldown: NUDGE_COOLDOWN_MS,
      productiveMs: productiveTotals.ms,
      unproductiveMs: unproductiveTotals.ms,
    });
    return null;
  }

  if (nudgesEnabled && productiveTotals.ms >= PRODUCTIVE_THRESHOLD_MS) {
    productiveTotals.ms = 0;
    lastNudgeAt = now;
    const suggestion = buildEscalatedSuggestion("break", now);
    debugLog("SUGGESTION", "break", {
      productiveThreshold: PRODUCTIVE_THRESHOLD_MS,
      unproductiveMs: unproductiveTotals.ms,
      lastNudgeAt,
      level: suggestion.level,
      blockPage: suggestion.blockPage,
    });
    return suggestion;
  }

  if (nudgesEnabled && unproductiveTotals.ms >= UNPRODUCTIVE_THRESHOLD_MS) {
    unproductiveTotals.ms = 0;
    lastNudgeAt = now;
    const suggestion = buildEscalatedSuggestion("work", now);
    debugLog("SUGGESTION", "work", {
      unproductiveThreshold: UNPRODUCTIVE_THRESHOLD_MS,
      productiveMs: productiveTotals.ms,
      lastNudgeAt,
      level: suggestion.level,
      blockPage: suggestion.blockPage,
    });
    return suggestion;
  }

  if (presenceCheckinsEnabled && typeof tabId === "number" && typeof idleMs === "number") {
    if (!presenceByTab[tabId]) {
      presenceByTab[tabId] = { lastPresenceNudgeAt: 0 };
    }
    const tabPresence = presenceByTab[tabId];

    if (
      idleMs >= PRESENCE_IDLE_THRESHOLD_MS &&
      now - tabPresence.lastPresenceNudgeAt >= PRESENCE_CHECKIN_COOLDOWN_MS &&
      !interactionOccurred
    ) {
      tabPresence.lastPresenceNudgeAt = now;
      const suggestion = buildEscalatedSuggestion("presence", now);
      debugLog("SUGGESTION", "presence", {
        tabId,
        idleMs,
        threshold: PRESENCE_IDLE_THRESHOLD_MS,
        checkinCooldown: PRESENCE_CHECKIN_COOLDOWN_MS,
        level: suggestion.level,
      });
      return suggestion;
    }
  }

  debugLog("maybeBuildSuggestion", "no suggestion", {
    productiveMs: productiveTotals.ms,
    productiveThreshold: PRODUCTIVE_THRESHOLD_MS,
    unproductiveMs: unproductiveTotals.ms,
    unproductiveThreshold: UNPRODUCTIVE_THRESHOLD_MS,
    sinceLast,
  });

  return null;
}

function recordActivity(tabId, hostname, now, idleMs, interactionOccurred) {
  const category = classifySite(hostname);
  const prev = lastByTab[tabId];

  debugLog("recordActivity", {
    tabId,
    hostname,
    category,
    hasPrev: Boolean(prev),
    prevCategory: prev ? prev.category : null,
    prevTimestamp: prev ? prev.timestamp : null,
    now,
  });

  if (prev && prev.category && prev.timestamp) {
    const delta = now - prev.timestamp;
    if (delta > 0) {
      const boundedDelta = Math.min(delta, MAX_HEARTBEAT_DELTA_MS);
      if (prev.category === "productive") productiveTotals.ms += boundedDelta;
      if (prev.category === "unproductive") unproductiveTotals.ms += boundedDelta;
      debugLog("recordActivity", "delta counted", {
        rawDelta: delta,
        boundedDelta,
        maxDelta: MAX_HEARTBEAT_DELTA_MS,
        countedAs: prev.category,
        productiveMs: productiveTotals.ms,
        unproductiveMs: unproductiveTotals.ms,
      });
      if (delta > MAX_HEARTBEAT_DELTA_MS) {
        debugLog("recordActivity", "delta exceeded max, capped", {
          rawDelta: delta,
          cappedTo: boundedDelta,
        });
      }
    } else {
      debugLog("recordActivity", "delta ignored", {
        delta,
        maxDelta: MAX_HEARTBEAT_DELTA_MS,
      });
    }
  }

  lastByTab[tabId] = {
    category,
    timestamp: now,
  };

  if (interactionOccurred && nudgeEscalation.presence.level > 0) {
    nudgeEscalation.presence.level = Math.max(0, nudgeEscalation.presence.level - 1);
    nudgeEscalation.presence.lastAt = now;
    debugLog("presence", "interaction detected, easing level", {
      tabId,
      level: nudgeEscalation.presence.level,
    });
  }

  return maybeBuildSuggestion(now, tabId, idleMs, interactionOccurred);
}

self.forceDistraction = (name) => {
  if (!distractionMap.includes(name)) {
    console.log(`[ChromeRot] Unknown distraction. Options: ${distractionMap.join(", ")}`);
    return;
  }
  forcedDistraction = name;
  nextDistractionTime = Date.now();
  console.log(`[ChromeRot] ${name} queued - navigate to any page to trigger it`);
};

debugLog("boot", {
  PRODUCTIVE_THRESHOLD_MS,
  UNPRODUCTIVE_THRESHOLD_MS,
  NUDGE_COOLDOWN_MS,
  MAX_HEARTBEAT_DELTA_MS,
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete lastByTab[tabId];
  delete presenceByTab[tabId];
  debugLog("tabRemoved", tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  debugLog("message", msg && msg.type, {
    tabId: sender && sender.tab ? sender.tab.id : null,
    hostname: msg && msg.hostname ? msg.hostname : null,
  });

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

  if (msg.type === "GET_NUDGE_SETTINGS") {
    sendResponse({ enabled: nudgesEnabled, presenceEnabled: presenceCheckinsEnabled });
  }

  if (msg.type === "SET_NUDGE_SETTINGS") {
    nudgesEnabled = Boolean(msg.enabled);
    resetNudgeTracking();
    debugLog("SET_NUDGE_SETTINGS", { enabled: nudgesEnabled });
    sendResponse({ ok: true, enabled: nudgesEnabled, presenceEnabled: presenceCheckinsEnabled });
  }

  if (msg.type === "GET_PRESENCE_CHECKIN_SETTINGS") {
    sendResponse({ enabled: presenceCheckinsEnabled });
  }

  if (msg.type === "SET_PRESENCE_CHECKIN_SETTINGS") {
    presenceCheckinsEnabled = Boolean(msg.enabled);
    resetNudgeTracking();
    debugLog("SET_PRESENCE_CHECKIN_SETTINGS", { enabled: presenceCheckinsEnabled });
    sendResponse({ ok: true, enabled: presenceCheckinsEnabled });
  }

  if (msg.type === "ACK_NUDGE_BLOCK") {
    const tone = msg.tone === "break" ? "break" : (msg.tone === "presence" ? "presence" : "work");
    nudgeEscalation[tone].level = Math.max(1, nudgeEscalation[tone].level - 2);
    nudgeEscalation[tone].lastAt = Date.now();
    debugLog("ACK_NUDGE_BLOCK", { tone, level: nudgeEscalation[tone].level });
    sendResponse({ ok: true });
  }

  if (msg.type === "ACTIVITY_PING") {
    if (!nudgesEnabled && !presenceCheckinsEnabled) {
      debugLog("ACTIVITY_PING", "ignored because all features disabled");
      sendResponse({ suggestion: null });
      return true;
    }

    const tabId = sender && sender.tab ? sender.tab.id : null;
    if (typeof tabId !== "number") {
      debugLog("ACTIVITY_PING", "ignored because no tab id");
      sendResponse({ suggestion: null });
      return true;
    }

    const now = Date.now();
    const idleMs = Number(msg.idleMs) || 0;
    const interactionOccurred = Boolean(msg.interactionOccurred);
    const suggestion = recordActivity(tabId, msg.hostname, now, idleMs, interactionOccurred);
    debugLog("ACTIVITY_PING", "response", { suggestion });
    sendResponse({ suggestion });
    return true;
  }

  if (msg.type === "CHECK_DISTRACTION") {
    if (mode !== "unproductive" && !forcedDistraction) {
      sendResponse({ launch: false, remaining: 5000 });
      return true;
    }

    if (activeDistraction) {
      sendResponse({ launch: true, forced: activeDistraction });
      return true;
    }

    const now = Date.now();
    if (!nextDistractionTime) nextDistractionTime = now + getRandomCooldown();

    const remaining = nextDistractionTime - now;
    debugLog("CHECK_DISTRACTION", { mode, forcedDistraction, remaining, activeDistraction });
    if (remaining <= 0) {
      const forced = forcedDistraction;
      forcedDistraction = null;
      activeDistraction = forced || distractionMap[Math.floor(Math.random() * distractionMap.length)];
      sendResponse({ launch: true, forced: activeDistraction });
    } else {
      sendResponse({ launch: false, remaining });
    }
  }

  if (msg.type === "DISTRACTION_COMPLETE") {
    activeDistraction = null;
    nextDistractionTime = Date.now() + getRandomCooldown();
    debugLog("DISTRACTION_COMPLETE", { nextDistractionTime });
  }

  return true;
});
