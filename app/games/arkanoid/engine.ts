// Motor de Rompebloques: estado, sonidos, update, draw y bucle con requestAnimationFrame.
// Portado de references/started-games/04-arkanoid/game.js. No usa variables
// globales ni `document`: todo vive dentro de createArkanoid().

import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BLOCK_H,
  BLOCK_W,
  BOUNCE_SOUND_URL,
  BREAK_SOUND_URL,
  CANVAS_H,
  CANVAS_W,
  INITIAL_LIVES,
  MAX_DT,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  SPRITESHEET_URL,
} from "./constants";
import { createInput } from "./input";
import { LEVELS, type BlockColor } from "./levels";
import { DEFAULT_SKIN, type SkinId } from "../skins";
import { ARKANOID_SKINS, type ArkanoidPalette } from "./skins";
import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  drawFrame,
  drawSprite,
  loadSpritesheet,
  type SpriteName,
} from "./sprites";

export interface ArkanoidCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación
  onLives: (lives: number) => void; // al perder una vida (y al iniciar, con 3)
  onLevel: (level: number) => void; // al pasar de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez: 0 vidas o nivel 5 limpiado
}

export interface ArkanoidHandle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo
  destroy: () => void; // cancela el rAF, quita los listeners y descarta la carga de assets
  setSkin: (skin: SkinId) => void; // cambia la paleta sin reiniciar la partida
}

export interface ArkanoidOptions {
  skin?: SkinId; // por defecto "clasico"
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // ms
}

const LAST_LEVEL = LEVELS.length;

