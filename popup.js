document.getElementById("btn-meditate").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("meditation.html") });
});

const focusBtn = document.getElementById("focusBtn");
const unproductiveBtn = document.getElementById("unproductiveBtn");
const mainTabBtn = document.getElementById("mainTabBtn");
const settingsTabBtn = document.getElementById("settingsTabBtn");
const mainTab = document.getElementById("mainTab");
const mainTabExtras = document.getElementById("mainTabExtras");
const settingsTab = document.getElementById("settingsTab");
const nudgesToggle = document.getElementById("nudgesToggle");
const presenceToggle = document.getElementById("presenceToggle");
const productiveSecondsInput = document.getElementById("productiveSeconds");
const unproductiveSecondsInput = document.getElementById("unproductiveSeconds");
const presenceSecondsInput = document.getElementById("presenceSeconds");
const saveTimingBtn = document.getElementById("saveTimingBtn");
const status = document.getElementById("status");
const nudgesStatus = document.getElementById("nudgesStatus");
const presenceStatus = document.getElementById("presenceStatus");
const timingStatus = document.getElementById("timingStatus");

let nudgesEnabled = false;
let presenceCheckinsEnabled = false;

function setActiveTab(tab) {
  const showMain = tab === "main";

  if (mainTab) mainTab.classList.toggle("active", showMain);
  if (mainTabExtras) mainTabExtras.classList.toggle("active", showMain);
  if (settingsTab) settingsTab.classList.toggle("active", !showMain);

  if (mainTabBtn) mainTabBtn.classList.toggle("active", showMain);
  if (settingsTabBtn) settingsTabBtn.classList.toggle("active", !showMain);
}

function setModeUI(mode) {
  focusBtn.className = mode === "focus" ? "active-focus" : "";
  unproductiveBtn.className = mode === "unproductive" ? "active-unproductive" : "";

  if (mode === "focus") {
    status.textContent = "Distractions disabled";
  } else if (mode === "unproductive") {
    status.textContent = "Distractions enabled";
  } else {
    status.textContent = "Select a mode";
  }
}

function setNudgesUI(enabled) {
  nudgesEnabled = enabled;
  nudgesToggle.className = enabled ? "active-nudges-on" : "active-nudges-off";
  nudgesToggle.textContent = enabled ? "Nudges: On" : "Nudges: Off";
  nudgesStatus.textContent = enabled
    ? "Will suggest breaks/work based on browsing time"
    : "Smart nudges disabled";
}

function setPresenceUI(enabled) {
  presenceCheckinsEnabled = enabled;
  presenceToggle.className = enabled ? "active-nudges-on" : "active-nudges-off";
  presenceToggle.textContent = enabled ? "Check-ins: On" : "Check-ins: Off";
  presenceStatus.textContent = enabled
    ? "Checks for inactivity and escalates if ignored"
    : "Presence check-ins disabled";
}

function setTimerInputs(settings) {
  if (!settings) return;
  productiveSecondsInput.value = Number(settings.productiveThresholdSeconds) || 10;
  unproductiveSecondsInput.value = Number(settings.unproductiveThresholdSeconds) || 10;
  presenceSecondsInput.value = Number(settings.presenceIdleThresholdSeconds) || 5;
}

function positiveSeconds(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.round(n);
}

chrome.runtime.sendMessage({ type: "GET_MODE" }, (response) => {
  if (response && response.mode) {
    setModeUI(response.mode);
  }
});

chrome.runtime.sendMessage({ type: "GET_NUDGE_SETTINGS" }, (response) => {
  setNudgesUI(Boolean(response && response.enabled));
  if (response && Object.prototype.hasOwnProperty.call(response, "presenceEnabled")) {
    setPresenceUI(Boolean(response.presenceEnabled));
  }
});

chrome.runtime.sendMessage({ type: "GET_PRESENCE_CHECKIN_SETTINGS" }, (response) => {
  setPresenceUI(Boolean(response && response.enabled));
});

chrome.runtime.sendMessage({ type: "GET_TIMER_SETTINGS" }, (response) => {
  if (!response || !response.ok) {
    timingStatus.textContent = "Could not load timings";
    return;
  }
  setTimerInputs(response);
  timingStatus.textContent = "Timings loaded";
});

focusBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SET_MODE", mode: "focus" }, () => {
    setModeUI("focus");
  });
});

unproductiveBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SET_MODE", mode: "unproductive" }, () => {
    setModeUI("unproductive");
  });
});

nudgesToggle.addEventListener("click", () => {
  const next = !nudgesEnabled;
  chrome.runtime.sendMessage({ type: "SET_NUDGE_SETTINGS", enabled: next }, (response) => {
    if (response && response.ok) {
      setNudgesUI(response.enabled);
      if (Object.prototype.hasOwnProperty.call(response, "presenceEnabled")) {
        setPresenceUI(Boolean(response.presenceEnabled));
      }
    }
  });
});

presenceToggle.addEventListener("click", () => {
  const next = !presenceCheckinsEnabled;
  chrome.runtime.sendMessage({ type: "SET_PRESENCE_CHECKIN_SETTINGS", enabled: next }, (response) => {
    if (response && response.ok) {
      setPresenceUI(Boolean(response.enabled));
    }
  });
});

saveTimingBtn.addEventListener("click", () => {
  const payload = {
    type: "SET_TIMER_SETTINGS",
    productiveThresholdSeconds: positiveSeconds(productiveSecondsInput.value, 10),
    unproductiveThresholdSeconds: positiveSeconds(unproductiveSecondsInput.value, 10),
    presenceIdleThresholdSeconds: positiveSeconds(presenceSecondsInput.value, 5),
  };

  chrome.runtime.sendMessage(payload, (response) => {
    if (!response || !response.ok) {
      timingStatus.textContent = "Failed to save timings";
      return;
    }
    setTimerInputs(response);
    timingStatus.textContent = "Timings saved";
  });
});

if (mainTabBtn && settingsTabBtn) {
  mainTabBtn.addEventListener("click", () => setActiveTab("main"));
  settingsTabBtn.addEventListener("click", () => setActiveTab("settings"));
}

setActiveTab("main");
