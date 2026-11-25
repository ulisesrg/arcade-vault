// Constantes del motor de Tetris, con los mismos valores que `game.js` de la referencia.

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_W = COLS * BLOCK; // 300
export const BOARD_H = ROWS * BLOCK; // 600
export const NEXT_SIZE = 120;
/** La vista previa es una cuadrícula de 4×4 celdas de BLOCK px. */
export const NEXT_GRID = 4;

/** Las 7 piezas. El tipo de la pieza es su índice + 1 (coincide con los colores de skins.ts). */
export const PIECES: readonly (readonly (readonly number[])[])[] = [
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  // N (tuerca, anillo 3×3 de ocho bloques): desactivada. Para recuperarla,
  // descomentar esta pieza y su color en cada paleta de skins.ts (índice 8); `randomPiece` la
  // incluye sola porque usa PIECES.length.
  // [
  //   [8, 8, 8],
  //   [8, 0, 8],
  //   [8, 8, 8],
  // ],
];

/** Puntos por 0..4 líneas a la vez, antes de multiplicar por el nivel. */
export const LINE_SCORES: readonly number[] = [0, 100, 300, 500, 800];

// Velocidad de caída (ms por fila).
export const INITIAL_DROP_MS = 1000;
export const MIN_DROP_MS = 100;
export const DROP_STEP_MS = 90;
export const LINES_PER_LEVEL = 10;

/** Desplazamientos en x que prueba la rotación, en orden. */
export const KICKS: readonly number[] = [0, -1, 1, -2, 2];

/** Tope del dt entre frames (ms). */
export const MAX_DT_MS = 50;

export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
