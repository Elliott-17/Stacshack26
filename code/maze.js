
// --- Maze Distraction ---
function mazeDistraction(onComplete) {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 10px;
    width: 95vw;
    height: 95vh;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: monospace;
  `;

  const CELL = 100;
  const COLS = Math.floor((window.innerWidth * 0.9) / CELL);
  const ROWS = Math.floor((window.innerHeight * 0.9) / CELL);
  const canvas = document.createElement("canvas");
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  const ctx = canvas.getContext("2d");

  const label = document.createElement("div");
  label.textContent = "Solve the maze to be productive";
  label.style.cssText = "text-align:center; margin-bottom:6px; font-size:13px; font-weight:bold;";


  container.appendChild(label);
  container.appendChild(canvas);
  document.body.appendChild(container);

  // --- Maze generation (recursive backtracker) ---
  const grid = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      r, c,
      visited: false,
      walls: { top: true, right: true, bottom: true, left: true }
    }))
  );

  function getCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return grid[r][c];
  }

  function carve(cell) {
    cell.visited = true;
    const dirs = [[-1,0,"top","bottom"],[0,1,"right","left"],[1,0,"bottom","top"],[0,-1,"left","right"]]
      .sort(() => Math.random() - 0.5);
    for (const [dr, dc, wall, opposite] of dirs) {
      const next = getCell(cell.r + dr, cell.c + dc);
      if (next && !next.visited) {
        cell.walls[wall] = false;
        next.walls[opposite] = false;
        carve(next);
      }
    }
  }
  carve(grid[0][0]);

  // --- Drawing ---
  function draw(playerR, playerC, path) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL, y = r * CELL;
        const cell = grid[r][c];
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        if (cell.walls.top)    { ctx.beginPath(); ctx.moveTo(x, y);           ctx.lineTo(x+CELL, y);           ctx.stroke(); }
        if (cell.walls.right)  { ctx.beginPath(); ctx.moveTo(x+CELL, y);      ctx.lineTo(x+CELL, y+CELL);      ctx.stroke(); }
        if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x, y+CELL);      ctx.lineTo(x+CELL, y+CELL);      ctx.stroke(); }
        if (cell.walls.left)   { ctx.beginPath(); ctx.moveTo(x, y);           ctx.lineTo(x, y+CELL);           ctx.stroke(); }
      }
    }

    // Draw path
    if (path) {
      ctx.fillStyle = "rgba(100, 180, 255, 0.4)";
      for (const [pr, pc] of path) {
        ctx.fillRect(pc * CELL + 2, pr * CELL + 2, CELL - 4, CELL - 4);
      }
    }

    // Start and end
    ctx.fillStyle = "green";
    ctx.fillRect(2, 2, CELL - 4, CELL - 4);
    ctx.fillStyle = "red";
    ctx.fillRect((COLS-1)*CELL+2, (ROWS-1)*CELL+2, CELL-4, CELL-4);

    // Player
    ctx.fillStyle = "#5533ff";
    ctx.beginPath();
    ctx.arc(playerC*CELL + CELL/2, playerR*CELL + CELL/2, CELL/2 - 3, 0, Math.PI*2);
    ctx.fill();
  }

  

  // --- Player controls ---
  let playerR = 0, playerC = 0;
  let solutionPath = null;

  draw(playerR, playerC, null);

  const moves = { ArrowUp:[-1,0,"top"], ArrowDown:[1,0,"bottom"], ArrowLeft:[0,-1,"left"], ArrowRight:[0,1,"right"] };

  function handleKey(e) {
    if (!moves[e.key]) return;
    const [dr, dc, wall] = moves[e.key];
    if (!grid[playerR][playerC].walls[wall]) {
      playerR += dr; playerC += dc;
      solutionPath = null;
      draw(playerR, playerC, null);
      if (playerR === ROWS-1 && playerC === COLS-1) {
        label.textContent = "🎉 You escaped! (somehow)";
        document.removeEventListener("keydown", handleKey);
        setTimeout(() => container.remove(), 1500)
        onComplete()
      }
    }
    e.preventDefault();
  }
  document.addEventListener("keydown", handleKey);

  container.appendChild(hintBtn);
}
