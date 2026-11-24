# SPEC JAM paletas-B — DUELO DE PALETAS: remates, rachas y reloj contra la CPU

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09, SPEC 10
> **Date:** 2026-11-23
> **Objective:** Diseñar un duelo de paletas contra la CPU como motor TypeScript con canvas, con física de paso fijo, tres vidas, un remate con tecla propia, puntos por racha y un reloj de 4 minutos, jugable en `/juegos/paletas/jugar` dentro de `GamePlayer` (añadiendo una entrada al registro de motores), con su puntuación guardada en Supabase y visible en el leaderboard de `/juegos/paletas` y en `/salon`.

## Por qué existe este spec

Es el primer juego de la categoría `VERSUS`, que hoy no tiene ningún título, y el primero **sin código ni assets de referencia** desde VÍBORA (spec 10). Todo (reglas, HUD, arte, IA de la CPU) se diseña aquí. El concepto es el género "duelo de paletas": dos paletas verticales y una bola que rebota. No se copia ningún nombre, arte ni disposición de un clásico comercial; el título visible es propio (DUELO DE PALETAS) y todo se dibuja con primitivas del canvas.

Esta variante (B) es la **"de remates"**: en lugar de un marcador por niveles de tantos (variante A), la partida es una **contrarreloj de 4 minutos con 3 vidas**. El nivel sube **con el tiempo** (cada 30 s), no con los tantos; el jugador tiene una **segunda tecla de acción (Espacio, "remate")** con ventana de acierto y recarga; los puntos van por **racha de tantos** (multiplicador) y no por rally; y la CPU **predice los rebotes** de la bola. La física usa un **paso fijo de 1/120 s con acumulador** (modelo de tiempo distinto del `dt` continuo de la variante A). La partida termina por **perder las 3 vidas** o por **agotarse el reloj**.

Entra como **entrada nueva** `paletas` en `games` (`sort_order = 4`): el catálogo ya tiene `asteroids`, `tetris`, `arkanoid` y `snake`. Es el **quinto juego real**: el registro de motores ya existe, así que solo se añade la entrada. Encaja en la forma de la spec 05 con un canvas de 800×600 y los callbacks `onScore`, `onLives`, `onLevel` y `onGameOver`, como Asteroids y Arkanoid (con vidas y nivel en la barra).

## Scope

**In:**

- Entrada nueva `paletas` en `games` (DUELO DE PALETAS, `VERSUS`, `cover-paletas`, `yellow`, `sort_order = 4`) mediante la migración `supabase/migrations/YYYYMMDDHHMMSS_paletas.sql` (la versión real la fija `apply_migration`), que también amplía la política de insert de `scores` a `paletas`.
- `paletas` en `REAL_GAME_IDS` de `app/actions/scores.ts`, y `database.types.ts` comprobado tras la migración (regenerado si cambia).
- Motor en `app/games/paletas/`, diseñado desde cero en TypeScript estricto, sin globales y sin acceso a `document`.
- API del motor: `createPaletas(canvas, callbacks)` que devuelve `{ pause, resume, destroy }`, con `onScore`, `onLives`, `onLevel` y `onGameOver`.
- Canvas de 800×600; paleta del jugador a la izquierda, paleta de la CPU a la derecha, una bola.
- Control con `W`/`S` o `↑`/`↓` (movimiento continuo) y `Espacio` para el remate.
- Simulación de **paso fijo de 1/120 s** con acumulador, independiente de la tasa de refresco.
- IA de la CPU con predicción de rebotes, y velocidad máxima, reacción y error que dependen del nivel (tabla de 8 niveles).
- Reloj de 4 minutos que solo corre con la partida en marcha, y nivel que sube cada 30 s.
- Componente cliente `app/components/paletas-canvas.tsx` con un `<canvas>` de 800×600, copia de `asteroids-canvas.tsx` (`runId`, `paused`, callbacks en `ref`).
- Entrada `paletas` en `app/games/registry.ts` con `hud: { lives: true, level: true }`. `GamePlayer` no cambia: ya consulta el registro.
- Barra de la plataforma (Jugador, Puntuación, Vidas, Nivel) alimentada por los callbacks del motor.
- HUD en el canvas: `Puntos:`, `Nivel:`, `Vidas:`, `Racha ×N`, reloj `mm:ss`, indicador de recarga del remate y el mensaje de inicio "PULSA W/S O ↑/↓ PARA EMPEZAR" mientras la partida espera.
- Fin por vidas agotadas o por reloj a cero: ambos disparan `onGameOver` una sola vez y abren el mismo modal "FIN DEL JUEGO".
- PAUSA, FIN, modal "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" con `saveScore` y "JUGAR DE NUEVO" con `runId`, como los otros juegos reales.
- Clase `.cover-paletas` en `app/globals.css` y escalado del canvas en el marco CRT (extender la regla `.crt-screen > .asteroids-canvas, .crt-screen > .arkanoid-canvas, .crt-screen > .snake-canvas` al canvas de este juego).
- Añadir la fila del juego a `references/implemented-games.md` (y tocar `CLAUDE.md` solo si cambia el contrato común de los juegos).

