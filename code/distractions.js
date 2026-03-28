const distractionMap = {
  maze: mazeDistraction,
  wordle: wordleDistraction,
  zip: zipDistraction,
  queens: queensDistraction,
};

function launchDistraction(name) {
  const pick = distractionMap[name] || distractionMap[Object.keys(distractionMap)[Math.floor(Math.random() * Object.keys(distractionMap).length)]];
  pick(onDistractionComplete);
}

function onDistractionComplete() {
  chrome.runtime.sendMessage({ type: "DISTRACTION_COMPLETE" });
}

function checkAndLaunch() {
  chrome.runtime.sendMessage({ type: "CHECK_DISTRACTION" }, (response) => {
    if (response.launch) {
      launchDistraction(response.forced);
    } else {
      setTimeout(checkAndLaunch, response.remaining);
    }
  });
}

checkAndLaunch();