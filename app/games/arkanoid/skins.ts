// Paletas de Rompebloques por skin. El motor no dibuja ningún color fuera de aquí.
// `clasico` usa los sprites originales (los colores de los bloques viven en el
// spritesheet); `neon` y `retro` dibujan con primitivas del canvas.

import type { SkinId } from "../skins";
import type { BlockColor } from "./levels";

/** Relleno del bloque: sólido, hueco (solo contorno) o con una raya oscura. */
export type BlockStyle = "solid" | "outline" | "hatch";

export interface ArkanoidPalette {
  /** true = se dibuja con el spritesheet; los colores de bloque/paleta/bola se ignoran. */
  sprites: boolean;
  background: string;
  block: Record<BlockColor, string>;
  /** Forma del bloque además del tono (ayuda con el daltonismo). */
  blockStyle: Record<BlockColor, BlockStyle>;
  paddle: string;
  ball: string;
  /** Bola redonda (true) o cuadrada (false). */
  ballRound: boolean;
  /** Esquinas redondeadas de la paleta en px (0 = rectas). */
  paddleRadius: number;
  /** Margen interior del bloque en px: separa los bloques con bordes duros. */
  blockInset: number;
  hud: string;
  /** Radio de `shadowBlur` (0 = sin brillo). El motor lo restablece tras cada trazo. */
  glow: number;
}

const ALL_SOLID: Record<BlockColor, BlockStyle> = {
  gray: "solid",
  red: "solid",
  yellow: "solid",
  cyan: "solid",
  magenta: "solid",
  hotpink: "solid",
  green: "solid",
};

const NONE = "#000";

export const ARKANOID_SKINS: Record<SkinId, ArkanoidPalette> = {
  clasico: {
    sprites: true,
    background: "#000",
    block: {
      gray: NONE,
      red: NONE,
      yellow: NONE,
      cyan: NONE,
      magenta: NONE,
      hotpink: NONE,
      green: NONE,
    },
    blockStyle: ALL_SOLID,
    paddle: NONE,
    ball: NONE,
    ballRound: false,
    paddleRadius: 0,
    blockInset: 0,
    hud: "#fff",
    glow: 0,
  },
  neon: {
    sprites: false,
    background: "#05050a",
    block: {
      gray: "#a8aed6",
      red: "#ff7a00",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#c44dff",
      hotpink: "#ff006e",
      green: "#00ff88",
    },
    blockStyle: { ...ALL_SOLID, gray: "outline", red: "hatch" },
    paddle: "#00f5ff",
    ball: "#ffffff",
    ballRound: true,
    paddleRadius: 7,
    blockInset: 1.5,
    hud: "#e6e9ff",
    glow: 8,
  },
  // Paleta CGA de 5 colores sobre negro: cian, magenta, amarillo, verde y blanco.
  retro: {
    sprites: false,
    background: "#000000",
    block: {
      gray: "#ffffff",
      red: "#ff55ff",
      yellow: "#ffff55",
      cyan: "#55ffff",
      magenta: "#ff55ff",
      hotpink: "#ffffff",
      green: "#55ff55",
    },
    blockStyle: { ...ALL_SOLID, gray: "outline", red: "hatch" },
    paddle: "#55ffff",
    ball: "#ffffff",
    ballRound: false,
    paddleRadius: 0,
    blockInset: 1,
    hud: "#ffffff",
    glow: 0,
  },
};
