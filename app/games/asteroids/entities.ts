// Entidades del juego (todo salvo la nave). Cada una se dibuja con el contexto
// recibido por parámetro: aquí no hay globales ni acceso a `document`.

import {
  ASTEROID_MAX_VERTS,
  ASTEROID_MIN_VERTS,
  ASTEROID_ROT_SPEED,
  ASTEROID_SPEED_JITTER,
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  H,
  PARTICLE_LIFE_MAX,
  PARTICLE_LIFE_MIN,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
  POWERUP_RADIUS,
  POWERUP_SPEED_MAX,
  POWERUP_SPEED_MIN,
  POWERUP_TTL,
  RADII,
  SPEEDS,
  W,
} from "./constants";
import type { AsteroidsPalette } from "./skins";

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Envuelve `v` en [0, max): lo que sale por un borde entra por el opuesto. */
export const wrap = (v: number, max: number): number =>
  ((v % max) + max) % max;

export const dist = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(a.x - b.x, a.y - b.y);

export const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/** Activa el brillo de la skin; llamar a `noGlow` justo tras el trazo. */
export const glow = (
  ctx: CanvasRenderingContext2D,
  pal: AsteroidsPalette,
  color: string,
): void => {
  if (pal.glow <= 0) return;
  ctx.shadowColor = color;
  ctx.shadowBlur = pal.glow;
};

export const noGlow = (ctx: CanvasRenderingContext2D): void => {
  ctx.shadowBlur = 0;
};

export const randInt = (min: number, max: number): number =>
  Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = BULLET_TTL;
  radius = BULLET_RADIUS;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette): void {
    ctx.fillStyle = pal.bullet;
    glow(ctx, pal, pal.bullet);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    noGlow(ctx);
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────

/** 1 = pequeño, 2 = mediano, 3 = grande. */
export type AsteroidSize = 1 | 2 | 3;

export class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][] = [];
  dead = false;

  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed =
      SPEEDS[size] + rand(-ASTEROID_SPEED_JITTER, ASTEROID_SPEED_JITTER);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-ASTEROID_ROT_SPEED, ASTEROID_ROT_SPEED);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(ASTEROID_MIN_VERTS, ASTEROID_MAX_VERTS);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  /** Dos asteroides del tamaño inferior; los pequeños no se parten. */
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    const next = (this.size - 1) as AsteroidSize;
    return [new Asteroid(this.x, this.y, next), new Asteroid(this.x, this.y, next)];
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = pal.asteroid[this.size];
    ctx.lineWidth = pal.lineWidth;
    ctx.lineJoin = pal.lineJoin;
    glow(ctx, pal, pal.asteroid[this.size]);
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) {
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    noGlow(ctx);
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────

export class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = POWERUP_RADIUS;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(POWERUP_SPEED_MIN, POWERUP_SPEED_MAX);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette): void {
    // Parpadea durante los últimos 2 s de vida.
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = pal.powerUp;
    ctx.lineWidth = 2;
    glow(ctx, pal, pal.powerUp);
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    noGlow(ctx);
    ctx.restore();
    ctx.fillStyle = pal.powerUp;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

// ── Particle (explosión) ──────────────────────────────────────────────────────

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(PARTICLE_LIFE_MIN, PARTICLE_LIFE_MAX);
    this.ttl = this.life;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette): void {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${pal.particle},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
