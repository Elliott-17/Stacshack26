function queensDistraction(onComplete) {
  const PUZZLES = [
    {
      size: 5,
      // Each cell has a region index (0-4), solution is one queen per region/row/col
      regions: [
        [0, 0, 1, 1, 1],
        [0, 0, 1, 2, 1],
        [0, 3, 3, 2, 2],
        [0, 3, 4, 4, 2],
        [3, 3, 4, 4, 2],
      ],
      solution: [[0,2],[1,4],[2,0],[3,3],[4,1]] // [row, col] for each queen
    },
    {
      size: 6,
      regions: [
        [0, 0, 0, 1, 1, 1],
        [0, 2, 0, 1, 3, 1],
        [2, 2, 2, 3, 3, 1],
        [2, 4, 2, 3, 3, 5],
        [4, 4, 4, 3, 5, 5],
        [4, 4, 5, 5, 5, 5],
      ],
      solution: [[0,3],[1,1],[2,5],[3,2],[4,0],[5,4]]
    },
    {
      size: 7,
      regions: [
        [0, 0, 0, 0, 1, 1, 1],
        [0, 2, 2, 0, 1, 3, 1],
        [0, 2, 2, 4, 4, 3, 1],
        [5, 2, 4, 4, 3, 3, 1],
        [5, 5, 4, 6, 3, 3, 3],
        [5, 5, 6, 6, 6, 3, 3],
        [5, 5, 6, 6, 6, 6, 6],
      ],
      solution: [[0,5],[1,2],[2,0],[3,4],[4,6],[5,3],[6,1]]
    },
  ];

  const REGION_COLORS = [
    "#3b1d6b", "#123a6b", "#1f5b3a", "#5a4a14",
    "#6b1f54", "#5a2f12", "#144e63"
  ];

  const REGION_BORDER_COLORS = [
    "#a78bfa", "#60a5fa", "#4ade80", "#facc15",
    "#f472b6", "#fb923c", "#22d3ee"
  ];

  let puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  let { size, regions, solution } = puzzle;
  const CELL = Math.floor(Math.min(window.innerWidth * 0.85, window.innerHeight * 0.75) / size);

  // state: 0 = empty, 1 = X, 2 = queen
  let board = Array.from({ length: size }, () => Array(size).fill(0));
  let gameOver = false;

  const COLORS = {
    bg: "#0f1419",
    text: "#e8eaed",
    textMuted: "#a8aeb8",
    accent: "#5b6eee",
    bgSecondary: "#1e2a3a"
  };

  // --- Container ---
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: ${COLORS.bg};
    z-index: 99999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: ${COLORS.text};
    user-select: none;
  `;

  const title = document.createElement("div");
  title.textContent = "Queens";
  title.style.cssText = `font-size:1.8rem; font-weight:600; margin-bottom:8px; color: ${COLORS.text};`;

  const subtitle = document.createElement("div");
  subtitle.textContent = "One queen per row, column & region. No adjacent queens.";
  subtitle.style.cssText = `font-size:0.9rem; color:${COLORS.textMuted}; margin-bottom:14px; text-align:center; max-width:400px;`;

  // --- Grid ---
  const gridEl = document.createElement("div");
  gridEl.style.cssText = `
    display: grid;
    grid-template-columns: repeat(${size}, ${CELL}px);
    grid-template-rows: repeat(${size}, ${CELL}px);
    border: 2px solid ${COLORS.accent};
  `;

  const cells = [];
  for (let r = 0; r < size; r++) {
    cells.push([]);
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      const regionIndex = regions[r][c];
      const regionColor = REGION_COLORS[regionIndex];
      const regionBorder = REGION_BORDER_COLORS[regionIndex];
      cell.style.cssText = `
        width: ${CELL}px; height: ${CELL}px;
        background: ${regionColor};
        border: 1px solid ${regionBorder};
        display: flex; align-items: center; justify-content: center;
        font-size: ${CELL * 0.5}px;
        cursor: pointer;
        box-sizing: border-box;
        transition: background 0.15s;
      `;
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener("click", () => handleClick(r, c));
      cells[r].push(cell);
      gridEl.appendChild(cell);
    }
  }

  const message = document.createElement("div");
  message.style.cssText = `font-size:0.85rem; color:#ef4444; min-height:20px; margin-top:12px;`;

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺ Reset";
  resetBtn.style.cssText = `
    margin-top:8px; padding:6px 16px;
    background:${COLORS.bgSecondary}; color:${COLORS.text}; border:1px solid rgba(99,102,241,0.3);
    border-radius:6px; cursor:pointer; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  resetBtn.onclick = resetBoard;

  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(gridEl);
  container.appendChild(message);
  container.appendChild(resetBtn);
  document.body.appendChild(container);

  // --- Logic ---
  function handleClick(r, c) {
    if (gameOver) return;
    board[r][c] = (board[r][c] + 1) % 3;
    renderBoard();
    message.textContent = "";
    if (board[r][c] === 2) checkViolations(r, c);
    checkWin();
  }

  function checkViolations(r, c) {
    const errors = [];

    // Check row
    for (let cc = 0; cc < size; cc++) {
      if (cc !== c && board[r][cc] === 2) errors.push([r, cc]);
    }
    // Check col
    for (let rr = 0; rr < size; rr++) {
      if (rr !== r && board[rr][c] === 2) errors.push([rr, c]);
    }
    // Check adjacency (including diagonal)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 2) {
          errors.push([nr, nc]);
        }
      }
    }
    // Check same region
    for (let rr = 0; rr < size; rr++) {
      for (let cc = 0; cc < size; cc++) {
        if ((rr !== r || cc !== c) && board[rr][cc] === 2 && regions[rr][cc] === regions[r][c]) {
          errors.push([rr, cc]);
        }
      }
    }

    if (errors.length > 0) {
      message.textContent = "Conflict!";
      // Flash red on conflicting cells
      for (const [er, ec] of errors) {
        cells[er][ec].style.background = "#e05c5c88";
        setTimeout(() => renderCell(er, ec), 600);
      }
      cells[r][c].style.background = "#e05c5c88";
      setTimeout(() => renderCell(r, c), 600);
    }
  }

  function checkWin() {
    // Count queens
    const queens = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (board[r][c] === 2) queens.push([r, c]);

    if (queens.length !== size) return;

    // Verify all rules
    const rows = new Set(), cols = new Set(), rgns = new Set();
    for (const [r, c] of queens) {
      if (rows.has(r) || cols.has(c) || rgns.has(regions[r][c])) return;
      rows.add(r); cols.add(c); rgns.add(regions[r][c]);
    }
    // Check no adjacency
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const [r1,c1] = queens[i], [r2,c2] = queens[j];
        if (Math.abs(r1-r2) <= 1 && Math.abs(c1-c2) <= 1) return;
      }
    }

    gameOver = true;
    showPopup();
  }

  function resetBoard() {
    board = Array.from({ length: size }, () => Array(size).fill(0));
    message.textContent = "";
    renderBoard();
  }

  function renderCell(r, c) {
    const regionColor = REGION_COLORS[regions[r][c]];
    const state = board[r][c];
    cells[r][c].textContent = state === 2 ? "👑" : state === 1 ? "✕" : "";
    cells[r][c].style.background = state === 2 ? COLORS.accent : regionColor;
    cells[r][c].style.color = state === 1 ? "#d1d5db" : "#ffffff";
  }

  function renderBoard() {
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        renderCell(r, c);
  }

  function showPopup() {
    const popup = document.createElement("div");
    popup.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:${COLORS.bgSecondary}; color:${COLORS.text};
      border:2px solid ${COLORS.accent}; border-radius:12px;
      padding:24px 32px; z-index:999999;
      box-shadow:0 8px 24px rgba(0,0,0,0.5);
      font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align:center;
    `;
    popup.innerHTML = `
      <div style="font-size:2rem">✓</div>
      <div style="font-size:1.2rem;font-weight:bold;margin:8px 0;color:#10b981">Puzzle solved!</div>
      <div style="font-size:0.85rem;color:${COLORS.textMuted}">Back to pretending to work.</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.remove();
      container.remove();
      onComplete();
    }, 2000);
  }

  renderBoard();
}