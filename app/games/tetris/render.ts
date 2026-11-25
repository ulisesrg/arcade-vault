// Dibujo del tablero y de la vista previa. Todas las funciones reciben el
// contexto y la paleta por parámetro. Limpian con clearRect y, si la skin
// define fondo, lo pintan; el borde y la sombra los pone el CSS del componente.

import { BLOCK, COLS, NEXT_GRID, ROWS } from "./constants";
import type { TetrisPalette } from "./skins";
import type { Board } from "./board";
import type { Piece } from "./pieces";

function clearCanvas(ctx: CanvasRenderingContext2D, pal: TetrisPalette): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (pal.background) {
    ctx.fillStyle = pal.background;
    ctx.fillRect(0, 0, width, height);
  }
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  pal: TetrisPalette,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  const color = pal.colors[colorIndex];
  if (!color) return;
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  const pattern = pal.patterns[colorIndex] ?? "solid";
  ctx.globalAlpha = alpha;
  if (pal.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = pal.glow;
  }
  if (pattern === "hollow") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 1.5, py + 1.5, s - 3, s - 3);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, s, s);
  }
  ctx.shadowBlur = 0;
  if (pattern === "dots") {
    ctx.fillStyle = pal.dotColor;
    for (let dy = 3; dy < s - 2; dy += 6) {
      for (let dx = 3 + ((dy / 6) % 2 ? 3 : 0); dx < s - 2; dx += 6) {
        ctx.fillRect(px + dx, py + dy, 2, 2);
      }
    }
  }
  if (pal.highlight) {
    ctx.fillStyle = pal.highlight;
    ctx.fillRect(px, py, s, pal.highlightH);
  }
  ctx.globalAlpha = 1;
}

/** Líneas de 0,5 px entre celdas, sin borde exterior. */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  pal: TetrisPalette,
): void {
  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = pal.gridLineWidth;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

/**
 * Tablero + fantasma + pieza actual. `piece` es null en el último frame de un
 * game over, para no pintar la pieza nueva que colisionó al aparecer.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  pal: TetrisPalette,
  board: Board,
  piece: Piece | null,
  ghostY: number,
): void {
  clearCanvas(ctx, pal);
  drawGrid(ctx, pal);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, pal, c, r, board[r][c], BLOCK);
    }
  }

  if (!piece) return;

  // fantasma
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        drawBlock(
          ctx,
          pal,
          piece.x + c,
          ghostY + r,
          piece.shape[r][c],
          BLOCK,
          pal.ghostAlpha,
        );
      }
    }
  }

  // pieza actual
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      drawBlock(ctx, pal, piece.x + c, piece.y + r, piece.shape[r][c], BLOCK);
    }
  }
}

/** Siguiente pieza centrada en una cuadrícula de 4×4 celdas de 30 px. */
export function drawNext(
  ctx: CanvasRenderingContext2D,
  pal: TetrisPalette,
  next: Piece,
): void {
  clearCanvas(ctx, pal);
  const shape = next.shape;
  const offX = Math.floor((NEXT_GRID - shape[0].length) / 2);
  const offY = Math.floor((NEXT_GRID - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      drawBlock(ctx, pal, offX + c, offY + r, shape[r][c], BLOCK);
    }
  }
}
