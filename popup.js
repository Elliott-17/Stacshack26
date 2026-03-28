document.getElementById('btn-meditate').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('meditation.html') });
});