**Out of scope (para futuros specs):**

- Sonido y música (no hay assets de audio).
- Assets externos: no hay `public/games/paletas/`; todo se dibuja con primitivas.
- Controles táctiles o gamepad, y teclas alternativas de pausa (`P`, `Escape`): solo el botón PAUSA. `Espacio` es el remate y nunca pausa.
- Modo de dos jugadores en el mismo teclado u online, elección de dificultad, obstáculos, potenciadores o varias bolas.
- Interpolación gráfica entre pasos de simulación: se dibuja el último estado (a 120 Hz es imperceptible).
- Distinguir la victoria por reloj de la derrota por vidas en el modal: es el mismo.
- Resolución adaptativa o `devicePixelRatio`: el canvas es de 800×600 fijos.
- Auth, `user_id`, antitrampas y rate limiting (ver spec 06).
- Cambios en `app/lib/games.ts`, `leaderboard.tsx`, `hall-board.tsx`, `/salon` y `game-player.tsx`: el juego aparece por tener fila en `games` y entrada en el registro.
- Tests automatizados (no hay runner configurado).

## Data model

Catálogo (migración; se muestra el esquema, no el SQL completo). Los textos son una propuesta a revisar:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_paletas.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('paletas', 'DUELO DE PALETAS',
   'Aguanta 4 minutos contra la CPU con remates y rachas.',
   'Mueve tu paleta con W/S o las flechas y pulsa Espacio para rematar justo al golpear la bola. Cada tanto suma 100 puntos por tu racha (hasta ×5), más 50 si la CPU ni la toca tras un remate. Tienes 3 vidas, cada 30 segundos la CPU juega mejor y la partida dura 4 minutos como máximo.',
   'VERSUS', 'cover-paletas', 'yellow', 4);

drop policy "scores_insert_real_games" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris', 'arkanoid', 'snake', 'paletas'));
```

API del motor:

```ts
// app/games/paletas/engine.ts
export interface PaletasCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación (tanto del jugador o bonus final)
  onLives: (lives: number) => void; // al cambiar las vidas (y al iniciar, con 3)
  onLevel: (level: number) => void; // al subir de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez: sin vidas o reloj a cero
}

export interface PaletasHandle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo
  destroy: () => void; // cancela el rAF y quita los listeners
}

