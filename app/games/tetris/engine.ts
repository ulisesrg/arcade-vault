// Motor de Tetris: estado, update, draw y bucle con requestAnimationFrame.
// Portado de references/started-games/03-tetris/game.js. No usa variables
// globales ni `document`: todo vive dentro de createTetris() y solo dibuja
// en los dos canvas que recibe (tablero y vista previa).

import {
  DROP_STEP_MS,
  HARD_DROP_POINTS,
  INITIAL_DROP_MS,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MAX_DT_MS,
  MIN_DROP_MS,
  SOFT_DROP_POINTS,
} from "./constants";
import {
  clearLines,
  collide,
  createBoard,
  ghostY,
  merge,
  tryRotate,
} from "./board";
import { createInput } from "./input";
import { randomPiece, type Piece } from "./pieces";
import { drawBoard, drawNext } from "./render";
import { TETRIS_SKINS, type TetrisPalette } from "./skins";
import { DEFAULT_SKIN, type SkinId } from "../skins";

export interface TetrisCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación
  onLines: (lines: number) => void; // al borrar líneas
  onLevel: (level: number) => void; // al subir de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez, cuando la pieza nueva colisiona al aparecer
}

export interface TetrisHandle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo y vacía la cola de teclas
  setSkin: (id: SkinId) => void; // cambia la paleta sin reiniciar la partida
  destroy: () => void; // cancela el rAF y quita los listeners
}

export interface TetrisOptions {
  skin?: SkinId;
}

export function createTetris(
  boardCanvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
  options: TetrisOptions = {},
): TetrisHandle {
  let pal: TetrisPalette = TETRIS_SKINS[options.skin ?? DEFAULT_SKIN];
  const ctx = boardCanvas.getContext("2d");
  const nextCtx = nextCanvas.getContext("2d");
  if (!ctx || !nextCtx) {
    throw new Error("Tetris: el canvas no tiene contexto 2D");
  }

  const input = createInput();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = INITIAL_DROP_MS;
  let dropAccum = 0;
  let gameOver = false;
  let paused = false;
  let destroyed = false;

  let rafId: number | null = null;
  let lastTime: number | null = null;

  // Últimos valores comunicados: los callbacks solo se invocan al cambiar.
  let notifiedScore = score;
  let notifiedLines = lines;
  let notifiedLevel = -1;

  function notify() {
    if (score !== notifiedScore) {
      notifiedScore = score;
      callbacks.onScore(score);
    }
    if (lines !== notifiedLines) {
      notifiedLines = lines;
      callbacks.onLines(lines);
    }
    if (level !== notifiedLevel) {
      notifiedLevel = level;
      callbacks.onLevel(level);
    }
  }

  // ── Reglas ──────────────────────────────────────────────────────────────────
  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] ?? 0) * level; // nivel anterior al recálculo
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = Math.max(
        MIN_DROP_MS,
        INITIAL_DROP_MS - (level - 1) * DROP_STEP_MS,
      );
    }
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    drawNext(nextCtx!, pal, next);
    if (collide(board, current.shape, current.x, current.y)) {
      gameOver = true;
    }
  }

  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += SOFT_DROP_POINTS;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * HARD_DROP_POINTS;
    current.y = gy;
    lockPiece();
  }

  function applyKey(code: string) {
    switch (code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y)) {
          current.x--;
        }
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y)) {
          current.x++;
        }
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(board, current);
        break;
      case "Space":
        hardDrop();
        break;
    }
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────
  function update(dtMs: number) {
    for (const code of input.drain()) {
      applyKey(code);
      if (gameOver) return;
    }

    // El acumulador vuelve a 0 al cumplirse el intervalo (no conserva el resto).
    // Soft drop y hard drop no lo reinician.
    dropAccum += dtMs;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }

  function draw() {
    // En game over la pieza nueva colisionó al aparecer: no se dibuja.
    drawBoard(
      ctx!,
      pal,
      board,
      gameOver ? null : current,
      gameOver ? 0 : ghostY(board, current),
    );
  }

  function finish() {
    input.setActive(false);
    draw();
    notify();
    callbacks.onGameOver();
  }

  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused || gameOver) return;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT_MS);
    lastTime = ts;

    update(dt);

    if (gameOver) {
      finish();
      return;
    }
    notify();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  input.attach();
  drawNext(nextCtx, pal, next);
  draw();
  notify(); // onLevel(1) al iniciar; score y lines empiezan en 0 sin avisar
  rafId = requestAnimationFrame(loop);

  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      input.setActive(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    resume() {
      if (destroyed || gameOver || !paused) return;
      paused = false;
      lastTime = null; // evita un salto de dt tras la pausa
      input.clear();
      input.setActive(true);
      rafId = requestAnimationFrame(loop);
    },
    setSkin(id) {
      if (destroyed) return;
      pal = TETRIS_SKINS[id];
      // Con el bucle parado (pausa o fin de partida) no se repinta solo.
      drawNext(nextCtx, pal, next);
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      input.detach();
    },
  };
}
