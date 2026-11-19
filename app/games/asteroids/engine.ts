// Motor de Asteroids: estado, update, draw y bucle con requestAnimationFrame.
// Portado de references/started-games/02-asteroids/game.js. No usa variables
// globales ni `document`: todo vive dentro de createAsteroids().

import {
  ASTEROID_EXPLOSION_PER_SIZE,
  ASTEROID_HIT_FACTOR,
  DEAD_WAIT,
  DEFAULT_EXPLOSION_PARTICLES,
  H,
  INITIAL_ASTEROIDS,
  LIVES,
  MAX_DT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEE_KILLS,
  SAFE_DIST,
  SHIP_EXPLOSION_PARTICLES,
  W,
  asteroidsForLevel,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  dist,
  rand,
} from "./entities";
import { createInput } from "./input";
import { Ship } from "./ship";

export interface AsteroidsCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación
  onLives: (lives: number) => void; // al perder una vida (y al iniciar)
  onLevel: (level: number) => void; // al pasar de nivel (y al iniciar)
  onGameOver: () => void; // una sola vez, al quedarse sin vidas
}

export interface AsteroidsHandle {
  pause: () => void;
  resume: () => void;
  destroy: () => void; // cancela el rAF y quita los listeners
}

type Phase = "playing" | "dead" | "gameover";

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Asteroids: el canvas no tiene contexto 2D");

  const input = createInput();

  // ── Estado ──────────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let phase: Phase = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let paused = false;
  let destroyed = false;

  let rafId: number | null = null;
  let lastTime: number | null = null;

  // Últimos valores comunicados: los callbacks solo se invocan al cambiar.
  let notifiedScore = score;
  let notifiedLives = -1;
  let notifiedLevel = -1;
  let gameOverNotified = false;

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
    if (phase === "gameover" && !gameOverNotified) {
      gameOverNotified = true;
      callbacks.onGameOver();
    }
  }

  // ── Lógica ──────────────────────────────────────────────────────────────────
  function spawnAsteroids(count: number): void {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame(): void {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = LIVES;
    level = 1;
    phase = "playing";
    spawnAsteroids(INITIAL_ASTEROIDS);
  }

  function nextLevel(): void {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(asteroidsForLevel(level));
  }

  function explode(
    x: number,
    y: number,
    count = DEFAULT_EXPLOSION_PARTICLES,
  ): void {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip(): void {
    explode(ship.x, ship.y, SHIP_EXPLOSION_PARTICLES);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
      // Con el modal abierto el motor ya no lee teclas.
      input.clear();
    } else {
      phase = "dead";
      deadTimer = DEAD_WAIT;
    }
  }

  function updateParticles(dt: number): void {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  function update(dt: number): void {
    if (phase === "gameover") {
      // Sin lectura de teclas: el reinicio lo hace React (runId).
      updateParticles(dt);
      return;
    }

    if (phase === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (input.pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, input);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * ASTEROID_EXPLOSION_PER_SIZE);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEE_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * ASTEROID_HIT_FACTOR) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (phase === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawLifeIcon(c: CanvasRenderingContext2D, x: number, y: number) {
    c.save();
    c.translate(x, y);
    c.rotate(-Math.PI / 2);
    c.strokeStyle = "#fff";
    c.lineWidth = 1.2;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-6, -5);
    c.lineTo(-3, 0);
    c.lineTo(-6, 5);
    c.closePath();
    c.stroke();
    c.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D): void {
    c.fillStyle = "#fff";
    c.font = "15px monospace";
    // PowerUp.draw deja textBaseline en "middle"; se fija aquí para que el
    // HUD no cambie de posición cuando hay un power-up en pantalla.
    c.textBaseline = "alphabetic";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(c, W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = "#0ff";
      c.fillText(`3x  ${Math.max(ship.tripleShot, 0).toFixed(1)}s`, 14, 46);
    }
  }

  function draw(): void {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);

    drawHUD(ctx);
    // Sin overlay de "GAME OVER": lo sustituye el modal de la plataforma.
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────
  function loop(ts: number): void {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    sync();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function cancelLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  initGame();
  input.attach();
  sync(); // onLives(3) y onLevel(1) iniciales; onScore no cambia aún
  draw();
  rafId = requestAnimationFrame(loop);

  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      cancelLoop();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      // Evita el salto de dt tras la pausa y descarta un disparo pendiente.
      lastTime = null;
      input.pressed("Space");
      rafId = requestAnimationFrame(loop);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelLoop();
      input.detach();
    },
  };
}
