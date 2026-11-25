// Paletas de Víbora por skin. El motor no dibuja ningún color fuera de aquí.
// `clasico` reproduce exactamente los colores originales del juego.

import type { SkinId } from "../skins";

export interface SnakePalette {
  background: string;
  grid: string;
  border: string;
  body: string;
  bodyEdge: string;
  head: string;
  eye: string;
  /** Color del círculo de fruta cuando el sprite no carga (solo `clasico`). */
  fruitFallback: string;
  /** Colores de las frutas dibujadas con primitivas (se elige por índice de sprite). */
  fruitColors: readonly string[];
  /** "sprite" = fruits.png; "shapes" = formas del canvas (círculo, rombo, triángulo, cuadrado). */
  fruitStyle: "sprite" | "shapes";
  hudText: string;
  hudOutline: string;
  startText: string;
  startBackdrop: string;
  /** Radio de `shadowBlur` (0 = sin brillo). El motor lo restablece tras cada trazo. */
  glow: number;
  segmentRadius: number;
  lineJoin: CanvasLineJoin;
}

export const SNAKE_SKINS: Record<SkinId, SnakePalette> = {
  clasico: {
    background: "#05060f",
    grid: "rgba(0, 245, 255, 0.07)",
    border: "rgba(0, 245, 255, 0.25)",
    body: "#39ff14",
    bodyEdge: "#1fa30a",
    head: "#b6ff9e",
    eye: "#05060f",
    fruitFallback: "#ff2e63",
    fruitColors: [],
    fruitStyle: "sprite",
    hudText: "#ffffff",
    hudOutline: "#05060f",
    startText: "#00f5ff",
    startBackdrop: "rgba(5, 6, 15, 0.75)",
    glow: 0,
    segmentRadius: 9,
    lineJoin: "round",
  },
  neon: {
    background: "#04040a",
    grid: "rgba(0, 245, 255, 0.10)",
    border: "#00f5ff",
    body: "#00ff88",
    bodyEdge: "#00a35a",
    head: "#f5ff00",
    eye: "#04040a",
    fruitFallback: "#ff006e",
    fruitColors: ["#ff006e", "#00f5ff", "#f5ff00", "#ff8a00"],
    fruitStyle: "shapes",
    hudText: "#e6e9ff",
    hudOutline: "#04040a",
    startText: "#00f5ff",
    startBackdrop: "rgba(4, 4, 10, 0.85)",
    glow: 10,
    segmentRadius: 12,
    lineJoin: "round",
  },
  // Paleta CGA: negro, cian, magenta, blanco. Sin brillo, bordes duros.
  retro: {
    background: "#000000",
    grid: "#0a1f1f",
    border: "#55ffff",
    body: "#55ffff",
    bodyEdge: "#000000",
    head: "#ffffff",
    eye: "#000000",
    fruitFallback: "#ff55ff",
    fruitColors: ["#ff55ff", "#ffffff"],
    fruitStyle: "shapes",
    hudText: "#ffffff",
    hudOutline: "#000000",
    startText: "#ff55ff",
    startBackdrop: "#000000",
    glow: 0,
    segmentRadius: 0,
    lineJoin: "miter",
  },
};
