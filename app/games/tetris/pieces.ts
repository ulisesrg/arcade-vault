// Piezas: creación aleatoria y rotación.

import { COLS, PIECES } from "./constants";

export type Shape = number[][];

export interface Piece {
  /** Tipo 1..8 (índice en PIECES + 1; también el índice de color). */
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

/** Elige uno de los 7 tipos con probabilidad uniforme (sin bolsa). */
export function randomPiece(): Piece {
  const index = Math.floor(Math.random() * PIECES.length);
  const shape = PIECES[index].map((row) => [...row]);
  return {
    type: index + 1,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

/** Rotación horaria: transponer e invertir las filas. */
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}
