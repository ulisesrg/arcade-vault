// Motor de Víbora: estado, acumulador de tiempo, draw y bucle con requestAnimationFrame.
// Diseñado desde cero (no hay código de referencia). No usa variables globales ni
// `document`: todo vive dentro de createSnake(). La lógica de reglas está en snake.ts.

import {
  CANVAS_H,
  CANVAS_W,
  CELL,
  COLORS,
  COLS,
  FRUITS_URL,
  MAX_DT,
  ROWS,
  type Dir,
} from "./constants";
import { createInput } from "./input";
import { drawFruit, loadFruits } from "./sprites";
import {
  createInitialState,
  levelFor,
  queueTurn,
  scoreFor,
  startGame,
  step,
  stepsPerSecond,
  type Cell,
} from "./snake";

export interface SnakeCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación (al comer)
  onLevel: (level: number) => void; // al subir de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez: choque o tablero lleno
}

export interface SnakeHandle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo
  destroy: () => void; // cancela el rAF, quita los listeners y descarta la carga del sprite
}

const START_MESSAGE = "PULSA UNA FLECHA PARA EMPEZAR";

export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Snake: el canvas no tiene contexto 2D");

  const input = createInput();
  const rng = Math.random;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const state = createInitialState(rng);
  let accumulator = 0; // segundos acumulados hacia el próximo paso
  let fruitsImg: HTMLImageElement | null = null; // null = aún sin cargar o fallo
  let loaded = false; // la carga terminó (con éxito o no): el bucle puede correr

  let finished = false; // derrota o victoria: el bucle ya no se reanuda
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  // Callbacks solo cuando el valor cambia.
  let lastScore = 0;
  let lastLevel = 0;
  let gameOverNotified = false;

  function sync(): void {
    const score = scoreFor(state.eaten);
    const level = levelFor(state.eaten);
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevel(level);
    }
  }

  function finish(): void {
    finished = true;
    input.detach();
    draw(); // último frame con el HUD
    if (!gameOverNotified) {
      gameOverNotified = true;
      callbacks.onGameOver();
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function applyInput(): void {
    const dirs = input.drain();
    for (const dir of dirs) {
      // Mientras espera, la primera flecha válida arranca la partida y fija la
      // dirección; el resto de pulsaciones del mismo frame pasan por la cola.
      if (!state.started) {
        if (startGame(state, dir)) {
          accumulator = 0;
        }
        continue;
      }
      queueTurn(state, dir);
    }
  }

  function update(dt: number): void {
    applyInput();
    if (!state.started) return; // el tiempo no corre hasta la primera flecha

    accumulator += dt;
    const interval = 1 / stepsPerSecond(levelFor(state.eaten));
    while (accumulator >= interval && !finished) {
      accumulator -= interval;
      const result = step(state, rng);
      if (result === "dead" || result === "won") {
        sync();
        finish();
        return;
      }
      if (result === "ate") sync();
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBoard(c: CanvasRenderingContext2D): void {
    c.fillStyle = COLORS.background;
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);

    c.strokeStyle = COLORS.grid;
    c.lineWidth = 1;
    c.beginPath();
    for (let col = 1; col < COLS; col++) {
      c.moveTo(col * CELL + 0.5, 0);
      c.lineTo(col * CELL + 0.5, CANVAS_H);
    }
    for (let row = 1; row < ROWS; row++) {
      c.moveTo(0, row * CELL + 0.5);
      c.lineTo(CANVAS_W, row * CELL + 0.5);
    }
    c.stroke();

    c.strokeStyle = COLORS.border;
    c.lineWidth = 2;
    c.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2);
  }

  function drawSegment(
    c: CanvasRenderingContext2D,
    cell: Cell,
    inset: number,
    fill: string,
    edge: string,
  ): void {
    const size = CELL - inset * 2;
    c.fillStyle = fill;
    c.strokeStyle = edge;
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(
      cell.col * CELL + inset,
      cell.row * CELL + inset,
      size,
      size,
      9,
    );
    c.fill();
    c.stroke();
  }

  function drawEyes(c: CanvasRenderingContext2D, head: Cell, dir: Dir): void {
    const cx = head.col * CELL + CELL / 2;
    const cy = head.row * CELL + CELL / 2;
    const forward = 8; // hacia dónde mira
    const side = 8; // separación entre los dos ojos
    const fx = dir === "right" ? forward : dir === "left" ? -forward : 0;
    const fy = dir === "down" ? forward : dir === "up" ? -forward : 0;
    // Eje perpendicular a la dirección.
    const sx = fy !== 0 ? side : 0;
    const sy = fx !== 0 ? side : 0;
    c.fillStyle = COLORS.eye;
    for (const k of [-1, 1]) {
      c.beginPath();
      c.arc(cx + fx + sx * k, cy + fy + sy * k, 3.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawHud(c: CanvasRenderingContext2D): void {
    c.font = "bold 18px monospace";
    c.textBaseline = "top";
    c.lineJoin = "round";
    c.lineWidth = 4;
    c.strokeStyle = COLORS.hudOutline;
    c.fillStyle = COLORS.hudText;

    c.textAlign = "left";
    const score = `Puntos: ${scoreFor(state.eaten)}`;
    c.strokeText(score, 12, 10);
    c.fillText(score, 12, 10);

    c.textAlign = "right";
    const level = `Nivel: ${levelFor(state.eaten)}`;
    c.strokeText(level, CANVAS_W - 12, 10);
    c.fillText(level, CANVAS_W - 12, 10);
  }

  function drawStartMessage(c: CanvasRenderingContext2D): void {
    const y = CANVAS_H * 0.75;
    c.fillStyle = "rgba(5, 6, 15, 0.75)";
    c.fillRect(0, y - 28, CANVAS_W, 56);
    c.font = "bold 26px monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = COLORS.startText;
    c.fillText(START_MESSAGE, CANVAS_W / 2, y);
  }

  function draw(): void {
    const c = ctx!;
    drawBoard(c);
    if (state.fruit)
      drawFruit(c, fruitsImg, state.fruit.sprite, state.fruit.cell);
    for (let i = state.body.length - 1; i >= 1; i--) {
      drawSegment(c, state.body[i], 3, COLORS.body, COLORS.bodyEdge);
    }
    drawSegment(c, state.body[0], 1, COLORS.head, COLORS.bodyEdge);
    drawEyes(c, state.body[0], state.dir);
    drawHud(c);
    if (!state.started) drawStartMessage(c);
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────
  function loop(ts: number): void {
    rafId = null;
    if (destroyed || paused || finished) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    if (finished) return; // finish() ya dibujó el último frame y avisó
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function cancelLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  input.attach();
  sync(); // onLevel(1) inicial; onScore no cambia aún
  draw(); // tablero y víbora (la fruta como círculo) hasta que cargue el sprite

  const onLoaded = (img: HTMLImageElement | null) => {
    if (destroyed) return; // el motor se destruyó mientras cargaba
    fruitsImg = img;
    loaded = true;
    draw();
    if (!paused && !finished) rafId = requestAnimationFrame(loop);
  };

  loadFruits(FRUITS_URL)
    .then((img) => onLoaded(img))
    .catch((err: unknown) => {
      if (destroyed) return;
      console.error("Snake:", err);
      onLoaded(null); // la fruta es solo decoración: la partida sigue siendo jugable
    });

  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      cancelLoop();
      input.setActive(false); // descarta las flechas mientras dura la pausa
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      if (finished) return; // tras el fin, resume no revive el bucle
      // Evita el salto de dt tras la pausa; el acumulador se conserva.
      lastTime = null;
      input.setActive(true);
      if (loaded) rafId = requestAnimationFrame(loop);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelLoop();
      input.detach();
    },
  };
}
