document.getElementById('btn-meditate').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('meditation.html') });
});

const focusBtn = document.getElementById("focusBtn");
const unproductiveBtn = document.getElementById("unproductiveBtn");
const status = document.getElementById("status");
const subtitle = document.getElementById("subtitle");

function setUI(mode) {
  focusBtn.className = mode === "focus" ? "active-focus" : "";
  unproductiveBtn.className = mode === "unproductive" ? "active-unproductive" : "";
  if (mode === "focus") {
    subtitle.textContent = "v0.1 — focus mode";
    status.textContent = "✓ Distractions disabled";
  } else if (mode === "unproductive") {
    subtitle.textContent = "v0.1 — unproductive mode";
    status.textContent = "✓ Distractions enabled";
  } else {
    subtitle.textContent = "v0.1 — select a mode";
    status.textContent = "";
  }
}

// Load current mode on open
chrome.runtime.sendMessage({ type: "GET_MODE" }, (response) => {
  setUI(response.mode);
});

focusBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SET_MODE", mode: "focus" }, () => {
    setUI("focus");
  });
});

unproductiveBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SET_MODE", mode: "unproductive" }, () => {
    setUI("unproductive");
  });
});