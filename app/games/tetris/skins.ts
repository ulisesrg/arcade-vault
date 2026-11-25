// Paletas de Tetris por skin. El render no dibuja ningún color fuera de aquí.
// `clasico` reproduce exactamente los colores originales del juego.

import type { SkinId } from "../skins";

export type BlockPattern = "solid" | "hollow" | "dots";

export interface TetrisPalette {
  /** Relleno del canvas; null = transparente (se ve el fondo CSS original). */
  background: string | null;
  grid: string;
  gridLineWidth: number;
  /** Color por tipo de pieza (índices 1–7); el 0 no se usa. */
  colors: readonly string[];
  /** Relleno de la pieza por tipo (índices 1–7): ayuda al daltonismo. */
  patterns: readonly BlockPattern[];
  /** Franja de brillo superior de cada bloque; null = sin franja. */
  highlight: string | null;
  highlightH: number;
  /** Color de los puntos del patrón "dots" (suele ser el fondo). */
  dotColor: string;
  ghostAlpha: number;
  /** Radio de `shadowBlur` (0 = sin brillo). El render lo restablece tras cada bloque. */
  glow: number;
}

const SOLID: readonly BlockPattern[] = Array(8).fill("solid");

export const TETRIS_SKINS: Record<SkinId, TetrisPalette> = {
  clasico: {
    background: null,
    grid: "#22222e",
    gridLineWidth: 0.5,
    colors: [
      "",
      "#4dd0e1", // I
      "#ffd54f", // O
      "#ba68c8", // T
      "#81c784", // S
      "#e57373", // Z
      "#90caf9", // J
      "#ffb74d", // L
    ],
    patterns: SOLID,
    highlight: "rgba(255,255,255,0.12)",
    highlightH: 4,
    dotColor: "#1a1a25",
    ghostAlpha: 0.2,
    glow: 0,
  },
  neon: {
    background: "#05050a",
    grid: "#1c1c38",
    gridLineWidth: 0.5,
    colors: [
      "",
      "#00f5ff", // I cian
      "#f5ff00", // O amarillo
      "#c264ff", // T violeta
      "#00ff88", // S verde
      "#ff006e", // Z magenta
      "#5b8cff", // J azul
      "#ff8a00", // L naranja
    ],
    patterns: SOLID,
    highlight: null,
    highlightH: 0,
    dotColor: "#05050a",
    ghostAlpha: 0.28,
    glow: 8,
  },
  // CGA sobre negro: cian, magenta, amarillo, verde y blanco. Las 7 piezas se
  // distinguen además por el relleno (macizo, punteado o hueco).
  retro: {
    background: "#000000",
    grid: "#2a2a2a",
    gridLineWidth: 1,
    colors: [
      "",
      "#55ffff", // I cian macizo
      "#ffff55", // O amarillo macizo
      "#ff55ff", // T magenta macizo
      "#55ff55", // S verde punteado
      "#ff55ff", // Z magenta hueco
      "#55ffff", // J cian hueco
      "#ffffff", // L blanco macizo
    ],
    patterns: ["solid", "solid", "solid", "solid", "dots", "hollow", "hollow", "solid"],
    highlight: null,
    highlightH: 0,
    dotColor: "#000000",
    ghostAlpha: 0.35,
    glow: 0,
  },
};