export function createPaletas(
  canvas: HTMLCanvasElement, // 800×600
  callbacks: PaletasCallbacks,
): PaletasHandle;
```

Props del componente (cumple `RealCanvasProps` del registro):

```ts
// app/components/paletas-canvas.tsx  ("use client")
interface PaletasCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  onScore: (n: number) => void;
  onLives: (n: number) => void;
  onLevel: (n: number) => void;
  onGameOver: () => void;
}
// <canvas className="paletas-canvas" width={800} height={600} aria-label="Juego Duelo de paletas" />
```

Registro de motores (solo se añade la entrada):

```ts
// app/games/registry.ts
paletas: { Canvas: PaletasCanvas, hud: { lives: true, level: true } },
```

Estado del motor (privado, dentro del cierre de `createPaletas`):

```ts
type Phase = "waiting" | "serving" | "playing" | "ended";
// phase: "waiting" hasta la primera tecla; "serving" con la bola quieta en el centro;
//        "playing" con la bola en juego; "ended" tras onGameOver
// accumulator: segundos pendientes de simular (se consumen en pasos de 1/120 s)
// playerY, cpuY: coordenada Y del centro de cada paleta
// ball: { x, y, vx, vy }; smashed: true si el último toque de la bola fue un remate del jugador
// serveTimer, serveToward: igual que una cuenta de saque (-1 hacia el jugador, +1 hacia la CPU)
// lives (3..0), streak (tantos seguidos sin encajar), score
// clock: segundos restantes (240 → 0); level = 1 + floor((240 - clock) / 30), máximo 8
// smashWindow: segundos que quedan de ventana de remate abierta (0 = cerrada)
// smashCooldown: segundos que faltan para poder rematar otra vez
// cpuTarget, cpuTimer: objetivo Y de la CPU y tiempo hasta recalcularlo
```

Módulos del motor (todos en `app/games/paletas/`):

| Archivo        | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | `CANVAS_W = 800`, `CANVAS_H = 600`, `PADDLE_W = 14`, `PADDLE_H = 90`, `PLAYER_X = 24`, `CPU_X = 762`, `PLAYER_SPEED = 480`, `BALL_R = 8`, `MAX_BOUNCE_ANGLE = 60°` (radianes), `HIT_SPEEDUP = 24`, `MAX_BALL_SPEED = 900`, `SMASH_FACTOR = 1.35`, `SMASH_WINDOW = 0.12`, `SMASH_COOLDOWN = 1`, `SERVE_DELAY = 0.8`, `STEP = 1 / 120`, `MAX_ACCUMULATED = 0.05`, `MATCH_SECONDS = 240`, `SECONDS_PER_LEVEL = 30`, `MAX_LEVEL = 8`, `INITIAL_LIVES = 3`, puntos y paleta de colores |
| `input.ts`     | `createInput()` con `attach()`/`detach()`, `axis()` (−1, 0, +1 según `KeyW`/`ArrowUp` y `KeyS`/`ArrowDown`, por `code`), `consumeSmash()` (true una vez por pulsación de `Space`, sin repetición de teclado), `consumeStart()` para la primera tecla válida, `setActive(false)` que descarta y bloquea las teclas, `preventDefault` en `↑`/`↓`/`Espacio` fuera de `input`/`textarea` y limpieza en `blur`                                                                         |
| `levels.ts`    | `LEVELS`: tabla de 8 entradas `{ serveSpeed, cpuSpeed, cpuReaction, cpuError }` y `levelFor(clock)`                                                                                                                                                                                                                                                                                                                                                                               |
| `physics.ts`   | lógica pura sin `ctx`: un paso de simulación de 1/120 s (mover bola, rebote en paredes, colisión con paleta y ángulo, remate, detección de tanto) y `predictLandingY(ball, targetX)` con rebotes                                                                                                                                                                                                                                                                                  |
| `cpu.ts`       | IA de la CPU: recalcular el objetivo cada `cpuReaction` segundos con `predictLandingY` más error, y mover la paleta a `cpuSpeed` máximo; penalización tras un remate                                                                                                                                                                                                                                                                                                              |
| `engine.ts`    | estado, acumulador, fases, `update`, `draw`, bucle con `requestAnimationFrame` y `createPaletas`                                                                                                                                                                                                                                                                                                                                                                                  |

Reglas de juego (diseñadas aquí; todas son **propuestas a revisar**):

| Regla                     | Valor                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas                    | 800×600, fondo `#05060d` pintado en cada frame, línea central discontinua y bordes superior e inferior tenues                                                                                                                                                                                                                        |
| Paletas                   | rectángulos de 14×90 px; jugador con borde izquierdo en x = 24 y CPU con borde izquierdo en x = 762; el centro Y se limita a [45, 555]; posición inicial: centro (y = 300)                                                                                                                                                           |
| Bola                      | círculo de radio 8 px, color `yellow` de la plataforma; empieza en (400, 300)                                                                                                                                                                                                                                                        |
| Tiempo de simulación      | paso fijo de 1/120 s: cada frame suma `dt` (tope 0,05 s) al acumulador y se simulan tantos pasos como quepan; sin interpolación. A 900 px/s la bola avanza 7,5 px por paso, menos que el grosor de la paleta (14 px), así que no necesita subpasos                                                                                   |
| Inicio                    | la partida **espera** con el mensaje de inicio, con el reloj y la simulación parados hasta la primera tecla válida (`W`, `S`, `↑`, `↓`); al pulsarla empieza la cuenta de saque                                                                                                                                                      |
| Reloj                     | `MATCH_SECONDS = 240`; baja 1/120 s por paso simulado en las fases `serving` y `playing` (no en `waiting` ni en pausa); al llegar a 0 termina la partida                                                                                                                                                                             |
| Saque                     | la bola queda quieta en el centro `SERVE_DELAY = 0,8` s (parpadeo cada 0,2 s) y sale con velocidad `serveSpeed` del nivel, ángulo aleatorio en ±25° respecto al eje X, hacia quien **encajó** el último tanto (primer saque: hacia la CPU)                                                                                           |
| Control del jugador       | `W`/`↑` sube y `S`/`↓` baja a 480 px/s mientras la tecla está pulsada; ambas a la vez = parada; sin inercia                                                                                                                                                                                                                          |
| Rebote en paredes         | si `y − 8 ≤ 0` o `y + 8 ≥ 600`, `vy` cambia de signo y la bola se recoloca dentro                                                                                                                                                                                                                                                    |
| Colisión con paleta       | hay golpe cuando la bola avanza hacia la paleta, su borde delantero cruza la cara frontal y `abs(y − centroPaleta) ≤ 45 + 8`; la cara trasera no golpea                                                                                                                                                                              |
| Ángulo de salida          | `offset = (y − centroPaleta) / 45` limitado a [−1, 1]; ángulo = `offset × 60°`; la bola sale hacia el otro lado con `vx = ±speed·cos(ángulo)` y `vy = speed·sin(ángulo)`                                                                                                                                                             |
| Velocidad de la bola      | el saque usa `serveSpeed` del nivel; cada golpe de paleta (de cualquiera) suma 24 px/s al módulo de la velocidad, con tope de 900 px/s                                                                                                                                                                                               |
| Remate                    | `Espacio` abre una **ventana de 0,12 s** si la recarga está libre; la recarga (1 s) empieza al pulsar, acierte o no. Si la bola golpea la paleta del jugador con la ventana abierta, la velocidad pasa a `min((speed + 24) × 1,35, 900)` y `smashed = true`                                                                          |
| Remate y CPU              | tras un remate la CPU queda "aturdida": no recalcula su objetivo en los siguientes 0,25 s                                                                                                                                                                                                                                            |
| `smashed`                 | se activa con un remate acertado y se desactiva cuando la paleta de la CPU toca la bola o al terminar el tanto                                                                                                                                                                                                                       |
| Tanto                     | si el centro de la bola sale por la izquierda (`x < 0`) marca la CPU; por la derecha (`x > 800`) marca el jugador; tras cada tanto: `smashed = false`, bola al centro y nueva cuenta de saque                                                                                                                                        |
| Racha                     | tantos seguidos del jugador sin encajar; al marcar el jugador `racha += 1`; al encajar `racha = 0`; el multiplicador es `min(racha, 5)` (×1 … ×5)                                                                                                                                                                                    |
| Puntos por tanto          | al marcar el jugador: `100 × multiplicador` (con la racha ya incrementada) y `+50` si `smashed` era `true` al cruzar la bola la línea (la CPU no llegó a tocarla tras el remate)                                                                                                                                                     |
| Vidas                     | 3; cada tanto de la CPU resta 1 (`onLives`); con 0 vidas termina la partida                                                                                                                                                                                                                                                          |
| Nivel                     | `1 + floor((240 − reloj) / 30)`, máximo 8 (el nivel 8 empieza a los 210 s); sube durante un rally sin interrumpirlo: afecta a `cpuSpeed`, `cpuReaction` y `cpuError` al instante y a `serveSpeed` en el siguiente saque                                                                                                              |
| Tabla de niveles          | ver tabla siguiente                                                                                                                                                                                                                                                                                                                  |
| IA de la CPU              | cada `cpuReaction` s, si la bola se acerca, fija `cpuTarget = predictLandingY(bola, CPU_X) + error` (`error` aleatorio en ±`cpuError`, la predicción incluye los rebotes en las paredes), o `300` si se aleja; la paleta se mueve hacia `cpuTarget` a `cpuSpeed` máximo con una zona muerta de 6 px                                  |
| Fin por vidas             | `lives = 0`: se dibuja un último frame y se llama a `onGameOver`                                                                                                                                                                                                                                                                     |
| Fin por reloj             | `clock = 0`: bonus `+200` por cada vida restante, se dibuja un último frame y se llama a `onGameOver` (el bonus se refleja con un último `onScore`)                                                                                                                                                                                  |
| Orden de dibujo           | fondo y línea central, bola con rastro corto (3 posiciones previas más tenues), paletas (la del jugador blanca mientras la ventana de remate está abierta), HUD, mensaje de inicio (solo si `phase = "waiting"`)                                                                                                                     |
| HUD del canvas            | texto `bold 18px monospace` con contorno oscuro: `Puntos: N` arriba a la izquierda, reloj `mm:ss` arriba en el centro, `Nivel: N` arriba a la derecha, `Racha ×N` abajo a la izquierda, `Vidas: N` abajo a la derecha, y una barra de 60×6 px de recarga del remate abajo en el centro (llena = lista, amarilla; vacía = en recarga) |
| Mensaje de inicio         | "PULSA W/S O ↑/↓ PARA EMPEZAR" centrado, visible solo hasta la primera tecla válida                                                                                                                                                                                                                                                  |
| Duración                  | de 1 min (derrota rápida) a 4 min exactos de reloj, más el tiempo que se pase en espera inicial y pausa                                                                                                                                                                                                                              |
| Puntuación máxima posible | cota teórica: al menos 0,8 s de saque + 0,84 s de vuelo (756 px a 900 px/s) por tanto → como mucho 146 tantos en 240 s; cada uno vale como mucho `100 × 5 + 50 = 550` → 80 300; más `3 × 200 = 600` de bonus de vidas = **80 900**. En la práctica es mucho menor. Muy por debajo del `check` de 10 000 000                          |

