document.getElementById("btn-meditate").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("meditation.html") });
});

const focusBtn = document.getElementById("focusBtn");
const unproductiveBtn = document.getElementById("unproductiveBtn");
const nudgesToggle = document.getElementById("nudgesToggle");
const presenceToggle = document.getElementById("presenceToggle");
const status = document.getElementById("status");
const nudgesStatus = document.getElementById("nudgesStatus");
const presenceStatus = document.getElementById("presenceStatus");

let nudgesEnabled = false;
let presenceCheckinsEnabled = false;

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
