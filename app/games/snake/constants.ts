// Constantes de Víbora: tablero, ritmo del juego, assets y paleta.

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

// ── Paleta (el motor nunca lee CSS) ──────────────────────────────────────────
export const COLORS = {
  background: "#05060f",
  grid: "rgba(0, 245, 255, 0.07)",
  border: "rgba(0, 245, 255, 0.25)",
  body: "#39ff14",
  bodyEdge: "#1fa30a",
  head: "#b6ff9e",
  eye: "#05060f",
  fruitFallback: "#ff2e63",
  hudText: "#ffffff",
  hudOutline: "#05060f",
  startText: "#00f5ff",
} as const;
