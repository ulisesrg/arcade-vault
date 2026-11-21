// Dibujo del tablero y de la vista previa. Todas las funciones reciben el
// contexto por parámetro y limpian con clearRect: el fondo, el borde y la
// sombra los pone el CSS del componente, no el canvas.

import {
  BLOCK,
  BLOCK_HIGHLIGHT,
  BLOCK_HIGHLIGHT_H,
  COLORS,
  COLS,
  GHOST_ALPHA,
  GRID_COLOR,
  GRID_LINE_WIDTH,
  NEXT_GRID,
  ROWS,
} from "./constants";
import type { Board } from "./board";
import type { Piece } from "./pieces";

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  if (!color) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // franja de brillo
  ctx.fillStyle = BLOCK_HIGHLIGHT;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, BLOCK_HIGHLIGHT_H);
  ctx.globalAlpha = 1;
}

/** Líneas de 0,5 px entre celdas, sin borde exterior. */
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = GRID_LINE_WIDTH;
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
  board: Board,
  piece: Piece | null,
  ghostY: number,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawGrid(ctx);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, c, r, board[r][c], BLOCK);
    }
  }

  if (!piece) return;

  // fantasma
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        drawBlock(
          ctx,
          piece.x + c,
          ghostY + r,
          piece.shape[r][c],
          BLOCK,
          GHOST_ALPHA,
        );
      }
    }
  }

  // pieza actual
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      drawBlock(ctx, piece.x + c, piece.y + r, piece.shape[r][c], BLOCK);
    }
  }
}

/** Siguiente pieza centrada en una cuadrícula de 4×4 celdas de 30 px. */
export function drawNext(ctx: CanvasRenderingContext2D, next: Piece): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const shape = next.shape;
  const offX = Math.floor((NEXT_GRID - shape[0].length) / 2);
  const offY = Math.floor((NEXT_GRID - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      drawBlock(ctx, offX + c, offY + r, shape[r][c], BLOCK);
    }
  }
}
