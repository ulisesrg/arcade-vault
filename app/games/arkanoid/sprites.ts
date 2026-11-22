// Recortes del spritesheet y helpers de dibujo. Sin estado global: la imagen y el
// contexto llegan por parámetro.

import type { BlockColor } from "./levels";

export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export type SpriteName =
  | "paddle"
  | "ball"
  | "block_gray"
  | "block_red"
  | "block_yellow"
  | "block_cyan"
  | "block_magenta"
  | "block_hotpink"
  | "block_green";

export const EXPLOSION_DURATION = 150; // ms

// 4 frames por color, en columnas de 32 px a partir de x = 256.
function explosionRow(sy: number): Frame[] {
  return [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
}

export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = {
  red: explosionRow(176),
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: explosionRow(176), // gray reutiliza los frames de red
};

export const SPRITES: Record<SpriteName, Frame> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  block_gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  block_red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  block_yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  block_cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  block_magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  block_hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  block_green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

/** Carga la imagen por URL. Rechaza si falla; el llamador decide qué hacer. */
export function loadSpritesheet(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el spritesheet"));
    img.src = url;
  });
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  name: SpriteName,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  drawFrame(ctx, img, SPRITES[name], x, y, w, h);
}
