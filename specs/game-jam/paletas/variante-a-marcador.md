# SPEC JAM paletas-A — DUELO DE PALETAS: marcador por niveles contra la CPU

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09, SPEC 10
> **Date:** 2026-11-23
> **Objective:** Diseñar un duelo de paletas contra la CPU como motor TypeScript con canvas, jugable en `/juegos/paletas/jugar` dentro de `GamePlayer` (añadiendo una entrada al registro de motores), con dificultad creciente por nivel, puntos por tanto más bonus por rally, y su puntuación guardada en Supabase y visible en el leaderboard de `/juegos/paletas` y en `/salon`.

## Por qué existe este spec

Es el primer juego de la categoría `VERSUS`, que hoy no tiene ningún título, y el primero **sin código ni assets de referencia** desde VÍBORA (spec 10). Todo (reglas, HUD, arte, IA de la CPU) se diseña aquí. El concepto es el género "duelo de paletas": dos paletas verticales, una bola que rebota y una pared de fondo por lado. No se copia ningún nombre, arte ni disposición de un clásico comercial; el título visible es propio (DUELO DE PALETAS) y todo se dibuja con primitivas del canvas.

Esta variante (A) es la **"de marcador"**: movimiento continuo con `dt` (como Asteroids y Arkanoid), partida estructurada en **10 niveles de 3 tantos**, y fin por **acumulación de tantos de la CPU** (5) o por victoria al ganar el nivel 10. Sin vidas: el marcador de la CPU hace de "vidas" y se dibuja en el canvas. La variante B del mismo juego (`variante-b-remate.md`) cambia el modelo de tiempo, la condición de fin y la puntuación.

Entra como **entrada nueva** `paletas` en `games` (`sort_order = 4`): el catálogo ya tiene `asteroids`, `tetris`, `arkanoid` y `snake`. Es el **quinto juego real**: el registro de motores ya existe, así que solo se añade la entrada. Encaja en la forma de la spec 05 con un canvas de 800×600 y los callbacks `onScore`, `onLevel` y `onGameOver`; como Tetris y VÍBORA no tiene vidas (`onLives` llega al componente pero el motor nunca lo llama). Lo nuevo respecto a los demás: hay un **adversario con IA** (la CPU), la partida se organiza en **tantos** (no en vidas ni en tablero) y la colisión bola-paleta modifica el ángulo según el punto de contacto.

## Scope

**In:**

- Entrada nueva `paletas` en `games` (DUELO DE PALETAS, `VERSUS`, `cover-paletas`, `yellow`, `sort_order = 4`) mediante la migración `supabase/migrations/YYYYMMDDHHMMSS_paletas.sql` (la versión real la fija `apply_migration`), que también amplía la política de insert de `scores` a `paletas`.
- `paletas` en `REAL_GAME_IDS` de `app/actions/scores.ts`, y `database.types.ts` comprobado tras la migración (regenerado si cambia).
- Motor en `app/games/paletas/`, diseñado desde cero en TypeScript estricto, sin globales y sin acceso a `document`.
- API del motor: `createPaletas(canvas, callbacks)` que devuelve `{ pause, resume, destroy }`, con `onScore`, `onLevel` y `onGameOver`.
- Canvas de 800×600; paleta del jugador a la izquierda, paleta de la CPU a la derecha, una bola.
- Control con `W`/`S` o `↑`/`↓` (movimiento continuo mientras la tecla está pulsada).
- IA de la CPU con velocidad máxima, tiempo de reacción y error de puntería que dependen del nivel (tabla de 10 niveles).
- Componente cliente `app/components/paletas-canvas.tsx` con un `<canvas>` de 800×600, copia de `asteroids-canvas.tsx` (`runId`, `paused`, callbacks en `ref`).
- Entrada `paletas` en `app/games/registry.ts` con `hud: { lives: false, level: true }`. `GamePlayer` no cambia: ya consulta el registro.
- Barra de la plataforma (Jugador, Puntuación, Nivel) alimentada por los callbacks del motor.
- HUD en el canvas: marcador `TÚ n` / `CPU n/5`, `Puntos:`, `Nivel:` y el mensaje de inicio "PULSA W/S O ↑/↓ PARA EMPEZAR" mientras la partida espera.
- Victoria (ganar los 30 tantos) y derrota (la CPU llega a 5 tantos) disparan `onGameOver` una sola vez y abren el mismo modal "FIN DEL JUEGO".
- PAUSA, FIN, modal "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" con `saveScore` y "JUGAR DE NUEVO" con `runId`, como los otros juegos reales.
- Clase `.cover-paletas` en `app/globals.css` y escalado del canvas en el marco CRT (extender la regla `.crt-screen > .asteroids-canvas, .crt-screen > .arkanoid-canvas, .crt-screen > .snake-canvas` al canvas de este juego).
- Añadir la fila del juego a `references/implemented-games.md` (y tocar `CLAUDE.md` solo si cambia el contrato común de los juegos).

