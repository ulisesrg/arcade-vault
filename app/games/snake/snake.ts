// Lógica pura de Víbora: sin `ctx`, sin DOM, sin temporizadores. El estado se muta
// en sitio; el azar entra por parámetro (`rng`) para poder razonar sobre las reglas.

import {
  BASE_STEPS_PER_SECOND,
  COLS,
  FRUITS_PER_LEVEL,
  INITIAL_DIR,
  INITIAL_HEAD,
  INITIAL_LENGTH,
  MAX_QUEUED_TURNS,
  MAX_STEPS_PER_SECOND,
  POINTS_PER_FRUIT,
  ROWS,
  type Dir,
} from "./constants";
import { FRUITS } from "./sprites";

export interface Cell {
  col: number;
  row: number; // origen arriba a la izquierda: col 0..19, row 0..14
}

export interface Fruit {
  cell: Cell;
  sprite: number; // índice 0..21 en FRUITS
}

export interface SnakeState {
  body: Cell[]; // body[0] es la cabeza; body[body.length - 1], la cola
  dir: Dir; // dirección del último paso dado
  pendingTurns: Dir[]; // giros aceptados y aún sin aplicar (máx. MAX_QUEUED_TURNS)
  fruit: Fruit | null; // null solo tras la victoria
  started: boolean; // false hasta la primera flecha válida
  eaten: number; // frutas comidas
}

/** moved: paso normal · ate: comió · dead: choque · won: comió y no queda sitio. */
export type StepResult = "moved" | "ate" | "dead" | "won";

export type Rng = () => number;

const DELTAS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

// ── Puntuación, nivel y velocidad ───────────────────────────────────────────
export const scoreFor = (eaten: number) => eaten * POINTS_PER_FRUIT;
export const levelFor = (eaten: number) =>
  1 + Math.floor(eaten / FRUITS_PER_LEVEL);
export const stepsPerSecond = (level: number) =>
  Math.min(BASE_STEPS_PER_SECOND + (level - 1), MAX_STEPS_PER_SECOND);

// ── Fruta ───────────────────────────────────────────────────────────────────
/** Elige una casilla libre al azar y un sprite al azar. null si no queda ninguna. */
export function pickFruit(body: readonly Cell[], rng: Rng): Fruit | null {
  const occupied = new Set(body.map((c) => c.row * COLS + c.col));
  const free: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!occupied.has(row * COLS + col)) free.push({ col, row });
    }
  }
  if (free.length === 0) return null;
  const cell = free[Math.floor(rng() * free.length)];
  const sprite = Math.floor(rng() * FRUITS.length);
  return { cell, sprite };
}

// ── Estado inicial ──────────────────────────────────────────────────────────
export function createInitialState(rng: Rng): SnakeState {
  const back = DELTAS[OPPOSITE[INITIAL_DIR]];
  const body: Cell[] = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    body.push({
      col: INITIAL_HEAD.col + back.col * i,
      row: INITIAL_HEAD.row + back.row * i,
    });
  }
  return {
    body,
    dir: INITIAL_DIR,
    pendingTurns: [],
    fruit: pickFruit(body, rng),
    started: false,
    eaten: 0,
  };
}

// ── Giros ───────────────────────────────────────────────────────────────────
/**
 * Primera flecha: ↑, ↓ y → arrancan la partida y fijan la dirección; ← (marcha
 * atrás) se ignora. Devuelve true si la partida arrancó.
 */
export function startGame(state: SnakeState, dir: Dir): boolean {
  if (state.started || dir === OPPOSITE[state.dir]) return false;
  state.started = true;
  state.dir = dir;
  return true;
}

/**
 * Un giro se acepta si hay sitio en la cola y no repite ni invierte la última
 * dirección de la cola (o la dirección actual si la cola está vacía).
 */
export function canTurn(state: SnakeState, dir: Dir): boolean {
  if (state.pendingTurns.length >= MAX_QUEUED_TURNS) return false;
  const last = state.pendingTurns.at(-1) ?? state.dir;
  return dir !== last && dir !== OPPOSITE[last];
}

/** Encola el giro si `canTurn` lo permite. Devuelve true si lo aceptó. */
export function queueTurn(state: SnakeState, dir: Dir): boolean {
  if (!canTurn(state, dir)) return false;
  state.pendingTurns.push(dir);
  return true;
}

// ── Paso ────────────────────────────────────────────────────────────────────
/**
 * Avanza una casilla: aplica un giro pendiente, mueve, come, crece y detecta
 * choque o victoria. En "dead" el cuerpo no cambia.
 */
export function step(state: SnakeState, rng: Rng): StepResult {
  const turn = state.pendingTurns.shift();
  if (turn) state.dir = turn;

  const head = state.body[0];
  const d = DELTAS[state.dir];
  const next: Cell = { col: head.col + d.col, row: head.row + d.row };

  // Pared.
  if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
    return "dead";
  }

  const ate = state.fruit !== null && sameCell(next, state.fruit.cell);

  // Cuerpo. Si no come, la cola se libera en este mismo paso y no cuenta;
  // si come, la cola no avanza y sí cuenta.
  const solid = ate ? state.body : state.body.slice(0, -1);
  if (solid.some((c) => sameCell(c, next))) return "dead";

  state.body.unshift(next);
  if (!ate) {
    state.body.pop();
    return "moved";
  }

  state.eaten += 1;
  state.fruit = pickFruit(state.body, rng);
  return state.fruit === null ? "won" : "ate";
}
