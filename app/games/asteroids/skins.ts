// Paletas de Asteroids por skin. El motor no dibuja ningún color fuera de aquí.
// `clasico` reproduce exactamente los colores originales del juego.

import type { SkinId } from "../skins";

export interface AsteroidsPalette {
  background: string;
  ship: string;
  flame: string;
  bullet: string;
  /** Color del contorno según el tamaño del asteroide (1 pequeño … 3 grande). */
  asteroid: { 1: string; 2: string; 3: string };
  powerUp: string;
  /** Componentes "r,g,b" de las partículas; el alfa lo calcula el motor. */
  particle: string;
  hud: string;
  hudPower: string;
  lifeIcon: string;
  /** Radio de `shadowBlur` (0 = sin brillo). El motor lo restablece tras cada trazo. */
  glow: number;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    background: "#000",
    ship: "#fff",
    flame: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: { 1: "#fff", 2: "#fff", 3: "#fff" },
    powerUp: "#0ff",
    particle: "255,255,255",
    hud: "#fff",
    hudPower: "#0ff",
    lifeIcon: "#fff",
    glow: 0,
    lineWidth: 1.5,
    lineJoin: "round",
  },
  neon: {
    background: "#05050a",
    ship: "#00f5ff",
    flame: "#ff8a00",
    bullet: "#ffffff",
    asteroid: { 1: "#f5ff00", 2: "#00ff88", 3: "#ff006e" },
    powerUp: "#f5ff00",
    particle: "255,0,110",
    hud: "#e6e9ff",
    hudPower: "#f5ff00",
    lifeIcon: "#00f5ff",
    glow: 10,
    lineWidth: 1.8,
    lineJoin: "round",
  },
  // Paleta CGA de 4 colores sobre negro: negro, cian, magenta, blanco.
  retro: {
    background: "#000000",
    ship: "#ffffff",
    flame: "#ff55ff",
    bullet: "#ffffff",
    asteroid: { 1: "#55ffff", 2: "#55ffff", 3: "#55ffff" },
    powerUp: "#ff55ff",
    particle: "85,255,255",
    hud: "#ffffff",
    hudPower: "#ff55ff",
    lifeIcon: "#ffffff",
    glow: 0,
    lineWidth: 2,
    lineJoin: "miter",
  },
};
