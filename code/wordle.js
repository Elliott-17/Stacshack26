function wordleDistraction(onComplete) {
  const WORDS = [
    "crane", "slate", "audio", "baker", "chair", "drive", "eagle", "flame",
    "grace", "haste", "ivory", "joker", "knave", "lemon", "manor", "nerve",
    "ocean", "pixel", "quest", "raven", "spine", "tiger", "umbra", "vivid",
    "waltz", "xenon", "yacht", "zonal", "blaze", "crimp", "depot", "elbow",
    "froze", "gloom", "havoc", "infer", "jumpy", "kiosk", "lithe", "mourn"
  ];

  const MAX_GUESSES = 6;
  let targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  let guesses = [];
  let currentGuess = "";
  let gameOver = false;

  // --- Container (fullscreen overlay) ---
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.9);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    color: white;
  `;

  const title = document.createElement("div");
  title.textContent = "ChudWordle";
  title.style.cssText = "font-size: 1.5rem; font-weight: bold; margin-bottom: 16px;";

  const subtitle = document.createElement("div");
  subtitle.textContent = "Guess the 5-letter word to continue.";
  subtitle.style.cssText = "font-size: 0.85rem; color: #aaa; margin-bottom: 20px;";

  // --- Grid ---
  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid;
    grid-template-rows: repeat(${MAX_GUESSES}, 1fr);
    gap: 6px;
    margin-bottom: 20px;
  `;

  const cells = [];
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement("div");
    row.style.cssText = "display: flex; gap: 6px;";
    cells.push([]);
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement("div");
      cell.style.cssText = `
        width: 52px; height: 52px;
        border: 2px solid #555;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; font-weight: bold;
        text-transform: uppercase;
        background: #111;
        transition: background 0.3s;
      `;
      cells[r].push(cell);
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }

  // --- Message ---
  const message = document.createElement("div");
  message.style.cssText = "font-size: 0.9rem; color: #f99; min-height: 20px; margin-bottom: 12px;";

  // --- Keyboard ---
  const keyboardRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const keyboard = document.createElement("div");
  keyboard.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 6px;";
  const keyElements = {};

  for (const row of keyboardRows) {
    const rowEl = document.createElement("div");
    rowEl.style.cssText = "display: flex; gap: 5px;";
    for (const letter of row) {
      const key = document.createElement("button");
      key.textContent = letter.toUpperCase();
      key.style.cssText = `
        width: 36px; height: 42px;
        background: #444; color: white;
        border: none; border-radius: 4px;
        font-size: 0.85rem; font-weight: bold;
        cursor: pointer;
      `;
      key.onclick = () => handleLetter(letter);
      keyElements[letter] = key;
      rowEl.appendChild(key);
    }
    keyboard.appendChild(rowEl);
  }

  // Enter + Backspace row
  const actionRow = document.createElement("div");
  actionRow.style.cssText = "display: flex; gap: 5px; margin-top: 2px;";

  const enterKey = document.createElement("button");
  enterKey.textContent = "ENTER";
  enterKey.style.cssText = `
    padding: 0 12px; height: 42px;
    background: #444; color: white;
    border: none; border-radius: 4px;
    font-size: 0.85rem; font-weight: bold; cursor: pointer;
  `;
  enterKey.onclick = submitGuess;

  const backKey = document.createElement("button");
  backKey.textContent = "⌫";
  backKey.style.cssText = enterKey.style.cssText;
  backKey.onclick = handleBackspace;

  actionRow.appendChild(enterKey);
  actionRow.appendChild(backKey);
  keyboard.appendChild(actionRow);

  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(grid);
  container.appendChild(message);
  container.appendChild(keyboard);
  document.body.appendChild(container);

  // --- Logic ---
  function updateGrid() {
    const currentRow = guesses.length;
    for (let c = 0; c < 5; c++) {
      cells[currentRow][c].textContent = currentGuess[c] ? currentGuess[c].toUpperCase() : "";
    }
  }

  function colorRow(rowIndex, guess, result) {
    for (let c = 0; c < 5; c++) {
      const color = result[c] === "correct" ? "#538d4e"
                  : result[c] === "present" ? "#b59f3b"
                  : "#3a3a3c";
      cells[rowIndex][c].style.background = color;
      cells[rowIndex][c].style.borderColor = color;

      const letter = guess[c];
      const key = keyElements[letter];
      if (key) {
        // Don't downgrade a correct key to present/absent
        const current = key.style.background;
        if (current !== "#538d4e") {
          key.style.background = color;
        }
      }
    }
  }

  function evaluateGuess(guess) {
    const result = Array(5).fill("absent");
    const targetArr = targetWord.split("");
    const guessArr = guess.split("");

    // First pass: correct
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = "correct";
        targetArr[i] = null;
        guessArr[i] = null;
      }
    }
    // Second pass: present
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] && targetArr.includes(guessArr[i])) {
        result[i] = "present";
        targetArr[targetArr.indexOf(guessArr[i])] = null;
      }
    }
    return result;
  }

  function submitGuess() {
    if (gameOver || currentGuess.length !== 5) {
      message.textContent = currentGuess.length !== 5 ? "Not enough letters!" : "";
      return;
    }

    const result = evaluateGuess(currentGuess);
    colorRow(guesses.length, currentGuess, result);
    guesses.push(currentGuess);

    if (currentGuess === targetWord) {
      message.textContent = "🎉 Nice one!";
      gameOver = true;
      showWinPopup();
      return;
    }

    if (guesses.length === MAX_GUESSES) {
      // Wrong — pick a new word and reset
      message.textContent = `❌ It was "${targetWord.toUpperCase()}" — try a new one!`;
      setTimeout(resetGame, 1800);
      return;
    }

    currentGuess = "";
    message.textContent = "";
  }

  function resetGame() {
    targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    guesses = [];
    currentGuess = "";
    gameOver = false;
    message.textContent = "";

    for (let r = 0; r < MAX_GUESSES; r++) {
      for (let c = 0; c < 5; c++) {
        cells[r][c].textContent = "";
        cells[r][c].style.background = "#111";
        cells[r][c].style.borderColor = "#555";
      }
    }
    for (const key of Object.values(keyElements)) {
      key.style.background = "#444";
    }
  }

  function handleLetter(letter) {
    if (gameOver || currentGuess.length >= 5) return;
    currentGuess += letter;
    updateGrid();
  }

  function handleBackspace() {
    if (gameOver || currentGuess.length === 0) return;
    currentGuess = currentGuess.slice(0, -1);
    updateGrid();
  }

  function showWinPopup() {
    const popup = document.createElement("div");
    popup.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: white; color: black;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 24px 32px;
      z-index: 999999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      font-family: monospace;
      text-align: center;
    `;
    popup.innerHTML = `
      <div style="font-size: 2rem;">🟩</div>
      <div style="font-size: 1.2rem; font-weight: bold; margin: 8px 0;">Wordle solved!</div>
      <div style="font-size: 0.85rem; color: #666;">Back to pretending to work.</div>
    `;
    document.body.appendChild(popup);
    document.removeEventListener("keydown", handleKeydown);
    setTimeout(() => {
      popup.remove();
      container.remove();
      onComplete();
    }, 2000);
  }

  // --- Physical keyboard support ---
  function handleKeydown(e) {
    if (gameOver) return;
    if (e.key === "Enter") submitGuess();
    else if (e.key === "Backspace") handleBackspace();
    else if (/^[a-zA-Z]$/.test(e.key)) handleLetter(e.key.toLowerCase());
  }
  document.addEventListener("keydown", handleKeydown);
}