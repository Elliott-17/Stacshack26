function zipDistraction(onComplete) {
  const TIME_LIMIT = 60;

  const PUZZLES = [
    {
      size: 5,
      waypoints: {
        "0,0": 1, "0,4": 2, "4,4": 3, "4,0": 4, "2,2": 5
      }
    },
    // 7x7 - snake through quadrants
    {
      size: 7,
      waypoints: {
        "0,0": 1, "0,3": 2, "0,6": 3,
        "3,6": 4, "3,3": 5, "3,0": 6,
        "6,0": 7, "6,3": 8, "6,6": 9
      }
    },
    // 8x8 - spiral inward
    {
      size: 8,
      waypoints: {
        "0,0": 1, "0,7": 2,
        "7,7": 3, "7,0": 4,
        "2,2": 5, "2,5": 6,
        "5,5": 7, "5,2": 8,
        "3,3": 9
      }
    },
    // 8x8 - cross pattern forcing long detours
    {
      size: 8,
      waypoints: {
        "0,0": 1, "0,4": 2, "0,7": 3,
        "4,7": 4, "4,4": 5, "4,0": 6,
        "7,0": 7, "7,4": 8, "7,7": 9
      }
    },
    // 9x9 - maximum chaos
    {
      size: 9,
      waypoints: {
        "0,0": 1,  "0,8": 2,
        "4,8": 3,  "4,4": 4,  "4,0": 5,
        "8,0": 6,  "8,4": 7,  "8,8": 8,
        "2,2": 9,  "2,6": 10,
        "6,6": 11, "6,2": 12
      }
    },
    // 6x6 - deceptively simple looking
    {
      size: 6,
      waypoints: {
        "0,0": 1, "0,5": 2,
        "2,5": 3, "2,3": 4, "2,0": 5,
        "4,0": 6, "4,3": 7, "4,5": 8,
        "5,5": 9
      }
    },
    // 7x7 - waypoints near centre force awkward routing
    {
      size: 7,
      waypoints: {
        "0,0": 1, "1,3": 2, "0,6": 3,
        "3,5": 4, "3,1": 5,
        "6,0": 6, "5,3": 7, "6,6": 8
      }
    },
  ];

  let puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  let size = puzzle.size;
  let waypoints = puzzle.waypoints;
  let CELL = Math.floor(Math.min(window.innerWidth * 0.85, window.innerHeight * 0.78) / size);

  let path = [];
  let isDragging = false;
  let timerInterval = null;
  let timeLeft = TIME_LIMIT;
  let gameOver = false;

  // --- Container ---
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.92);
    z-index: 99999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: monospace; color: white;
    user-select: none;
  `;

  const title = document.createElement("div");
  title.textContent = "⚡ Zip";
  title.style.cssText = "font-size: 1.5rem; font-weight: bold; margin-bottom: 6px;";

  const subtitle = document.createElement("div");
  subtitle.style.cssText = "font-size: 0.8rem; color: #aaa; margin-bottom: 12px;";
  subtitle.textContent = "Connect 1→2→3… filling every cell. End on the last number!";

  // Timer bar
  const timerWrap = document.createElement("div");
  timerWrap.style.cssText = `
    width: ${size * CELL}px; height: 8px;
    background: #333; border-radius: 4px;
    margin-bottom: 10px; overflow: hidden;
  `;
  const timerBar = document.createElement("div");
  timerBar.style.cssText = `
    height: 100%; width: 100%;
    background: #4caf50;
    transition: width 1s linear, background 0.5s;
  `;
  timerWrap.appendChild(timerBar);

  const timerLabel = document.createElement("div");
  timerLabel.style.cssText = "font-size: 0.85rem; color: #aaa; margin-bottom: 10px;";
  timerLabel.textContent = `${TIME_LIMIT}s`;

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.width = size * CELL;
  canvas.height = size * CELL;
  canvas.style.cssText = "cursor: crosshair; border-radius: 6px;";
  const ctx = canvas.getContext("2d");

  const message = document.createElement("div");
  message.style.cssText = "font-size: 0.85rem; color: #f99; min-height: 20px; margin-top: 10px;";

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺ Reset path";
  resetBtn.style.cssText = `
    margin-top: 8px; padding: 6px 16px;
    background: #333; color: white; border: 1px solid #555;
    border-radius: 6px; cursor: pointer; font-family: monospace;
  `;
  resetBtn.onclick = resetPath;

  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(timerWrap);
  container.appendChild(timerLabel);
  container.appendChild(canvas);
  container.appendChild(message);
  container.appendChild(resetBtn);
  document.body.appendChild(container);

  // --- Drawing ---
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxWaypoint = Math.max(...Object.values(waypoints));

    // Grid background
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    // Path line
    if (path.length > 1) {
      ctx.strokeStyle = "#7b68ee";
      ctx.lineWidth = CELL * 0.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const [r0, c0] = path[0].split(",").map(Number);
      ctx.moveTo(c0 * CELL + CELL / 2, r0 * CELL + CELL / 2);
      for (let i = 1; i < path.length; i++) {
        const [r, c] = path[i].split(",").map(Number);
        ctx.lineTo(c * CELL + CELL / 2, r * CELL + CELL / 2);
      }
      ctx.stroke();
    }

    // Visited cells highlight
    for (const key of path) {
      const [r, c] = key.split(",").map(Number);
      ctx.fillStyle = "rgba(123,104,238,0.2)";
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    }

    // Waypoints
    for (const [key, num] of Object.entries(waypoints)) {
      const [r, c] = key.split(",").map(Number);
      const visited = path.includes(key);
      const isFinal = num === maxWaypoint;

      // Circle fill
      ctx.fillStyle = visited ? "#7b68ee" : "#2a2a4a";
      ctx.beginPath();
      ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Gold ring for final waypoint
      if (isFinal) {
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL * 0.38, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Number label
      ctx.fillStyle = "white";
      ctx.font = `bold ${CELL * 0.38}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(num, c * CELL + CELL / 2, r * CELL + CELL / 2);
    }
  }

  // --- Path logic ---
  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const c = Math.floor((clientX - rect.left) / CELL);
    const r = Math.floor((clientY - rect.top) / CELL);
    if (r >= 0 && r < size && c >= 0 && c < size) return `${r},${c}`;
    return null;
  }

  function isAdjacent(a, b) {
    const [r1, c1] = a.split(",").map(Number);
    const [r2, c2] = b.split(",").map(Number);
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  function nextExpectedWaypoint() {
    let max = 0;
    for (const k of path) {
      if (waypoints[k] && waypoints[k] > max) max = waypoints[k];
    }
    return max + 1;
  }

  function tryAddCell(key) {
    if (!key || gameOver) return;

    // Backtrack if revisiting a cell already in path
    const idx = path.indexOf(key);
    if (idx !== -1) {
      path = path.slice(0, idx + 1);
      message.textContent = "";
      draw();
      return;
    }

    if (path.length === 0) {
      if (waypoints[key] !== 1) {
        message.textContent = "Start at 1!";
        return;
      }
      path = [key];
      message.textContent = "";
      draw();
      return;
    }

    const last = path[path.length - 1];
    if (!isAdjacent(last, key)) return;

    // If moving to a waypoint, it must be the next expected one
    if (waypoints[key]) {
      const expected = nextExpectedWaypoint();
      if (waypoints[key] !== expected) {
        message.textContent = `Must visit ${expected} next!`;
        return;
      }
    }

    message.textContent = "";
    path.push(key);
    draw();
    checkWin();
  }

  function checkWin() {
    const allWaypointsVisited = Object.keys(waypoints).every(k => path.includes(k));
    const allCellsFilled = path.length === size * size;
    const lastIsWaypoint = waypoints[path[path.length - 1]] !== undefined;

    if (allWaypointsVisited && allCellsFilled && lastIsWaypoint) {
      gameOver = true;
      clearInterval(timerInterval);
      showPopup(true);
    }
  }

  function resetPath() {
    path = [];
    message.textContent = "";
    draw();
  }

  function loadPuzzle(p) {
    puzzle = p;
    size = puzzle.size;
    waypoints = puzzle.waypoints;
    CELL = Math.floor(Math.min(window.innerWidth * 0.85, window.innerHeight * 0.78) / size);

    canvas.width = size * CELL;
    canvas.height = size * CELL;
    timerWrap.style.width = `${size * CELL}px`;

    path = [];
    timeLeft = TIME_LIMIT;
    gameOver = false;
    timerBar.style.width = "100%";
    timerBar.style.background = "#4caf50";
    timerLabel.textContent = `${TIME_LIMIT}s`;
    message.textContent = "";
  }

  // --- Timer ---
  function startTimer() {
    timerInterval = setInterval(() => {
      timeLeft--;
      timerLabel.textContent = `${timeLeft}s`;
      timerBar.style.width = `${(timeLeft / TIME_LIMIT) * 100}%`;
      timerBar.style.background = timeLeft <= 10 ? "#e53935" : timeLeft <= 20 ? "#ff9800" : "#4caf50";

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (!gameOver) {
          gameOver = true;
          showPopup(false);
        }
      }
    }, 1000);
  }

  // --- Mouse/touch events ---
  canvas.addEventListener("mousedown", e => {
    isDragging = true;
    tryAddCell(cellFromEvent(e));
  });
  canvas.addEventListener("mousemove", e => {
    if (isDragging) tryAddCell(cellFromEvent(e));
  });
  canvas.addEventListener("mouseup", () => isDragging = false);
  canvas.addEventListener("touchstart", e => { e.preventDefault(); isDragging = true; tryAddCell(cellFromEvent(e)); });
  canvas.addEventListener("touchmove", e => { e.preventDefault(); if (isDragging) tryAddCell(cellFromEvent(e)); });
  canvas.addEventListener("touchend", () => isDragging = false);

  // --- Popup ---
  function showPopup(won) {
    const popup = document.createElement("div");
    popup.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: white; color: black;
      border: 2px solid #333; border-radius: 12px;
      padding: 24px 32px; z-index: 999999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      font-family: monospace; text-align: center;
    `;

    if (won) {
      popup.innerHTML = `
        <div style="font-size:2rem">⚡</div>
        <div style="font-size:1.2rem;font-weight:bold;margin:8px 0">Zipped it!</div>
        <div style="font-size:0.85rem;color:#666">Back to being unproductive in a different way.</div>
      `;
    } else {
      popup.innerHTML = `
        <div style="font-size:2rem">⏱️</div>
        <div style="font-size:1.2rem;font-weight:bold;margin:8px 0">Too slow!</div>
        <div style="font-size:0.85rem;color:#666">New puzzle incoming…</div>
      `;
    }

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
      if (won) {
        container.remove();
        onComplete();
      } else {
        loadPuzzle(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]);
        draw();
        startTimer();
      }
    }, 1800);
  }

  draw();
  startTimer();
}