**Out of scope (para futuros specs):**

- Sonido y música (no hay assets de audio).
- Assets externos: no hay `public/games/paletas/`; todo se dibuja con primitivas.
- Controles táctiles o gamepad, y teclas alternativas de pausa (`P`, `Escape`, Espacio): solo W/S, flechas y el botón PAUSA.
- Modo de dos jugadores en el mismo teclado u online, elección de dificultad, obstáculos, potenciadores o varias bolas.
- Predicción de rebotes en la IA (la CPU de esta variante solo sigue la bola con retraso; la predicción es de la variante B).
- Distinguir la victoria de la derrota en el modal: es el mismo.
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
   'Gana el duelo a la CPU antes de que ella marque 5 tantos.',
   'Mueve tu paleta con W/S o las flechas y devuelve la bola. Cada tanto vale 100 puntos por el nivel, más un bonus por rally; cada 3 tantos subes de nivel, la CPU juega mejor y te perdona un tanto. Si la CPU marca 5, se acaba la partida; si ganas el nivel 10, ganas el duelo.',
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
  onScore: (score: number) => void; // al cambiar la puntuación (al marcar el jugador o al ganar)
  onLevel: (level: number) => void; // al subir de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez: la CPU llega a 5 tantos o el jugador gana el nivel 10
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
  onLives: (n: number) => void; // se recibe por el registro y nunca se llama
  onLevel: (n: number) => void;
  onGameOver: () => void;
}
// <canvas className="paletas-canvas" width={800} height={600} aria-label="Juego Duelo de paletas" />
```

Registro de motores (solo se añade la entrada):

```ts
// app/games/registry.ts
paletas: { Canvas: PaletasCanvas, hud: { lives: false, level: true } },
```

Estado del motor (privado, dentro del cierre de `createPaletas`):

```ts
type Phase = "waiting" | "serving" | "playing" | "ended";
// phase: "waiting" hasta la primera tecla de movimiento; "serving" durante la cuenta atrás
//        de saque (bola quieta en el centro); "playing" con la bola en juego; "ended" tras onGameOver
// playerY, cpuY: coordenada Y del centro de cada paleta
// ball: { x, y, vx, vy } en px y px/s; speed = hypot(vx, vy)
// serveTimer: segundos que faltan para soltar la bola
// serveToward: -1 (hacia el jugador) o +1 (hacia la CPU)
// goalsWon: tantos del jugador (0..30); goalsCpu: tantos de la CPU (0..4, baja 1 al subir de nivel)
// returns: devoluciones del jugador en el rally actual
// cpuTarget, cpuTimer: objetivo Y de la CPU y tiempo hasta recalcularlo
// score; level = 1 + floor(goalsWon / 3), máximo 10
```

Módulos del motor (todos en `app/games/paletas/`):

| Archivo        | Contenido                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | `CANVAS_W = 800`, `CANVAS_H = 600`, `PADDLE_W = 14`, `PADDLE_H = 100`, `PLAYER_X = 30`, `CPU_X = 756`, `PLAYER_SPEED = 500`, `BALL_R = 8`, `MAX_BOUNCE_ANGLE = 60°` (en radianes), `HIT_SPEEDUP = 18`, `MAX_BALL_SPEED = 720`, `SERVE_DELAY = 1`, `GOALS_PER_LEVEL = 3`, `MAX_LEVEL = 10`, `CPU_GOALS_TO_LOSE = 5`, puntos y paleta de colores |
| `input.ts`     | `createInput()` con `attach()`/`detach()`, `axis()` que devuelve −1, 0 o +1 según `KeyW`/`ArrowUp` y `KeyS`/`ArrowDown` (por `code`), `consumeStart()` que informa de la primera tecla de movimiento, `setActive(false)` que descarta y bloquea las teclas, `preventDefault` en `↑`/`↓` fuera de `input`/`textarea` y limpieza en `blur`       |
| `levels.ts`    | `LEVELS`: tabla de 10 entradas `{ serveSpeed, cpuSpeed, cpuReaction, cpuError }` y `levelFor(goalsWon)`                                                                                                                                                                                                                                        |
| `physics.ts`   | lógica pura sin `ctx`: avanzar la bola en subpasos de ≤ 8 px, rebote en paredes superior e inferior, colisión con una paleta (ángulo por punto de contacto, aceleración), detección de tanto                                                                                                                                                   |
| `cpu.ts`       | IA de la CPU: recalcular el objetivo cada `cpuReaction` segundos y mover la paleta hacia él a `cpuSpeed` máximo                                                                                                                                                                                                                                |
| `engine.ts`    | estado, fases, `update`, `draw`, bucle con `requestAnimationFrame` y `createPaletas`                                                                                                                                                                                                                                                           |

Reglas de juego (diseñadas aquí; todas son **propuestas a revisar**):

| Regla                     | Valor                                                                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas                    | 800×600, fondo `#05060d` pintado en cada frame, red central de trazos verticales y bordes superior e inferior tenues                                                                                                                                   |
| Paletas                   | rectángulos de 14×100 px; jugador con borde izquierdo en x = 30 y CPU con borde izquierdo en x = 756; el centro Y se limita a [50, 550]; posición inicial: centro (y = 300)                                                                            |
| Bola                      | círculo de radio 8 px, color `yellow` de la plataforma; empieza en (400, 300)                                                                                                                                                                          |
| Inicio                    | la partida **espera** con el mensaje de inicio y el tiempo parado hasta la primera tecla de movimiento (`W`, `S`, `↑` o `↓`); al pulsarla empieza la cuenta de saque                                                                                   |
| Saque                     | la bola queda quieta en el centro `SERVE_DELAY = 1` s (parpadeo cada 0,2 s) y sale con velocidad `serveSpeed` del nivel, ángulo aleatorio en ±20° respecto al eje X, hacia quien **encajó** el último tanto (primer saque: hacia la CPU)               |
| Control del jugador       | `W`/`↑` sube y `S`/`↓` baja a 500 px/s mientras la tecla está pulsada; ambas a la vez = parada; sin inercia                                                                                                                                            |
| Rebote en paredes         | si `y − 8 ≤ 0` o `y + 8 ≥ 600`, `vy` cambia de signo y la bola se recoloca dentro                                                                                                                                                                      |
| Colisión con paleta       | se evalúa en subpasos de ≤ 8 px (evita atravesar a 720 px/s): hay golpe cuando la bola avanza hacia la paleta, su borde delantero cruza la cara frontal y `abs(y − centroPaleta) ≤ 50 + 8`; la cara trasera no golpea                                  |
| Ángulo de salida          | `offset = (y − centroPaleta) / 50` limitado a [−1, 1]; ángulo = `offset × 60°`; la bola sale hacia el otro lado con `vx = ±speed·cos(ángulo)` y `vy = speed·sin(ángulo)`                                                                               |
| Velocidad de la bola      | el saque usa `serveSpeed` del nivel (tabla); cada golpe de paleta (de cualquiera) suma 18 px/s al módulo de la velocidad, con tope de 720 px/s                                                                                                         |
| Tanto                     | si el centro de la bola sale por la izquierda (`x < 0`) marca la CPU; por la derecha (`x > 800`) marca el jugador; tras cada tanto: `returns = 0`, bola al centro y nueva cuenta de saque                                                              |
| Devolución                | cada golpe de la paleta del jugador suma 1 a `returns` en el rally actual                                                                                                                                                                              |
| Puntos por tanto          | al marcar el jugador: `100 × nivel` + bonus de rally `10 × min(returns, 30)`; el nivel es el vigente **antes** de contar ese tanto                                                                                                                     |
| Nivel                     | `1 + floor(tantosGanados / 3)`, máximo 10; al subir de nivel la CPU "perdona" un tanto (`goalsCpu = max(goalsCpu − 1, 0)`)                                                                                                                             |
| Tabla de niveles          | ver tabla siguiente                                                                                                                                                                                                                                    |
| IA de la CPU              | cada `cpuReaction` s fija `cpuTarget = bola.y + error` (`error` aleatorio en ±`cpuError`) si la bola se acerca a la CPU, o `300` si se aleja; la paleta se mueve hacia `cpuTarget` a `cpuSpeed` máximo con una zona muerta de 6 px; no predice rebotes |
| Derrota                   | `goalsCpu` llega a 5: se dibuja un último frame y se llama a `onGameOver`                                                                                                                                                                              |
| Victoria                  | el jugador marca el tanto 30 (cierra el nivel 10): `+1 000` de bonus, se dibuja un último frame y se llama a `onGameOver`                                                                                                                              |
| Orden de dibujo           | fondo y red central, marcador grande, bola, paletas, HUD pequeño, mensaje de inicio (solo si `phase = "waiting"`)                                                                                                                                      |
| Marcador grande           | cifras `bold 48px monospace` tenues: a la izquierda (x = 300) los tantos del jugador; a la derecha (x = 500) `CPU n/5`                                                                                                                                 |
| HUD del canvas            | texto `bold 18px monospace`: `Puntos: N` abajo a la izquierda y `Nivel: N` abajo a la derecha, con contorno oscuro                                                                                                                                     |
| Mensaje de inicio         | "PULSA W/S O ↑/↓ PARA EMPEZAR" centrado, visible solo hasta la primera tecla de movimiento                                                                                                                                                             |
| Duración esperada         | 30 tantos ≈ 7 s por tanto + saques: unos 4 a 6 min de partida completa; una derrota temprana, 1 a 2 min                                                                                                                                                |
| Puntuación máxima posible | tantos: `300 × (1 + 2 + … + 10) = 300 × 55 = 16 500`; bonus de rally: `30 tantos × 300 = 9 000`; victoria: `1 000`; total **26 500**, muy por debajo del `check` de 10 000 000                                                                         |

