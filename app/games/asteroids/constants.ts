// Constantes del motor de Asteroids, portadas de references/started-games/02-asteroids/game.js
// con los mismos valores. Coordenadas con origen arriba a la izquierda,
// velocidades en px/s y tiempos en segundos.

export const W = 800;
export const H = 600;

/** Tope del paso de tiempo por frame, en segundos. */
export const MAX_DT = 0.05;

// Asteroides: se indexan por tamaño (1 = pequeño, 2 = mediano, 3 = grande).
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;
export const ASTEROID_SPEED_JITTER = 15;
export const ASTEROID_ROT_SPEED = 1.2;
export const ASTEROID_MIN_VERTS = 8;
export const ASTEROID_MAX_VERTS = 13;
/** Un asteroide nuevo no aparece a menos de esta distancia del centro (donde reaparece la nave). */
export const SAFE_DIST = 130;
export const INITIAL_ASTEROIDS = 4;
/** Asteroides a generar al pasar al nivel `level` (desde el 2). */
export const asteroidsForLevel = (level: number): number => 3 + level;
/** La nave choca con el 82 % del radio del asteroide. */
export const ASTEROID_HIT_FACTOR = 0.82;

// Balas
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const BULLET_RADIUS = 2;

// Nave
export const SHIP_RADIUS = 12;
export const SHIP_ROT = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_NOSE = 21;
export const SHOOT_COOLDOWN = 0.2;
export const INVINCIBLE_TIME = 3;
export const LIVES = 3;
export const DEAD_WAIT = 2;

// Power-up 3x
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_RADIUS = 12;
export const POWERUP_SPEED_MIN = 20;
export const POWERUP_SPEED_MAX = 40;
/** Con esta cantidad de asteroides destruidos sin power-up, el siguiente se garantiza. */
export const POWERUP_GUARANTEE_KILLS = 5;
export const TRIPLE_SPREAD = 0.18; // rad

// Partículas
export const PARTICLE_SPEED_MIN = 30;
export const PARTICLE_SPEED_MAX = 130;
export const PARTICLE_LIFE_MIN = 0.4;
export const PARTICLE_LIFE_MAX = 1.1;
export const SHIP_EXPLOSION_PARTICLES = 14;
export const DEFAULT_EXPLOSION_PARTICLES = 8;
/** Partículas por asteroide destruido = tamaño × este factor. */
export const ASTEROID_EXPLOSION_PER_SIZE = 5;
