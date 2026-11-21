// Tablero: colisión, fusión, limpieza de líneas, fantasma y rotación con kicks.
// Las funciones reciben el tablero y la pieza por parámetro (sin estado global).

import { COLS, KICKS, ROWS } from "./constants";
import { rotateCW, type Piece, type Shape } from "./pieces";

/** Matriz ROWS×COLS; 0 = vacío, 1..8 = tipo de pieza. */
export type Board = number[][];

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

/** true si la forma, colocada en (ox, oy), sale del tablero o toca un bloque. */
export function collide(
  board: Board,
  shape: Shape,
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

/** Copia los bloques de la pieza en el tablero. */
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
      }
    }
  }
}

/**
 * Elimina las filas completas (de abajo hacia arriba), insertando una vacía
 * arriba por cada una. Devuelve cuántas se eliminaron.
 */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++; // la fila que bajó ocupa ahora este índice: se vuelve a comprobar
    }
  }
  return cleared;
}

/** Fila a la que llegaría la pieza si cayera en vertical. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

/**
 * Gira la pieza en sentido horario probando los desplazamientos de KICKS.
 * Si ninguno cabe, no gira. Devuelve true si giró.
 */
export function tryRotate(board: Board, piece: Piece): boolean {
  const rotated = rotateCW(piece.shape);
  for (const kick of KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return true;
    }
  }
  return false;
}