Tabla de niveles (`LEVELS`, constantes del motor; propuestas a revisar):

| Nivel | `serveSpeed` (px/s) | `cpuSpeed` (px/s) | `cpuReaction` (s) | `cpuError` (± px) |
| ----- | ------------------- | ----------------- | ----------------- | ----------------- |
| 1     | 320                 | 250               | 0,30              | 70                |
| 2     | 344                 | 275               | 0,27              | 64                |
| 3     | 368                 | 300               | 0,25              | 58                |
| 4     | 392                 | 325               | 0,22              | 52                |
| 5     | 416                 | 350               | 0,20              | 46                |
| 6     | 440                 | 375               | 0,17              | 40                |
| 7     | 464                 | 400               | 0,14              | 34                |
| 8     | 488                 | 425               | 0,12              | 28                |
| 9     | 512                 | 450               | 0,09              | 22                |
| 10    | 536                 | 475               | 0,07              | 16                |

Cambios de comportamiento respecto a un "duelo de paletas de libro" (únicos):

- El motor arranca en `createPaletas` y no se reinicia con ninguna tecla: el reinicio lo hace React (`runId`).
- Sin overlay de "GAME OVER" ni de PAUSA en el canvas: los sustituyen el "EN PAUSA" y el modal de `GamePlayer`. En derrota o victoria el motor dibuja un último frame con el HUD, deja de leer teclas y detiene su bucle; `pause` y `resume` no lo reviven.
- No hay tecla de pausa: la pausa la controla `paused` desde React. Con el motor en pausa se descartan las teclas.
- Sin modo de dos jugadores: la paleta de la derecha es siempre la CPU.
- `input` limpia las teclas en `blur` y hace `preventDefault` en `↑`/`↓` fuera de `input`/`textarea`. `W` y `S` no hacen scroll, pero se ignoran igualmente con foco en `input`/`textarea` (para escribir las iniciales en el modal).
- `dt` en segundos con tope de 0,05 s; `resume` reinicia la marca de tiempo. A 720 px/s la bola recorre como mucho 36 px por frame: la física se divide en subpasos de ≤ 8 px.
- Entidades y funciones reciben `ctx` e `input` por parámetro; el estado vive en el cierre de `createPaletas`.

