// Constantes de Víbora: tablero, ritmo del juego, y assets.

export type Dir = "up" | "down" | "left" | "right";

// ── Tablero ──────────────────────────────────────────────────────────────────
export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const CELL = 40;
export const COLS = 20; // CANVAS_W / CELL
export const ROWS = 15; // CANVAS_H / CELL

// ── Partida ──────────────────────────────────────────────────────────────────
export const INITIAL_LENGTH = 3;
export const INITIAL_HEAD = { col: 10, row: 7 } as const; // cuerpo en (9, 7) y (8, 7)
export const INITIAL_DIR: Dir = "right";

export const POINTS_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5;

// Velocidad: min(BASE + (nivel − 1), MAX) pasos por segundo.
export const BASE_STEPS_PER_SECOND = 8;
export const MAX_STEPS_PER_SECOND = 16;

export const MAX_QUEUED_TURNS = 2;
export const MAX_DT = 0.05; // s; menor que el paso más corto (62,5 ms)

// ── Assets ───────────────────────────────────────────────────────────────────
export const FRUITS_URL = "/games/snake/fruits.png";
