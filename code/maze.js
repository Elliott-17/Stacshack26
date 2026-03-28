
// --- Maze Distraction ---
function mazeDistraction(onComplete) {
  const BG_PRIMARY = "#0f1419";
  const BG_SECONDARY = "#1e2a3a";
  const ACCENT = "#5b6eee";
  const TEXT_PRIMARY = "#e8eaed";
  const TEXT_SECONDARY = "#a8aeb8";
  const SUCCESS = "#10b981";
  
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: ${BG_PRIMARY};
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${TEXT_PRIMARY};
    user-select: none;
  `;

  const CELL = 60;
  const COLS = 12;
  const ROWS = 10;
  
  const header = document.createElement("div");
  header.style.cssText = `
    text-align: center;
    margin-bottom: 24px;
  `;
  
  const title = document.createElement("div");
  title.textContent = "🧭 Maze";
  title.style.cssText = `
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: ${TEXT_PRIMARY};
  `;
  
  const subtitle = document.createElement("div");
  subtitle.textContent = "Reach the red square to continue";
  subtitle.style.cssText = `
    font-size: 0.9rem;
    color: ${TEXT_SECONDARY};
    letter-spacing: 0.03em;
  `;
  
  header.appendChild(title);
  header.appendChild(subtitle);

  const canvas = document.createElement("canvas");
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  canvas.style.cssText = `
    border-radius: 12px;
    border: 2px solid ${ACCENT};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    margin: 16px 0;
  `;
  const ctx = canvas.getContext("2d");

  const hint = document.createElement("div");
  hint.textContent = "Use arrow keys to move";
  hint.style.cssText = `
    font-size: 0.85rem;
    color: ${TEXT_SECONDARY};
    margin-top: 12px;
    letter-spacing: 0.03em;
  `;

  container.appendChild(header);
  container.appendChild(canvas);
  container.appendChild(hint);
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
  function draw(playerR, playerC) {
    ctx.fillStyle = BG_SECONDARY;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const WALL_COLOR = ACCENT;
    const WALL_WIDTH = 3;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL, y = r * CELL;
        const cell = grid[r][c];
        
        ctx.strokeStyle = WALL_COLOR;
        ctx.lineWidth = WALL_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (cell.walls.top)    { ctx.beginPath(); ctx.moveTo(x, y);           ctx.lineTo(x+CELL, y);           ctx.stroke(); }
        if (cell.walls.right)  { ctx.beginPath(); ctx.moveTo(x+CELL, y);      ctx.lineTo(x+CELL, y+CELL);      ctx.stroke(); }
        if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x, y+CELL);      ctx.lineTo(x+CELL, y+CELL);      ctx.stroke(); }
        if (cell.walls.left)   { ctx.beginPath(); ctx.moveTo(x, y);           ctx.lineTo(x, y+CELL);           ctx.stroke(); }
      }
    }

    // Start (green)
    ctx.fillStyle = SUCCESS;
    ctx.beginPath();
    ctx.arc(CELL / 2, CELL / 2, CELL / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // End (red)
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc((COLS - 0.5) * CELL, (ROWS - 0.5) * CELL, CELL / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Player
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(playerC * CELL + CELL / 2, playerR * CELL + CELL / 2, CELL / 3, 0, Math.PI * 2);
    ctx.fill();
  }

  

  // --- Player controls ---
  let playerR = 0, playerC = 0;
  draw(playerR, playerC);

  const moves = { 
    ArrowUp:    [-1, 0, "top"], 
    ArrowDown:  [1, 0, "bottom"], 
    ArrowLeft:  [0, -1, "left"], 
    ArrowRight: [0, 1, "right"] 
  };

  function handleKey(e) {
    if (!moves[e.key]) return;
    
    const [dr, dc, wall] = moves[e.key];
    const nextCell = grid[playerR][playerC];
    
    if (!nextCell.walls[wall]) {
      playerR += dr;
      playerC += dc;
      draw(playerR, playerC);
      
      if (playerR === ROWS - 1 && playerC === COLS - 1) {
        document.removeEventListener("keydown", handleKey);
        
        title.textContent = "✓ Escaped!";
        subtitle.textContent = "Time to get back to work.";
        title.style.color = SUCCESS;
        
        setTimeout(() => {
          container.remove();
          onComplete();
        }, 1500);
      }
    }
    e.preventDefault();
  }
  
  document.addEventListener("keydown", handleKey);
}
