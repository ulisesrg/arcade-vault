// Nave del jugador. Recibe la entrada y el contexto por parámetro.

import {
  H,
  INVINCIBLE_TIME,
  SHIP_DRAG,
  SHIP_NOSE,
  SHIP_RADIUS,
  SHIP_ROT,
  SHIP_THRUST,
  SHOOT_COOLDOWN,
  TRIPLE_SPREAD,
  W,
} from "./constants";
import { Bullet, glow, noGlow, rand, wrap } from "./entities";
import type { Input } from "./input";
import type { AsteroidsPalette } from "./skins";

export class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = SHIP_RADIUS;
  thrusting = false;
  invincible = INVINCIBLE_TIME;
  shootCooldown = 0;
  dead = false;
  /** Segundos que le quedan al power-up 3x (0 = sin power-up). */
  tripleShot = 0;

  /** Reaparece en el centro, quieta y con invencibilidad. No toca `tripleShot`. */
  reset(): void {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = INVINCIBLE_TIME;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, input: Input): void {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    if (input.keys["ArrowLeft"]) this.angle -= SHIP_ROT * dt;
    if (input.keys["ArrowRight"]) this.angle += SHIP_ROT * dt;

    this.thrusting = !!input.keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
    }

    this.vx *= SHIP_DRAG;
    this.vy *= SHIP_DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  /** Devuelve las balas del disparo, o [] si está en recarga o muerta. */
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = SHOOT_COOLDOWN;
    const ox = this.x + Math.cos(this.angle) * SHIP_NOSE;
    const oy = this.y + Math.sin(this.angle) * SHIP_NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette): void {
    if (this.dead) return;
    // Parpadeo durante la invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = pal.ship;
    ctx.lineWidth = pal.lineWidth;
    ctx.lineJoin = pal.lineJoin;
    glow(ctx, pal, pal.ship);

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();
    noGlow(ctx);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = pal.flame;
      glow(ctx, pal, pal.flame);
      ctx.stroke();
      noGlow(ctx);
    }

    ctx.restore();
  }
}
