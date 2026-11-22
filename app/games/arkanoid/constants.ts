// Constantes del motor de Rompebloques (Arkanoid). Coordenadas en píxeles del canvas.

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const INITIAL_LIVES = 3;
export const POINTS_PER_BLOCK = 10;

// Tope de dt en segundos: evita saltos de la bola tras una pestaña en segundo plano.
export const MAX_DT = 0.05;

// Paleta
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s

// Bola
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;

// Muro
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (CANVAS_W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

// Assets (servidos desde public/)
export const SPRITESHEET_URL = "/games/arkanoid/spritesheet-breakout.png";
export const BOUNCE_SOUND_URL = "/games/arkanoid/ball-bounce.mp3";
export const BREAK_SOUND_URL = "/games/arkanoid/break-sound.mp3";
