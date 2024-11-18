const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const gridSpacing = 50;
let matrix = [];
let numRows, numCols;
let isRedTurn = true; // Keep track of the turn
let contours = [];

function resizeCanvas() {
  const prevNumRows = numRows || 0;
  const prevNumCols = numCols || 0;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  numCols = Math.ceil(canvas.width / gridSpacing);
  numRows = Math.ceil(canvas.height / gridSpacing);

  // Create a new matrix with updated size and retain old points
  const newMatrix = Array(numRows)
    .fill()
    .map(() => Array(numCols).fill(0));
  for (let i = 0; i < Math.min(numRows, prevNumRows); i++) {
    for (let j = 0; j < Math.min(numCols, prevNumCols); j++) {
      newMatrix[i][j] = matrix[i][j];
    }
  }
  matrix = newMatrix;
  drawGrid();
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("click", handleClick);

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw horizontal lines
  for (let i = 0; i <= numRows; i++) {
    const y = i * gridSpacing;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.strokeStyle = "#888";
    ctx.stroke();
  }

  // Draw vertical lines
  for (let i = 0; i <= numCols; i++) {
    const x = i * gridSpacing;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.strokeStyle = "#888";
    ctx.stroke();
  }

  // Draw contours
  for (const contour of contours) {
    drawContour(contour);
  }

  // Draw points from matrix
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      if (matrix[i][j] === 1) {
        // Red point
        ctx.beginPath();
        ctx.arc(j * gridSpacing, i * gridSpacing, 4, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();
      } else if (matrix[i][j] === 2) {
        // Blue point
        ctx.beginPath();
        ctx.arc(j * gridSpacing, i * gridSpacing, 4, 0, Math.PI * 2);
        ctx.fillStyle = "blue";
        ctx.fill();
      }
    }
  }
}

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Convert to matrix indices
  const j = Math.round(x / gridSpacing);
  const i = Math.round(y / gridSpacing);

  // Check if indices are within bounds
  if (i >= 0 && i < numRows && j >= 0 && j < numCols) {
    // If point doesn't exist (0), add it (1)
    if (matrix[i][j] === 0) {
      matrix[i][j] = isRedTurn ? 1 : 2; // 1 for red, 2 for blue
      handlePointPlaced(i, j);
      isRedTurn = !isRedTurn; // Toggle turn
      drawGrid();
    }
  }
}

function handlePointPlaced(x, y) {
  findSurroundingOpponents(x, y);
}

function findSurroundingOpponents(x, y) {
  const closestOpponents = findClosestOpponents(x, y);
  // console.log({ closestOpponents });
  let contour = null;
  for (const point of closestOpponents) {
    contour = findSurroundingFromPoint(point[0], point[1], x, y, []);
    if (contour) {
      // console.log({ contour });
      contours.push(contour);
      drawGrid();
      break;
    }
  }
}

function findClosestOpponents(startRow, startCol) {
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1], // Up, Down, Left, Right
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1], // Diagonals
  ];
  const sourceValue = matrix[startRow][startCol];
  const visited = new Set();
  const queue = [[startRow, startCol]];
  const opponents = [];

  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const [row, col] = queue.shift();

    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;

      // Check if within bounds
      if (newRow >= 0 && newRow < numRows && newCol >= 0 && newCol < numCols) {
        if (!visited.has(`${newRow},${newCol}`)) {
          visited.add(`${newRow},${newCol}`);
          const value = matrix[newRow][newCol];

          // Check if the point is an opponent
          if (value !== 0 && value !== sourceValue) {
            opponents.push([newRow, newCol]);
            // Stop expanding in this direction
          } else if (value === 0) {
            // Continue searching in this direction
            queue.push([newRow, newCol]);
          }
        }
      } else {
        // Stop if on the edge of the canvas
        continue;
      }
    }
  }

  return opponents;
}

function findSurroundingFromPoint(
  row,
  col,
  refRow,
  refCol,
  visited,
  startPoint = null
) {
  if (
    visited.length >= 4 &&
    startPoint &&
    row === startPoint[0] &&
    col === startPoint[1]
  ) {
    // Stop condition: return visited points if we form a loop
    return visited;
  }

  visited.push([row, col]);
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1], // Up, Down, Left, Right
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1], // Diagonals
  ];
  const currentColor = matrix[row][col]; // Color of the current point

  // Filter adjacent points based on proximity to the reference point
  const neighbors = directions
    .map(([dx, dy]) => [row + dx, col + dy])
    .filter(
      ([newRow, newCol]) =>
        newRow >= 0 &&
        newRow < numRows &&
        newCol >= 0 &&
        newCol < numCols &&
        matrix[newRow][newCol] !== 0 &&
        matrix[newRow][newCol] === currentColor &&
        ((visited.length >= 4 &&
          newRow === startPoint[0] &&
          newCol === startPoint[1]) ||
          !visited.some(([vr, vc]) => vr === newRow && vc === newCol))
    )
    .sort(([r1, c1], [r2, c2]) => {
      // Sort by distance to the reference point
      const d1 = Math.hypot(refRow - r1, refCol - c1);
      const d2 = Math.hypot(refRow - r2, refCol - c2);
      return d1 - d2;
    });

  for (const [newRow, newCol] of neighbors) {
    const result = findSurroundingFromPoint(
      newRow,
      newCol,
      refRow,
      refCol,
      [...visited],
      startPoint || [row, col]
    );
    if (result) {
      return result; // Stop and return if we found a loop
    }
  }

  return null; // No loop found
}

function drawContour(contour) {
  if (contour.length < 2) {
    return; // No lines to draw if there are fewer than 2 points
  }

  // Get the color of the first point as the line's stroke color
  const [startRow, startCol] = contour[0];
  const color = matrix[startRow][startCol] === 1 ? "red" : "blue";

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;

  // Move to the first point
  ctx.moveTo(startCol * gridSpacing, startRow * gridSpacing);

  // Draw lines connecting each subsequent point
  for (let i = 1; i < contour.length; i++) {
    const [row, col] = contour[i];
    ctx.lineTo(col * gridSpacing, row * gridSpacing);
  }

  ctx.closePath();
  ctx.stroke();
}
