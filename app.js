// Constants for the coordinate system
const RANGE_MIN = -10;
const RANGE_MAX = 10;
const CANVAS_SIZE = 600;
const UNIT_PIXELS = CANVAS_SIZE / (RANGE_MAX - RANGE_MIN);

const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const message = document.getElementById('message');
const coordDisplay = document.getElementById('coord');
const startQuizBtn = document.getElementById('startQuizBtn');
const quizTarget = document.getElementById('quizTarget');
const scoreDisplay = document.getElementById('score');

function toCanvasCoords(x, y) {
  // Convert cartesian (-10..10) to canvas pixels (0..CANVAS_SIZE)
  const cx = (x - RANGE_MIN) * UNIT_PIXELS;
  // canvas y is inverted
  const cy = CANVAS_SIZE - (y - RANGE_MIN) * UNIT_PIXELS;
  return {cx, cy};
}

function drawGrid() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.save();

  // background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // grid lines every integer
  ctx.strokeStyle = '#d7e2ef';
  ctx.lineWidth = 1;
  for (let i = RANGE_MIN; i <= RANGE_MAX; i++) {
    const {cx: x} = toCanvasCoords(i, 0);
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, CANVAS_SIZE);
    ctx.stroke();

    const {cy: y} = toCanvasCoords(0, i);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(CANVAS_SIZE, Math.round(y) + 0.5);
    ctx.stroke();
  }

  // axes
  ctx.strokeStyle = '#294e6a';
  ctx.lineWidth = 2;
  // y axis (x=0)
  const {cx: x0} = toCanvasCoords(0, 0);
  ctx.beginPath();
  ctx.moveTo(Math.round(x0) + 0.5, 0);
  ctx.lineTo(Math.round(x0) + 0.5, CANVAS_SIZE);
  ctx.stroke();
  // x axis (y=0)
  const {cy: y0} = toCanvasCoords(0, 0);
  ctx.beginPath();
  ctx.moveTo(0, Math.round(y0) + 0.5);
  ctx.lineTo(CANVAS_SIZE, Math.round(y0) + 0.5);
  ctx.stroke();

  // ticks and labels
  ctx.fillStyle = '#102b3a';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = RANGE_MIN; i <= RANGE_MAX; i++) {
    const {cx: tx} = toCanvasCoords(i, 0);
    ctx.fillText(String(i), tx, y0 + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = RANGE_MIN; i <= RANGE_MAX; i++) {
    const {cy: ty} = toCanvasCoords(0, i);
    if (i === 0) continue; // avoid overlapping with x labels
    ctx.fillText(String(i), x0 - 6, ty);
  }

  ctx.restore();
}