Tabla de niveles (`LEVELS`, constantes del motor; propuestas a revisar):

| Nivel | Desde (s) | `serveSpeed` (px/s) | `cpuSpeed` (px/s) | `cpuReaction` (s) | `cpuError` (± px) |
| ----- | --------- | ------------------- | ----------------- | ----------------- | ----------------- |
| 1     | 0         | 360                 | 230               | 0,25              | 60                |
| 2     | 30        | 380                 | 265               | 0,22              | 52                |
| 3     | 60        | 400                 | 300               | 0,19              | 44                |
| 4     | 90        | 420                 | 335               | 0,16              | 36                |
| 5     | 120       | 440                 | 370               | 0,14              | 28                |
| 6     | 150       | 460                 | 405               | 0,12              | 22                |
| 7     | 180       | 480                 | 440               | 0,10              | 16                |
| 8     | 210       | 500                 | 475               | 0,08              | 10                |

Cambios de comportamiento respecto a un "duelo de paletas de libro" (únicos):

- El motor arranca en `createPaletas` y no se reinicia con ninguna tecla: el reinicio lo hace React (`runId`).
- Sin overlay de "GAME OVER" ni de PAUSA en el canvas: los sustituyen el "EN PAUSA" y el modal de `GamePlayer`. Al terminar el motor dibuja un último frame con el HUD, deja de leer teclas y detiene su bucle; `pause` y `resume` no lo reviven.
- No hay tecla de pausa: la pausa la controla `paused` desde React. Con el motor en pausa se descartan las teclas (incluido `Espacio`).
- Sin modo de dos jugadores: la paleta de la derecha es siempre la CPU.
- `input` limpia las teclas en `blur` y hace `preventDefault` en `↑`, `↓` y `Espacio` fuera de `input`/`textarea`. `W` y `S` se ignoran con foco en `input`/`textarea` (para escribir las iniciales en el modal).
- `dt` en segundos con tope de 0,05 s: el acumulador nunca supera 0,05 s, es decir, como mucho 6 pasos de simulación por frame; `resume` reinicia la marca de tiempo y conserva el acumulador.
- Entidades y funciones reciben `ctx` e `input` por parámetro; el estado vive en el cierre de `createPaletas`.

