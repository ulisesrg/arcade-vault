// Recortes de fruta de fruits.png (fila central, pixel-art) y helpers de dibujo.
// Sin estado global: la imagen y el contexto llegan por parámetro.
// Las coordenadas vienen de references/source-assets/snake-assets/sprites.js; los
// nombres de ese atlas no coinciden con lo que se ve, así que aquí solo hay índices.

import { CELL } from "./constants";
import type { SnakePalette } from "./skins";

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ROW_Y = 136;
const ROW_H = 160;

// [x, w] de cada recorte, en el orden del atlas.
const FRUIT_COLUMNS: ReadonlyArray<readonly [number, number]> = [
  [34, 110],
  [186, 150],
  [378, 110],
  [540, 130],
  [712, 130],
  [894, 110],
  [1066, 110],
  [1228, 130],
  [1400, 130],
  [1582, 110],
  [1734, 150],
  [1906, 150],
  [2068, 170],
  [2250, 140],
  [2432, 130],
  [2604, 130],
  [2786, 110],
  [2948, 130],
  [3110, 150],
  [3302, 110],
  [3454, 150],
  [3637, 130],
];

export const FRUITS: readonly Frame[] = FRUIT_COLUMNS.map(([x, w]) => ({
  x,
  y: ROW_Y,
  w,
  h: ROW_H,
}));

/** Carga la imagen por URL. Rechaza si falla; el llamador decide qué hacer. */
export function loadFruits(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar fruits.png"));
    img.src = url;
  });
}

/**
 * Dibuja la fruta `index` dentro de la casilla (`col`, `row`): escala el recorte a
 * min(CELL / w, CELL / h) y lo centra. Con `img = null` (la carga falló) dibuja un
 * círculo de color.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  index: number,
  cell: { col: number; row: number },
  pal: SnakePalette,
): void {
  const x0 = cell.col * CELL;
  const y0 = cell.row * CELL;

  if (pal.fruitStyle === "shapes") {
    drawFruitShape(ctx, index, x0 + CELL / 2, y0 + CELL / 2, pal);
    return;
  }

  if (!img) {
    ctx.fillStyle = pal.fruitFallback;
    ctx.beginPath();
    ctx.arc(x0 + CELL / 2, y0 + CELL / 2, CELL * 0.35, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const f = FRUITS[index];
  const k = Math.min(CELL / f.w, CELL / f.h);
  const dw = f.w * k;
  const dh = f.h * k;
  ctx.drawImage(
    img,
    f.x,
    f.y,
    f.w,
    f.h,
    x0 + (CELL - dw) / 2,
    y0 + (CELL - dh) / 2,
    dw,
    dh,
  );
}

/**
 * Fruta con primitivas (skins neon y retro): la forma depende del índice (círculo,
 * rombo, triángulo, cuadrado) y el color de la paleta, para no depender solo del tono.
 * Aplica el brillo de la paleta y lo restablece a 0 al terminar.
 */
function drawFruitShape(
  ctx: CanvasRenderingContext2D,
  index: number,
  cx: number,
  cy: number,
  pal: SnakePalette,
): void {
  const r = CELL * 0.32;
  const color = pal.fruitColors[index % pal.fruitColors.length];
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = pal.glow;
  ctx.beginPath();
  switch (index % 4) {
    case 0:
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 1:
      ctx.moveTo(cx, cy - r * 1.2);
      ctx.lineTo(cx + r * 1.2, cy);
      ctx.lineTo(cx, cy + r * 1.2);
      ctx.lineTo(cx - r * 1.2, cy);
      ctx.closePath();
      break;
    case 2:
      ctx.moveTo(cx, cy - r * 1.2);
      ctx.lineTo(cx + r * 1.2, cy + r);
      ctx.lineTo(cx - r * 1.2, cy + r);
      ctx.closePath();
      break;
    default:
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.fill();
  ctx.shadowBlur = 0;
}