function plotPoint(x, y) {
  const {cx, cy} = toCanvasCoords(x, y);
  ctx.save();
  ctx.fillStyle = '#d64550';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPreview(x, y) {
  const {cx, cy} = toCanvasCoords(x, y);
  ctx.save();
  ctx.fillStyle = 'rgba(214,69,80,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function isIntegerValue(val) {
  // Reject non-integer and empty
  if (val === '' || val === null || isNaN(val)) return false;
  // Numeric check
  return Number.isInteger(Number(val));
}

// Interaction: click/touch + drag to preview; release to snap to integer and plot
let isPointerDown = false;
let lastPreview = null; // {x,y}
const TOTAL_QUESTIONS = 10;
let quizActive = false;
let currentTarget = null; // {x,y}
let score = 0;
let questionNumber = 0;
let answeredCount = 0;

function canvasToCartesian(px, py) {
  // px,py are canvas pixels -> convert to cartesian floats
  const x = RANGE_MIN + px / UNIT_PIXELS;
  const y = RANGE_MIN + (CANVAS_SIZE - py) / UNIT_PIXELS;
  return {x, y};
}

function snapToInteger(v) {
  return Math.round(v);
}

function updateCoordDisplay(x, y) {
  coordDisplay.textContent = `Coordinate: ${x}, ${y}`;
}

canvas.addEventListener('pointerdown', (ev) => {
  isPointerDown = true;
  canvas.setPointerCapture(ev.pointerId);
});

canvas.addEventListener('pointermove', (ev) => {
  // get canvas-local coords
  const rect = canvas.getBoundingClientRect();
  const px = ev.clientX - rect.left;
  const py = ev.clientY - rect.top;
  const {x, y} = canvasToCartesian(px, py);

  const sx = snapToInteger(x);
  const sy = snapToInteger(y);

  // update preview/coords only when quiz is not active
  drawGrid();
  if (!quizActive) {
    // show preview and live coords when not quizzing
    drawPreview(sx, sy);
    updateCoordDisplay(sx, sy);
  } else {
    // during a quiz, do NOT show live coordinates or preview to avoid giving away the answer
    // leave coord display blank/dash until the user places a point
    coordDisplay.textContent = `Coordinate: \u2014`;
  }

  lastPreview = {x: sx, y: sy};
});

canvas.addEventListener('pointerup', (ev) => {
  isPointerDown = false;
  canvas.releasePointerCapture(ev.pointerId);
  if (!lastPreview) return;
  const {x, y} = lastPreview;
  if (x < RANGE_MIN || x > RANGE_MAX || y < RANGE_MIN || y > RANGE_MAX) {
    message.textContent = `Values must be between ${RANGE_MIN} and ${RANGE_MAX}.`;
    return;
  }
  // finalize plot
  drawGrid();
  plotPoint(x, y);
  updateCoordDisplay(x, y);
  message.textContent = `Plotted (${x}, ${y}).`;

  // quiz evaluation
  if (quizActive && currentTarget) {
    if (x === currentTarget.x && y === currentTarget.y) {
      score += 1;
      message.textContent = `Correct! Plotted (${x}, ${y}).`;
    } else {
      message.textContent = `Wrong. Target was (${currentTarget.x}, ${currentTarget.y}). You plotted (${x}, ${y}).`;
    }
    scoreDisplay.textContent = `Score: ${score}`;
    // advance to next question or finish
    currentTarget = null;
    answeredCount += 1;
    if (answeredCount >= TOTAL_QUESTIONS) {
      // quiz complete — show results immediately
      quizActive = false;
      quizTarget.textContent = `Quiz finished — final score: ${score}/${TOTAL_QUESTIONS}`;
      message.textContent += ' Quiz complete.';
      endQuizAndShowModal();
    } else {
      // prepare next question
      questionNumber = answeredCount + 1;
      spawnNewTarget();
    }
  }
});

startQuizBtn.addEventListener('click', () => {
  quizActive = true;
  score = 0;
  questionNumber = 1;
  answeredCount = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  message.textContent = 'Quiz started: plot the shown target by clicking and releasing on the canvas.';
  // hide live coordinate/preview immediately when quiz starts
  coordDisplay.textContent = `Coordinate: \u2014`;
  drawGrid();
  spawnNewTarget();
});

function spawnNewTarget() {
  // choose a random integer coordinate in range
  const tx = Math.floor(Math.random() * (RANGE_MAX - RANGE_MIN + 1)) + RANGE_MIN;
  const ty = Math.floor(Math.random() * (RANGE_MAX - RANGE_MIN + 1)) + RANGE_MIN;
  currentTarget = {x: tx, y: ty};
  quizTarget.textContent = `Question ${questionNumber}/${TOTAL_QUESTIONS} — Target: (${tx}, ${ty})`;
}

function endQuizAndShowModal() {
  quizActive = false;
  const modal = document.getElementById('resultModal');
  const phraseEl = document.getElementById('resultPhrase');
  const finalScoreEl = document.getElementById('finalScore');

  // choose phrase
  let phrase = '';
  if (score === 0) phrase = 'vro </3';
  else if (score <= 5) phrase = 'what is buddy doing';
  else if (score === 6) phrase = 'I UNDERSTAND IT NOW';
  else if (score === 7) phrase = 'Almost there buddy!';
  else if (score === 10) phrase = 'this guys a genius or sum';
  else phrase = 'Good effort!';

  phraseEl.textContent = phrase;
  finalScoreEl.textContent = `Final score: ${score}/${TOTAL_QUESTIONS}`;
  modal.setAttribute('aria-hidden', 'false');

  // modal buttons
  document.getElementById('closeModal').onclick = () => {
    modal.setAttribute('aria-hidden', 'true');
  };
  document.getElementById('restartModal').onclick = () => {
    modal.setAttribute('aria-hidden', 'true');
    // restart quiz
    score = 0;
    questionNumber = 1;
    scoreDisplay.textContent = `Score: ${score}`;
    message.textContent = 'Quiz restarted.';
    spawnNewTarget();
    quizActive = true;
  };
}

clearBtn.addEventListener('click', () => {
  drawGrid();
  message.textContent = '';
  updateCoordDisplay('—', '—');
});

// initial draw
drawGrid();