Convenciones:

- Coordenadas de canvas en píxeles de 800×600, origen arriba a la izquierda.
- Callbacks solo cuando el valor cambia; `onLevel(1)` se emite al iniciar y `onScore` no (empieza en 0). `onLives` no se emite nunca.
- Textos de la UI en español.
- El canvas se escala por CSS (4:3, sin `devicePixelRatio`), igual que Asteroids, Arkanoid y VÍBORA.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y efectos con `useEffect`, y repasar `CLAUDE.md` y las specs 05, 06, 07, 09 y 10. Prueba manual: ninguna.
2. Crear `supabase/migrations/YYYYMMDDHHMMSS_paletas.sql` (fila `paletas` en `games` y política `scores_insert_real_games` ampliada) y aplicarla con `mcp__supabase__apply_migration`; comprobar con `list_migrations` que el nombre del archivo coincide con la versión remota. Añadir `paletas` a `REAL_GAME_IDS` en `app/actions/scores.ts`. Comprobar si `generate_typescript_types` produce diferencias en `app/lib/supabase/database.types.ts` y regenerar si las hay. Prueba manual: `execute_sql` muestra la fila en `games_with_stats` con `plays = 0`; `get_advisors` (security) sin avisos nuevos; `/biblioteca` muestra la tarjeta y `/juegos/paletas` carga el detalle (con la cover sin estilo hasta el paso 10); `npx tsc --noEmit` sin errores.
3. Crear `app/games/paletas/constants.ts` e `input.ts`. Prueba manual: `npx tsc --noEmit`.
4. Crear `app/games/paletas/levels.ts` con la tabla de 10 niveles y `levelFor`. Prueba manual: `npx tsc --noEmit`; la tabla tiene 10 entradas y `levelFor(0) = 1`, `levelFor(3) = 2`, `levelFor(29) = 10`.
5. Crear `app/games/paletas/physics.ts` (subpasos, rebote en paredes, colisión con paleta y ángulo, detección de tanto) y `cpu.ts` (IA con retraso y error). Prueba manual: `npx tsc --noEmit`.
6. Crear `app/games/paletas/engine.ts` con `createPaletas`: fases, saque, puntuación, niveles, `draw`, bucle, `pause`, `resume`, `destroy` y los tres callbacks. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
7. Crear `app/components/paletas-canvas.tsx` copiando `asteroids-canvas.tsx` (`<canvas>` de 800×600, efecto de motor con `[runId]`, efecto de pausa con `[paused, runId]`, callbacks en `ref`; `onLives` se recibe y no se usa). Prueba manual: `npx tsc --noEmit` y `npm run lint`.
8. Añadir la entrada `paletas` a `app/games/registry.ts`. Prueba manual: `/juegos/paletas/jugar` muestra el juego real con la barra Jugador, Puntuación y Nivel (sin Vidas); `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen igual.
9. Cover `.cover-paletas` (con `/frontend-design`) en `app/globals.css` y regla `.crt-screen > .paletas-canvas` (o extender la de los otros canvas) con `width: 100%; height: auto`. Prueba manual: a 1280 px y a 375 px el canvas se ve completo, sin deformarse ni scroll horizontal; la tarjeta de `/biblioteca` muestra la cover.
10. Recorrido completo con Playwright MCP (capturas en `.playwright-screenshots/`): espera inicial, saque, control, rebotes en paredes, ángulo según el punto de contacto, aceleración, tantos de ambos lados, rally y bonus, subida de nivel y "perdón" de un tanto de la CPU, diferencia de dificultad entre el nivel 1 y el 10, derrota con 5 tantos, victoria (si es alcanzable con un script de teclas; si no, se revisa a mano la lógica de `levelFor` y de la condición de 30 tantos), pausa, FIN, guardado en Supabase, leaderboard en `/juegos/paletas` y `/salon`, reinicio y salida. Corregir lo que falle.
11. Añadir la fila del juego a `references/implemented-games.md`. Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración, `list_migrations` muestra su versión igual al nombre del archivo y `games` tiene la fila `paletas` (`DUELO DE PALETAS`, `VERSUS`, `cover-paletas`, `yellow`, `sort_order = 4`). `database.types.ts` está actualizado.
- [ ] Con la clave publicable, un `insert` en `scores` con `game_id = 'paletas'` se acepta; con un `game_id` que no está en la lista se rechaza; un `update` y un `delete` se rechazan. `get_advisors` (security) no reporta avisos nuevos.
- [ ] `saveScore` con `gameId = 'paletas'` inserta la fila; con un id fuera de `REAL_GAME_IDS` devuelve el error genérico y no inserta.
- [ ] `/biblioteca` muestra la tarjeta DUELO DE PALETAS (VERSUS, cover propia) y `/juegos/paletas` carga su detalle con el leaderboard vacío antes de la primera partida.
- [ ] `/juegos/paletas/jugar` muestra un `<canvas>` de 800×600 con las dos paletas centradas, la bola quieta en el centro, el marcador `0` / `CPU 0/5`, `Puntos: 0`, `Nivel: 1` y el mensaje "PULSA W/S O ↑/↓ PARA EMPEZAR", sin errores en consola.
- [ ] Antes de la primera tecla la bola no se mueve ni siquiera tras varios segundos; `W`, `S`, `↑` o `↓` quitan el mensaje y empiezan la cuenta de saque de 1 s.
- [ ] `W`/`↑` sube la paleta y `S`/`↓` la baja a 500 px/s; pulsar ambas la detiene; la paleta no sale del canvas.
- [ ] El primer saque va hacia la CPU con ángulo dentro de ±20°; tras cada tanto la bola vuelve al centro, espera 1 s y sale hacia quien encajó el tanto.
- [ ] La bola rebota en los bordes superior e inferior sin atascarse.
- [ ] La bola rebota en las paletas con un ángulo que depende del punto de contacto (centro = horizontal, extremos = ±60°) y nunca atraviesa una paleta, ni siquiera a 720 px/s ni tras un frame largo.
- [ ] Cada golpe de paleta acelera la bola 18 px/s hasta un máximo de 720 px/s.
- [ ] La cara trasera de una paleta no golpea la bola: una bola que ya pasó la línea de la paleta sigue hasta el tanto.
- [ ] Un tanto del jugador suma `100 × nivel + 10 × min(devoluciones, 30)` puntos exactos; un tanto de la CPU no suma ni resta puntos.
- [ ] Las devoluciones se reinician a 0 en cada tanto y solo cuentan golpes de la paleta del jugador.
- [ ] El nivel sube a 2 con el tanto 3, a 3 con el 6 y llega a 10 con el 27; no pasa de 10. Al subir de nivel el marcador de la CPU baja 1 (nunca por debajo de 0).
- [ ] La CPU del nivel 1 falla visiblemente más (reacción 0,30 s, error ±70 px) que la del nivel 10 (reacción 0,07 s, error ±16 px, 475 px/s); la CPU no se mueve más rápido que `cpuSpeed` de su nivel.
- [ ] Cuando la bola se aleja de la CPU, su paleta vuelve hacia el centro.
- [ ] Que la CPU llegue a 5 tantos abre el modal "FIN DEL JUEGO" con el puntaje correcto, una sola vez.
- [ ] Marcar el tanto 30 suma `1 000` de bonus y abre el modal "FIN DEL JUEGO" con el puntaje correcto (máximo 26 500) (verificable con un script de teclas en Playwright o, si no es alcanzable, revisando la lógica de `levels.ts` y de la condición de victoria).
- [ ] La barra de la plataforma muestra Jugador, Puntuación y Nivel (sin Vidas) con los mismos valores que el HUD del canvas y se actualiza al cambiar.
- [ ] Las flechas no hacen scroll en la página.
- [ ] `P`, `Escape` y Espacio no pausan; no hay overlay de pausa ni de fin dentro del canvas.
- [ ] PAUSA congela la bola, las paletas y la cuenta de saque, las teclas se descartan en pausa y REANUDAR continúa sin salto.
- [ ] FIN abre el modal "FIN DEL JUEGO" con el puntaje actual y el juego queda congelado con el último frame dibujado; escribir las iniciales (incluidas `W`, `S` y las flechas) no mueve la paleta ni hace scroll.
- [ ] Guardar con iniciales `abc` inserta en `scores` una fila con `game_id = 'paletas'`, `name = 'ABC'` y el puntaje correcto; aparece en el top 10 de `/juegos/paletas` y en la pestaña DUELO DE PALETAS de `/salon`, y `best` y `plays` la reflejan.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia: puntaje 0, nivel 1, marcador 0/0, paletas centradas y esperando la primera tecla.
- [ ] Salir de la ruta no deja `requestAnimationFrame` ni listeners (teclado y `blur`); en Strict Mode hay un solo motor y la paleta se mueve a una sola velocidad.
- [ ] Asteroids, Tetris, Arkanoid y VÍBORA siguen funcionando y guardando igual que antes.
- [ ] A 1280 px y 375 px el canvas se ve completo, sin deformarse y sin scroll horizontal; sin errores de consola ni de hidratación.
- [ ] `references/implemented-games.md` tiene la fila `paletas` con su spec.

## Decisions

- **Sí:** misma forma que Asteroids (`createXxx(canvas, callbacks)`, `runId`, `paused`, callbacks en `ref`, motor sin React). Decidida en la spec 05.
- **Sí:** guardado con `saveScore` y RLS por lista de ids. Decidido en la spec 06; esta spec amplía la política `scores_insert_real_games` a `paletas`.
- **Sí (Propuesta a revisar):** entrada nueva `paletas` con `sort_order = 4`, categoría `VERSUS` y color `yellow` (datos de la sugerencia de `game-planner`). **No:** otro color: `yellow` ya lo usa APILADOR, pero la sugerencia lo fija y el color no es único por juego.
- **Sí (Propuesta a revisar):** título visible DUELO DE PALETAS, id `paletas`. **No:** el nombre del clásico ni "PONG": marca de un juego comercial.
- **Sí (Propuesta a revisar):** movimiento continuo con `dt` y subpasos de ≤ 8 px para la colisión. **No:** paso fijo (es la apuesta de la variante B).
- **Sí (Propuesta a revisar):** sin vidas y con `hud: { lives: false, level: true }`; el marcador `CPU n/5` del canvas es la "vida" visible. **No:** `onLives` con 5 vidas: cada tanto de la CPU ya aparece en el marcador y se evita una casilla redundante en la barra.
- **Sí (Propuesta a revisar):** fin por 5 tantos de la CPU acumulados (con "perdón" de 1 al subir de nivel) o por victoria al marcar 30 tantos. **No:** partida infinita (la puntuación no tendría tope) ni reiniciar el marcador de la CPU en cada nivel (la derrota casi nunca ocurriría en niveles bajos y sería injusta en los altos).
- **Sí (Propuesta a revisar):** puntos `100 × nivel` por tanto más `10 × min(devoluciones, 30)` de bonus de rally, y `1 000` de bonus por la victoria. **No:** puntos por devolución sueltos (premian alargar el rally sin ganar) ni puntos por tantos de la CPU.
- **Sí (Propuesta a revisar):** IA sin predicción, con retraso y error decrecientes por nivel. **No:** IA perfecta con "fallo programado": se nota artificial; la sensación de justicia mejora con un error visible que se reduce.
- **Sí (Propuesta a revisar):** la partida espera a la primera tecla de movimiento y muestra un mensaje en el canvas. **No:** arrancar sola (se concede un tanto sin haber tocado nada).
- **Sí (Propuesta a revisar):** saque hacia quien encajó el último tanto. **No:** saque siempre al jugador (crea ventaja constante) ni aleatorio (parece injusto).
- **Sí (Propuesta a revisar):** solo W/S y flechas; la pausa es el botón PAUSA de `GamePlayer`. Mismo criterio que Arkanoid y VÍBORA: dos fuentes de pausa dejarían a React y al motor fuera de sincronía.
- **Sí:** dibujar todo con primitivas del canvas y sin sonido. No hay assets en `references/source-assets/` para este juego.
- **Sí:** conservar el HUD dibujado en el canvas además de la barra de la plataforma, como Asteroids, Arkanoid y VÍBORA; victoria y derrota disparan el mismo `onGameOver` y el mismo modal.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para la cover y el ajuste del marco CRT.

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La bola atraviesa una paleta con un frame largo (36 px por frame a 720 px/s frente a 14 px de grosor) | Subpasos de ≤ 8 px con `dt` limitado a 0,05 s; el criterio de colisión lo comprueba con la bola a velocidad máxima.                                                                            |
| La bola queda atrapada dentro de una paleta tras un rebote (doble golpe)                              | Tras el golpe se recoloca el borde de la bola fuera de la cara frontal y solo se golpea si avanza hacia la paleta.                                                                             |
| La CPU es imbatible o trivial en algún nivel (equilibrio mal calibrado)                               | Los valores de `LEVELS` son propuestas; el paso 10 prueba los niveles 1, 5 y 10 y se ajusta `cpuError` y `cpuReaction` antes de dar el juego por bueno.                                        |
| Rallies casi infinitos con la bola al tope de velocidad y la CPU de nivel alto                        | El bonus está limitado a 30 devoluciones (300 puntos), el error de la CPU nunca es 0 y la bola a 720 px/s supera el `cpuSpeed` máximo de 475 px/s en los extremos; el criterio de IA lo cubre. |
| El jugador queda sin tantos que ganar si pierde 5 en nivel 1                                          | Es la condición de fin buscada (primera derrota posible tras 5 tantos); el "perdón" al subir de nivel suaviza el tramo medio.                                                                  |
| Victoria demasiado difícil: 30 tantos con la CPU del nivel 10                                         | Es una propuesta; el criterio de victoria se verifica por lógica si no es alcanzable en Playwright, y la dificultad se ajusta en la tabla de niveles sin tocar el resto.                       |
| `W`/`S` escritas en las iniciales del modal mueven la paleta                                          | El motor está en pausa con el modal abierto, `setActive(false)` descarta las teclas e `input` ignora los eventos con foco en `input`/`textarea`.                                               |
| El título DUELO DE PALETAS (16 caracteres) desborda en la tarjeta o la cover                          | Comprobarlo en el paso 9 a 1280 px y 375 px; si desborda, se acorta el texto de la cover (no el título del catálogo) o se ajusta el CSS.                                                       |
| Strict Mode monta el motor dos veces                                                                  | `destroy` cancela el rAF y hace `detach`; el efecto depende solo de `runId`. Se comprueba en desarrollo con una sola velocidad de paleta.                                                      |
| Teclas llegan al motor con el modal abierto                                                           | Mismo mecanismo: el motor está en pausa y descarta la entrada.                                                                                                                                 |
| El nombre de la migración no coincide con la versión remota                                           | Comprobar con `list_migrations` tras `apply_migration` y renombrar el archivo.                                                                                                                 |
| Olvidar `REAL_GAME_IDS`, la política RLS o el registro                                                | El criterio de guardado falla o `/juegos/paletas/jugar` da 404; la migración y `REAL_GAME_IDS` van en el paso 2 y el registro en el 8.                                                         |
| Los puntajes superan 10 000 000                                                                       | No aplica: el máximo posible es 26 500.                                                                                                                                                        |
| Escalar el canvas por CSS lo ve algo borroso (no hay `devicePixelRatio`)                              | Se acepta, como en Asteroids, Arkanoid y VÍBORA; si molesta, se aborda en otra spec.                                                                                                           |

## What is **not** in this spec

- Sonido o música, controles táctiles, gamepad o teclas de pausa propias.
- Dos jugadores, elección de dificultad, obstáculos, potenciadores o varias bolas.
- IA con predicción de rebotes.
- Un modal distinto para la victoria.
- Auth, `user_id`, antitrampas o rate limiting.
- Cambios en `leaderboard.tsx`, `hall-board.tsx`, `/salon`, `app/lib/games.ts` o `game-player.tsx`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