export function createArkanoid(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
  options: ArkanoidOptions = {},
): ArkanoidHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Arkanoid: el canvas no tiene contexto 2D");

  const input = createInput();
  let pal: ArkanoidPalette = ARKANOID_SKINS[options.skin ?? DEFAULT_SKIN];

  // ── Estado ──────────────────────────────────────────────────────────────────
  const paddle = {
    x: (CANVAS_W - PADDLE_W) / 2,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
  };
  const ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let finished = false; // derrota o victoria: el bucle ya no se reanuda
  let paused = false;
  let destroyed = false;
  let spritesheet: HTMLImageElement | null = null;

  let rafId: number | null = null;
  let lastTime: number | null = null;

  // Últimos valores comunicados: los callbacks solo se invocan al cambiar.
  let notifiedScore = score;
  let notifiedLives = -1;
  let notifiedLevel = -1;
  let gameOverNotified = false;

  // ── Sonidos ─────────────────────────────────────────────────────────────────
  const bounceSound = new Audio(BOUNCE_SOUND_URL);
  const breakSound = new Audio(BREAK_SOUND_URL);

  function playSound(sound: HTMLAudioElement): void {
    if (destroyed) return;
    const clone = sound.cloneNode() as HTMLAudioElement;
    // El navegador rechaza play() hasta que hay un gesto del usuario: se ignora.
    clone.play().catch(() => {});
  }

  function sync(): void {
    if (score !== notifiedScore) {
      notifiedScore = score;
      callbacks.onScore(score);
    }
    if (lives !== notifiedLives) {
      notifiedLives = lives;
      callbacks.onLives(lives);
    }
    if (level !== notifiedLevel) {
      notifiedLevel = level;
      callbacks.onLevel(level);
    }
    if (finished && !gameOverNotified) {
      gameOverNotified = true;
      callbacks.onGameOver();
    }
  }

  // ── Lógica ──────────────────────────────────────────────────────────────────
  function placeBall(): void {
    const { speed } = LEVELS[level - 1];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number): void {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    placeBall();
  }

  function collides(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function finish(): void {
    finished = true;
    // Con el modal abierto el motor ya no lee teclas ni ratón.
    input.detach();
  }

  function update(dt: number): void {
    // Paleta con teclado
    if (input.keys.ArrowLeft) {
      paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    }
    if (input.keys.ArrowRight) {
      paddle.x = Math.min(CANVAS_W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    }

    // Movimiento de la bola
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rebote en paredes (izquierda, derecha y techo)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= CANVAS_W) {
      ball.x = CANVAS_W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }

    // Rebote en la paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }

    // Colisión con bloques (como máximo uno por frame)
    for (const block of blocks) {
      if (!block.alive) continue;
      if (collides(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += POINTS_PER_BLOCK;
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (level < LAST_LEVEL) loadLevel(level + 1);
          else finish(); // victoria
        }
        break;
      }
    }

    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Bola perdida
    if (!finished && ball.y > CANVAS_H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        finish(); // derrota
      } else {
        placeBall();
      }
    }
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function glow(color: string): void {
    if (!ctx || pal.glow <= 0) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = pal.glow;
  }

  function noGlow(): void {
    if (ctx && pal.glow > 0) ctx.shadowBlur = 0;
  }

  function roundedRect(x: number, y: number, w: number, h: number, r: number) {
    if (!ctx) return;
    ctx.beginPath();
    if (r > 0) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // Bloque con primitivas (skins sin sprites).
  function drawBlockShape(
    x: number,
    y: number,
    w: number,
    h: number,
    color: BlockColor,
  ): void {
    if (!ctx) return;
    const i = pal.blockInset;
    const c = pal.block[color];
    const style = pal.blockStyle[color];
    glow(c);
    if (style === "outline") {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + i + 1, y + i + 1, w - 2 * i - 2, h - 2 * i - 2);
    } else {
      ctx.fillStyle = c;
      ctx.fillRect(x + i, y + i, w - 2 * i, h - 2 * i);
    }
    noGlow();
    if (style === "hatch") {
      ctx.fillStyle = pal.background;
      ctx.fillRect(x + i + 4, y + h / 2 - 1, w - 2 * i - 8, 2);
    }
  }

  function drawBall(x: number, y: number, size: number, img: HTMLImageElement) {
    if (!ctx) return;
    if (pal.sprites) {
      drawSprite(ctx, img, "ball", x, y, size, size);
      return;
    }
    glow(pal.ball);
    ctx.fillStyle = pal.ball;
    if (pal.ballRound) {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, size, size);
    }
    noGlow();
  }

  function draw(): void {
    if (!ctx) return;
    ctx.fillStyle = pal.background;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Hasta que carga el spritesheet el frame se queda en blanco.
    const img = spritesheet;
    if (!img) return;

    for (const block of blocks) {
      if (!block.alive) continue;
      if (pal.sprites) {
        drawSprite(
          ctx,
          img,
          `block_${block.color}` as SpriteName,
          block.x,
          block.y,
          block.w,
          block.h,
        );
      } else {
        drawBlockShape(block.x, block.y, block.w, block.h, block.color);
      }
    }

    for (const exp of explosions) {
      const t = Math.min(exp.elapsed / EXPLOSION_DURATION, 1);
      if (pal.sprites) {
        const frameIndex = Math.min(Math.floor(t * 4), 3);
        drawFrame(
          ctx,
          img,
          EXPLOSION_FRAMES[exp.color][frameIndex],
          exp.x,
          exp.y,
          exp.w,
          exp.h,
        );
      } else {
        // Contorno que se expande y se desvanece.
        const grow = t * 8;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = pal.block[exp.color];
        ctx.lineWidth = 2;
        glow(pal.block[exp.color]);
        ctx.strokeRect(
          exp.x - grow,
          exp.y - grow,
          exp.w + 2 * grow,
          exp.h + 2 * grow,
        );
        noGlow();
        ctx.globalAlpha = 1;
      }
    }

    if (pal.sprites) {
      drawSprite(ctx, img, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
    } else {
      glow(pal.paddle);
      ctx.fillStyle = pal.paddle;
      roundedRect(paddle.x, paddle.y, paddle.w, paddle.h, pal.paddleRadius);
      ctx.fill();
      noGlow();
    }
    drawBall(ball.x, ball.y, ball.w, img);

    // HUD
    ctx.fillStyle = pal.hud;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Puntos: ${score}`, 10, 10);
    ctx.textAlign = "center";
    ctx.fillText(`Nivel: ${level}`, CANVAS_W / 2, 10);
    const ballSpacing = 4;
    for (let i = 0; i < lives; i++) {
      const bx = CANVAS_W - 10 - (lives - i) * (BALL_SIZE + ballSpacing);
      drawBall(bx, 10, BALL_SIZE, img);
    }
  }

  // ── Ratón ───────────────────────────────────────────────────────────────────
  const onMouseMove = (e: MouseEvent) => {
    if (destroyed || paused || finished) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    paddle.x = Math.max(
      0,
      Math.min(CANVAS_W - paddle.w, mouseX - paddle.w / 2),
    );
  };

  // ── Bucle ───────────────────────────────────────────────────────────────────
  function loop(ts: number): void {
    rafId = null;
    if (destroyed || paused || finished) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    sync();
    draw(); // en el último frame (fin de partida) se dibuja con el HUD
    if (!finished) rafId = requestAnimationFrame(loop);
  }

  function cancelLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  loadLevel(1);
  input.attach();
  canvas.addEventListener("mousemove", onMouseMove);
  sync(); // onLives(3) y onLevel(1) iniciales; onScore no cambia aún
  draw(); // negro hasta que cargue el spritesheet

  loadSpritesheet(SPRITESHEET_URL)
    .then((img) => {
      if (destroyed) return; // el motor se destruyó mientras cargaba
      spritesheet = img;
      draw();
      if (!paused && !finished) rafId = requestAnimationFrame(loop);
    })
    .catch((err: unknown) => {
      if (!destroyed) console.error("Arkanoid:", err);
    });

  return {
    setSkin(skin) {
      if (destroyed) return;
      pal = ARKANOID_SKINS[skin];
      draw(); // repinta ya: con la partida en pausa no habría otro frame
    },
    pause() {
      if (destroyed || paused) return;
      paused = true;
      cancelLoop();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      if (finished) return; // tras el fin, resume no revive el bucle
      // Evita el salto de dt tras la pausa y descarta teclas pulsadas durante ella.
      lastTime = null;
      input.clear();
      if (spritesheet) rafId = requestAnimationFrame(loop);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelLoop();
      input.detach();
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