Convenciones:

- Coordenadas de canvas en píxeles de 800×600, origen arriba a la izquierda.
- Callbacks solo cuando el valor cambia; `onLives(3)` y `onLevel(1)` se emiten al iniciar y `onScore` no (empieza en 0).
- Textos de la UI en español.
- El canvas se escala por CSS (4:3, sin `devicePixelRatio`), igual que Asteroids, Arkanoid y VÍBORA.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y efectos con `useEffect`, y repasar `CLAUDE.md` y las specs 05, 06, 07, 09 y 10. Prueba manual: ninguna.
2. Crear `supabase/migrations/YYYYMMDDHHMMSS_paletas.sql` (fila `paletas` en `games` y política `scores_insert_real_games` ampliada) y aplicarla con `mcp__supabase__apply_migration`; comprobar con `list_migrations` que el nombre del archivo coincide con la versión remota. Añadir `paletas` a `REAL_GAME_IDS` en `app/actions/scores.ts`. Comprobar si `generate_typescript_types` produce diferencias en `app/lib/supabase/database.types.ts` y regenerar si las hay. Prueba manual: `execute_sql` muestra la fila en `games_with_stats` con `plays = 0`; `get_advisors` (security) sin avisos nuevos; `/biblioteca` muestra la tarjeta y `/juegos/paletas` carga el detalle (con la cover sin estilo hasta el paso 10); `npx tsc --noEmit` sin errores.
3. Crear `app/games/paletas/constants.ts` e `input.ts` (con `consumeSmash` y `consumeStart`). Prueba manual: `npx tsc --noEmit`.
4. Crear `app/games/paletas/levels.ts` con la tabla de 8 niveles y `levelFor(clock)`. Prueba manual: `npx tsc --noEmit`; la tabla tiene 8 entradas y `levelFor(240) = 1`, `levelFor(210) = 2`, `levelFor(30) = 8`, `levelFor(0) = 8`.
5. Crear `app/games/paletas/physics.ts` (paso de simulación, rebote, colisión con paleta y ángulo, remate, tanto, `predictLandingY`) y `cpu.ts` (IA con predicción, error y aturdimiento). Prueba manual: `npx tsc --noEmit`.
6. Crear `app/games/paletas/engine.ts` con `createPaletas`: acumulador de paso fijo, fases, reloj, rachas, vidas, `draw`, bucle, `pause`, `resume`, `destroy` y los cuatro callbacks. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
7. Crear `app/components/paletas-canvas.tsx` copiando `asteroids-canvas.tsx` (`<canvas>` de 800×600, efecto de motor con `[runId]`, efecto de pausa con `[paused, runId]`, callbacks en `ref`). Prueba manual: `npx tsc --noEmit` y `npm run lint`.
8. Añadir la entrada `paletas` a `app/games/registry.ts`. Prueba manual: `/juegos/paletas/jugar` muestra el juego real con la barra Jugador, Puntuación, Vidas y Nivel; `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen igual.
9. Cover `.cover-paletas` (con `/frontend-design`) en `app/globals.css` y regla `.crt-screen > .paletas-canvas` (o extender la de los otros canvas) con `width: 100%; height: auto`. Prueba manual: a 1280 px y a 375 px el canvas se ve completo, sin deformarse ni scroll horizontal; la tarjeta de `/biblioteca` muestra la cover.
10. Recorrido completo con Playwright MCP (capturas en `.playwright-screenshots/`): espera inicial con el reloj parado, saque, control, remate acertado y fallado, recarga, rebotes, ángulo, aceleración, rachas y multiplicador, bonus de `+50`, pérdida de vidas, reloj y subida de nivel cada 30 s, la CPU con predicción en el nivel 8, fin por vidas, fin por reloj (con el bonus de vidas; si no es alcanzable en Playwright, se revisa a mano), pausa con la ventana de remate abierta, FIN, guardado en Supabase, leaderboard en `/juegos/paletas` y `/salon`, reinicio y salida. Corregir lo que falle.
11. Añadir la fila del juego a `references/implemented-games.md`. Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración, `list_migrations` muestra su versión igual al nombre del archivo y `games` tiene la fila `paletas` (`DUELO DE PALETAS`, `VERSUS`, `cover-paletas`, `yellow`, `sort_order = 4`). `database.types.ts` está actualizado.
- [ ] Con la clave publicable, un `insert` en `scores` con `game_id = 'paletas'` se acepta; con un `game_id` que no está en la lista se rechaza; un `update` y un `delete` se rechazan. `get_advisors` (security) no reporta avisos nuevos.
- [ ] `saveScore` con `gameId = 'paletas'` inserta la fila; con un id fuera de `REAL_GAME_IDS` devuelve el error genérico y no inserta.
- [ ] `/biblioteca` muestra la tarjeta DUELO DE PALETAS (VERSUS, cover propia) y `/juegos/paletas` carga su detalle con el leaderboard vacío antes de la primera partida.
- [ ] `/juegos/paletas/jugar` muestra un `<canvas>` de 800×600 con las dos paletas centradas, la bola quieta en el centro, `Puntos: 0`, `Nivel: 1`, `Vidas: 3`, `Racha ×0`, el reloj en `04:00`, la barra de remate llena y el mensaje "PULSA W/S O ↑/↓ PARA EMPEZAR", sin errores en consola.
- [ ] Antes de la primera tecla la bola no se mueve y el reloj no corre, ni siquiera tras varios segundos; `W`, `S`, `↑` o `↓` quitan el mensaje y empiezan la cuenta de saque de 0,8 s.
- [ ] `W`/`↑` sube la paleta y `S`/`↓` la baja a 480 px/s; pulsar ambas la detiene; la paleta no sale del canvas.
- [ ] La velocidad de la simulación es la misma a 60 Hz y a 144 Hz (paso fijo): una misma jugada recorre la misma distancia por segundo de reloj.
- [ ] El primer saque va hacia la CPU con ángulo dentro de ±25°; tras cada tanto la bola vuelve al centro, espera 0,8 s y sale hacia quien encajó el tanto.
- [ ] La bola rebota en los bordes superior e inferior sin atascarse y en las paletas con un ángulo que depende del punto de contacto (centro = horizontal, extremos = ±60°); nunca atraviesa una paleta, ni siquiera a 900 px/s ni tras un frame largo.
- [ ] Cada golpe de paleta acelera la bola 24 px/s hasta un máximo de 900 px/s.
- [ ] La cara trasera de una paleta no golpea la bola.
- [ ] `Espacio` abre una ventana de 0,12 s (la paleta se ve blanca) y arranca una recarga de 1 s; la barra de remate se vacía y vuelve a llenarse; pulsar `Espacio` durante la recarga no hace nada; mantenerlo pulsado no repite el remate.
- [ ] Un golpe con la ventana abierta multiplica la velocidad por 1,35 (con tope de 900 px/s) y deja a la CPU sin recalcular objetivo 0,25 s; un golpe fuera de la ventana es un golpe normal.
- [ ] Un tanto del jugador suma `100 × min(racha, 5)` puntos, más 50 si la bola cruza la línea de la CPU con `smashed = true`; un tanto de la CPU resta una vida, pone la racha a 0 y no resta puntos.
- [ ] La racha sube con cada tanto seguido, el multiplicador no pasa de ×5 y `Racha ×N` del HUD coincide.
- [ ] Las vidas empiezan en 3 y bajan 1 por cada tanto de la CPU; con 0 vidas se abre el modal "FIN DEL JUEGO" con el puntaje correcto, una sola vez.
- [ ] El reloj baja de `04:00` a `00:00` solo con la bola en saque o en juego, no en la espera inicial ni en pausa; a `00:00` se suma `200 × vidas restantes` y se abre el modal con el puntaje correcto.
- [ ] El nivel sube a 2 a los 30 s de partida (reloj en `03:30`), a 3 a los 60 s y llega a 8 a los 210 s (reloj en `00:30`); no pasa de 8; `onLevel` se emite en cada cambio y la CPU cambia de parámetros según la tabla.
- [ ] La CPU del nivel 8 anticipa rebotes en las paredes (cubre la bola que llega tras un rebote) y la del nivel 1 falla visiblemente más; la CPU no se mueve más rápido que `cpuSpeed` de su nivel.
- [ ] Cuando la bola se aleja de la CPU, su paleta vuelve hacia el centro.
- [ ] La barra de la plataforma muestra Jugador, Puntuación, Vidas y Nivel con los mismos valores que el HUD del canvas y se actualiza al cambiar.
- [ ] Las flechas y `Espacio` no hacen scroll en la página.
- [ ] `P` y `Escape` no pausan; `Espacio` solo remata; no hay overlay de pausa ni de fin dentro del canvas.
- [ ] PAUSA congela la bola, las paletas, el reloj, la ventana de remate y la recarga; las teclas se descartan en pausa y REANUDAR continúa sin salto ni paso doble.
- [ ] FIN abre el modal "FIN DEL JUEGO" con el puntaje actual y el juego queda congelado con el último frame dibujado; escribir las iniciales (incluidas `W`, `S`, `Espacio` y las flechas) no mueve la paleta, no remata ni hace scroll.
- [ ] Guardar con iniciales `abc` inserta en `scores` una fila con `game_id = 'paletas'`, `name = 'ABC'` y el puntaje correcto; aparece en el top 10 de `/juegos/paletas` y en la pestaña DUELO DE PALETAS de `/salon`, y `best` y `plays` la reflejan.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia: puntaje 0, nivel 1, 3 vidas, racha 0, reloj en `04:00`, remate listo y esperando la primera tecla.
- [ ] Salir de la ruta no deja `requestAnimationFrame` ni listeners (teclado y `blur`); en Strict Mode hay un solo motor y un `Espacio` remata una sola vez.
- [ ] Asteroids, Tetris, Arkanoid y VÍBORA siguen funcionando y guardando igual que antes.
- [ ] A 1280 px y 375 px el canvas se ve completo, sin deformarse y sin scroll horizontal; sin errores de consola ni de hidratación.
- [ ] `references/implemented-games.md` tiene la fila `paletas` con su spec.

## Decisions

- **Sí:** misma forma que Asteroids (`createXxx(canvas, callbacks)`, `runId`, `paused`, callbacks en `ref`, motor sin React). Decidida en la spec 05.
- **Sí:** guardado con `saveScore` y RLS por lista de ids. Decidido en la spec 06; esta spec amplía la política `scores_insert_real_games` a `paletas`.
- **Sí (Propuesta a revisar):** entrada nueva `paletas` con `sort_order = 4`, categoría `VERSUS` y color `yellow` (datos de la sugerencia de `game-planner`). **No:** otro color.
- **Sí (Propuesta a revisar):** título visible DUELO DE PALETAS, id `paletas`. **No:** el nombre del clásico ni "PONG": marca de un juego comercial.
- **Sí (Propuesta a revisar):** paso fijo de 1/120 s con acumulador. **No:** `dt` continuo con subpasos (es la apuesta de la variante A): el paso fijo hace el juego determinista y evita túneles sin subdividir.
- **Sí (Propuesta a revisar):** 3 vidas con `hud: { lives: true, level: true }`. **No:** vidas ocultas: la barra de la plataforma ya sabe pintarlas y la condición "CPU marca N tantos" queda como "pierdes 3 vidas" (N = 3).
- **Sí (Propuesta a revisar):** nivel por **tiempo** (cada 30 s), no por tantos. **No:** nivel por tantos: haría que el reloj y el nivel se contradijeran y premiaría perder tiempo.
- **Sí (Propuesta a revisar):** reloj de 4 minutos que solo corre con la bola en saque o en juego. **No:** reloj continuo (la espera inicial y las pausas consumirían partida) ni partida sin límite (la puntuación no tendría tope).
- **Sí (Propuesta a revisar):** remate con `Espacio` (ventana de 0,12 s, recarga de 1 s, ×1,35 de velocidad). **No:** remate mantenido o cargado (más difícil de explicar y de comprobar) ni más teclas.
- **Sí (Propuesta a revisar):** puntos por racha (`100 × min(racha, 5)`) más `+50` por remate no tocado, y bonus de `200` por vida restante si se agota el reloj. **No:** bonus por rally (es la apuesta de la variante A) ni puntos por golpe.
- **Sí (Propuesta a revisar):** IA con predicción de rebotes, retraso y error decrecientes. **No:** IA que sigue la bola sin predecir: en niveles altos fallaría por la geometría, no por reflejos, y quitaría sentido a rematar.
- **Sí (Propuesta a revisar):** la partida espera a la primera tecla de movimiento y muestra un mensaje en el canvas. **No:** arrancar sola.
- **Sí (Propuesta a revisar):** saque hacia quien encajó el último tanto. **No:** saque siempre al jugador ni aleatorio.
- **Sí (Propuesta a revisar):** el fin por reloj y el fin por vidas abren el mismo modal. Mismo criterio que las specs 09 y 10.
- **Sí:** dibujar todo con primitivas del canvas y sin sonido. No hay assets en `references/source-assets/` para este juego.
- **Sí:** conservar el HUD dibujado en el canvas además de la barra de la plataforma, como Asteroids, Arkanoid y VÍBORA.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para la cover y el ajuste del marco CRT.

## Risks

| Riesgo                                                                              | Mitigación                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Muchos pasos de simulación tras una pestaña en segundo plano (espiral de la muerte) | El acumulador se limita a 0,05 s (6 pasos); lo que sobra se descarta, y `resume` reinicia la marca de tiempo.                                                                       |
| Sin interpolación el movimiento se ve con saltos en monitores de 144 Hz             | A 120 Hz de simulación es imperceptible; si molesta, se añade interpolación en otra spec.                                                                                           |
| La ventana de remate de 0,12 s (≈ 14 pasos) es difícil de acertar o demasiado fácil | `SMASH_WINDOW` y `SMASH_COOLDOWN` son constantes y propuestas; el paso 10 las prueba a mano y se ajustan.                                                                           |
| La CPU con predicción es imbatible en niveles 6 a 8                                 | El error de ±22 a ±10 px, la reacción de 0,12 a 0,08 s y el aturdimiento tras un remate dejan hueco; si no basta, se sube `cpuError`. El remate con ×1,35 supera `cpuSpeed` máximo. |
| El jugador espera al reloj sin arriesgar (partidas lentas)                          | Es válido: el reloj termina la partida y el bonus por vida premia ese estilo con 200 por vida, menos que 1 tanto con racha ×3.                                                      |
| `Espacio` escrita en las iniciales del modal remata o hace scroll                   | El motor está en pausa con el modal abierto, `setActive(false)` descarta las teclas, `preventDefault` solo actúa fuera de `input`/`textarea`.                                       |
| `Espacio` con un botón de la plataforma enfocado lo activa (por ejemplo PAUSA)      | Se comprueba en el paso 10; si ocurre, el wrapper devuelve el foco al contenedor del canvas o `input` ignora `Space` con el foco en un `button`, sin tocar `GamePlayer`.            |
| `onScore` con el bonus final antes de `onGameOver` llega tarde al modal             | El motor llama a `onScore` y luego a `onGameOver` en el mismo tick; el modal usa el puntaje de la barra, que ya está actualizado. El criterio de reloj lo comprueba.                |
| Strict Mode monta el motor dos veces                                                | `destroy` cancela el rAF y hace `detach`; el efecto depende solo de `runId`. Se comprueba con un único remate por pulsación.                                                        |
| El título DUELO DE PALETAS (16 caracteres) desborda en la tarjeta o la cover        | Comprobarlo en el paso 9 a 1280 px y 375 px; si desborda, se acorta el texto de la cover o se ajusta el CSS.                                                                        |
| El nombre de la migración no coincide con la versión remota                         | Comprobar con `list_migrations` tras `apply_migration` y renombrar el archivo.                                                                                                      |
| Olvidar `REAL_GAME_IDS`, la política RLS o el registro                              | El criterio de guardado falla o `/juegos/paletas/jugar` da 404; la migración y `REAL_GAME_IDS` van en el paso 2 y el registro en el 8.                                              |
| Los puntajes superan 10 000 000                                                     | No aplica: la cota teórica es 80 900 y el valor realista, de unos pocos miles.                                                                                                      |
| Escalar el canvas por CSS lo ve algo borroso (no hay `devicePixelRatio`)            | Se acepta, como en Asteroids, Arkanoid y VÍBORA; si molesta, se aborda en otra spec.                                                                                                |

## What is **not** in this spec

- Sonido o música, controles táctiles, gamepad o teclas de pausa propias.
- Dos jugadores, elección de dificultad, obstáculos, potenciadores o varias bolas.
- Interpolación gráfica entre pasos de simulación.
- Un modal distinto para el fin por reloj.
- Auth, `user_id`, antitrampas o rate limiting.
- Cambios en `leaderboard.tsx`, `hall-board.tsx`, `/salon`, `app/lib/games.ts` o `game-player.tsx`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
