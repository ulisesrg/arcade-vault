# SPEC 10 — Víbora: cuarto juego real con leaderboard

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-11-21
> **Objective:** Diseñar un Snake como motor TypeScript con canvas, jugable en `/juegos/snake/jugar` dentro de `GamePlayer` (añadiendo una entrada al registro de motores), con los sprites de fruta de `references/source-assets/snake-assets/` y con su puntuación guardada en Supabase y visible en el leaderboard de `/juegos/snake` y en `/salon`.

## Por qué existe este spec

Es el primer juego real **sin código de referencia**. `references/source-assets/snake-assets/` solo trae dos archivos:

- `fruits.png`: una hoja de 3790×442 px (586 KB), fondo transparente, con tres filas de la misma fruta en tres estilos (vector plano, pixel-art y fotorrealista).
- `sprites.js`: un atlas `window.SPRITE_ATLAS` con 22 recortes `{ x, y, w, h }` de la fila central (pixel-art, `y = 136`, alto 160, anchos de 110 a 170 px) y la ruta relativa `snake-assets/fruits.png`.

No hay `game.js`, `index.html` ni sonidos, así que las reglas, el HUD y el aspecto de la víbora se diseñan aquí a partir de las reglas del Snake clásico y de lo que confirmó el usuario. Del atlas solo se aprovechan las coordenadas: `window.SPRITE_ATLAS` es un global y su ruta es relativa, justo lo que las specs 05 y 09 sacan de los motores. Además, **los nombres del atlas no coinciden con lo que se ve** (el recorte `banana` en `x = 34` es una manzana roja, `orange` en `x = 186` es un plátano, y así los demás), por lo que esta spec trata los 22 recortes como una lista de índices y no usa los nombres.

Entra como **entrada nueva** `snake` en `games` (`sort_order = 3`): tras la spec 08 no quedan simuladores que sustituir y el catálogo tiene `asteroids`, `tetris` y `arkanoid`. El título visible es propio (VÍBORA), igual que APILADOR y ROMPEBLOQUES.

Es el **cuarto juego real**: el registro de motores (`app/games/registry.ts`) ya existe, así que aquí solo se añade la entrada. Encaja en la forma de la spec 05 con un canvas de 800×600 y los callbacks `onScore`, `onLevel` y `onGameOver`; como Tetris, no tiene vidas (`onLives` llega al componente pero el motor nunca lo llama). Lo nuevo respecto a los otros tres es el movimiento **por pasos sobre una cuadrícula** (no por `dt` continuo), que la partida **espera a la primera flecha** y que carga un único spritesheet para la fruta.

## Scope

**In:**

- Entrada nueva `snake` en `games` (VÍBORA, `ARCADE`, `cover-snake`, `green`, `sort_order = 3`) mediante la migración `supabase/migrations/YYYYMMDDHHMMSS_snake.sql` (la versión real la fija `apply_migration`), que también amplía la política de insert de `scores` a `snake`.
- `snake` en `REAL_GAME_IDS` de `app/actions/scores.ts`, y `database.types.ts` comprobado tras la migración (regenerado si cambia).
- Motor en `app/games/snake/`, diseñado desde cero en TypeScript estricto, sin globales y sin acceso a `document`.
- API del motor: `createSnake(canvas, callbacks)` que devuelve `{ pause, resume, destroy }`, con `onScore`, `onLevel` y `onGameOver`.
- Asset copiado de la referencia a `public/games/snake/fruits.png` (solo el PNG; `sprites.js` no se copia). El motor lo carga por URL (`/games/snake/fruits.png`) y usa los 22 recortes de la fila central.
- Tablero de 20×15 casillas de 40 px (canvas 800×600), movimiento por pasos de una casilla.
- Control con las flechas ↑ ↓ ← →, con cola de hasta 2 giros y sin marcha atrás.
- Componente cliente `app/components/snake-canvas.tsx` con un `<canvas>` de 800×600, copia de `asteroids-canvas.tsx` (`runId`, `paused`, callbacks en `ref`).
- Entrada `snake` en `app/games/registry.ts` con `hud: { lives: false, level: true }`. `GamePlayer` no cambia: ya consulta el registro.
- Barra de la plataforma (Jugador, Puntuación, Nivel) alimentada por los callbacks del motor.
- HUD en el canvas (`Puntos:` y `Nivel:`) y mensaje de inicio "PULSA UNA FLECHA PARA EMPEZAR" mientras la partida espera.
- Victoria (la víbora llena las 300 casillas) y derrota (choque con pared o cuerpo) disparan `onGameOver` una sola vez y abren el mismo modal "FIN DEL JUEGO".
- PAUSA, FIN, modal "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" con `saveScore` y "JUGAR DE NUEVO" con `runId`, como los otros juegos reales.
- Clase `.cover-snake` en `app/globals.css` y escalado del canvas en el marco CRT (extender la regla `.crt-screen > .asteroids-canvas, .crt-screen > .arkanoid-canvas` al canvas de este juego).
- Actualizar `CLAUDE.md`.

**Out of scope (para futuros specs):**

- Sonido y música: la referencia no trae audio.
- Controles táctiles o gamepad, y teclas alternativas (WASD) o de pausa (`P`, `Escape`, Espacio): solo flechas y el botón PAUSA.
- Modo con paredes que se atraviesan, obstáculos, frutas especiales, varios tableros o elección de dificultad.
- Las filas vector y fotorrealista de `fruits.png`, recortar o reempaquetar la hoja, y corregir los nombres del atlas (el original queda intacto en `references/`).
- Sprites para la cabeza o el cuerpo de la víbora: se dibujan con primitivas.
- Resolución adaptativa o `devicePixelRatio`: el canvas es de 800×600 fijos.
- Distinguir la victoria de la derrota en el modal: es el mismo.
- Auth, `user_id`, antitrampas y rate limiting (ver spec 06).
- Cambios en `app/lib/games.ts`, `leaderboard.tsx`, `hall-board.tsx`, `/salon` y `game-player.tsx`: el juego aparece por tener fila en `games` y entrada en el registro.
- Tests automatizados (no hay runner configurado).

## Data model

Catálogo (migración; se muestra el esquema, no el SQL completo). Los textos son una propuesta a revisar:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_snake.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('snake', 'VÍBORA',
   'Come fruta, crece y no choques contigo misma.',
   'Guía a la víbora con las flechas por un tablero de 20×15. Cada fruta que come la hace crecer una casilla y suma 10 puntos; cada 5 frutas subes de nivel y ella se mueve más rápido. Si choca con una pared o con su propio cuerpo, se acaba la partida.',
   'ARCADE', 'cover-snake', 'green', 3);

drop policy "scores_insert_real_games" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris', 'arkanoid', 'snake'));
```

API del motor:

```ts
// app/games/snake/engine.ts
export interface SnakeCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación (al comer)
  onLevel: (level: number) => void; // al subir de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez: choque o tablero lleno
}

export interface SnakeHandle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo
  destroy: () => void; // cancela el rAF, quita los listeners y descarta la carga del sprite
}

export function createSnake(
  canvas: HTMLCanvasElement, // 800×600
  callbacks: SnakeCallbacks,
): SnakeHandle;
```

Props del componente (cumple `RealCanvasProps` del registro):

```ts
// app/components/snake-canvas.tsx  ("use client")
interface SnakeCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  onScore: (n: number) => void;
  onLives: (n: number) => void; // se recibe por el registro y nunca se llama
  onLevel: (n: number) => void;
  onGameOver: () => void;
}
// <canvas className="snake-canvas" width={800} height={600} aria-label="Juego Víbora" />
```

Registro de motores (solo se añade la entrada):

```ts
// app/games/registry.ts
snake: { Canvas: SnakeCanvas, hud: { lives: false, level: true } },
```

Estado del motor (privado, dentro del cierre de `createSnake`):

```ts
type Dir = "up" | "down" | "left" | "right";
interface Cell {
  col: number;
  row: number;
} // origen arriba a la izquierda, col 0..19, row 0..14

// body[0] es la cabeza; body[body.length - 1], la cola
// pendingTurns: giros ya aceptados y aún sin aplicar (máx. 2)
// fruit: { cell: Cell; sprite: number } con sprite = índice 0..21 en FRUITS
// started: false hasta la primera flecha válida
// eaten: frutas comidas (score = eaten × 10; level = 1 + floor(eaten / 5))
```

Módulos del motor (todos en `app/games/snake/`):

| Archivo        | Contenido                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | `CANVAS_W = 800`, `CANVAS_H = 600`, `CELL = 40`, `COLS = 20`, `ROWS = 15`, `INITIAL_LENGTH = 3`, posición y dirección iniciales, `POINTS_PER_FRUIT = 10`, `FRUITS_PER_LEVEL = 5`, `BASE_STEPS_PER_SECOND = 8`, `MAX_STEPS_PER_SECOND = 16`, `MAX_QUEUED_TURNS = 2`, `MAX_DT = 0.05`, `FRUITS_URL = "/games/snake/fruits.png"` y la paleta de colores del tablero y la víbora |
| `input.ts`     | `createInput()` con `attach()`/`detach()`, cola de giros (`drain()` devuelve las flechas pulsadas desde la última lectura, por `code`), `setActive(false)` que descarta y bloquea la cola, `preventDefault` en las cuatro flechas fuera de `input`/`textarea` y limpieza en `blur`                                                                                           |
| `sprites.ts`   | `FRUITS`: lista de 22 recortes `{ x, y, w, h }` (mismas coordenadas que el atlas, sin nombres), `loadFruits(url)` que devuelve una promesa con la `HTMLImageElement`, y `drawFruit(ctx, img, index, cell)` que escala el recorte a `min(40 / w, 40 / h)` y lo centra en la casilla                                                                                           |
| `snake.ts`     | lógica pura sin `ctx`: estado inicial, aceptar un giro (`canTurn`), avanzar un paso (`step`: mover, comer, crecer, detectar choque o victoria) y elegir una casilla libre para la fruta                                                                                                                                                                                      |
| `engine.ts`    | estado, acumulador de tiempo, `draw`, bucle con `requestAnimationFrame` y `createSnake`                                                                                                                                                                                                                                                                                      |

Reglas de juego (diseñadas aquí; las confirmó el usuario salvo donde se indica):

| Regla                     | Valor                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas                    | 800×600, tablero de 20 columnas × 15 filas de 40 px, fondo oscuro con cuadrícula tenue pintados en cada frame                                                                                                                                              |
| Inicio                    | longitud 3, cabeza en la casilla (10, 7) y cuerpo en (9, 7) y (8, 7), mirando a la derecha; la víbora **no se mueve y el tiempo no corre** hasta la primera flecha válida                                                                                  |
| Primera flecha            | ↑, ↓ y → arrancan la partida (y fijan la dirección); ← se ignora porque sería marcha atrás                                                                                                                                                                 |
| Movimiento                | un paso = una casilla en la dirección actual; el motor acumula `dt` y da un paso cada `1 / pasosPorSegundo` segundos (sin interpolación entre casillas)                                                                                                    |
| Giros                     | las flechas se aceptan en cola (máx. 2 pendientes) y se aplica una por paso; se ignora una flecha igual a la dirección de la última posición de la cola y la contraria (giro de 180°); con la cola llena, la flecha se descarta                            |
| Fruta                     | siempre hay una en el tablero, en una casilla libre elegida al azar, con uno de los 22 sprites al azar; al comerla aparece otra (nueva casilla y nuevo sprite)                                                                                             |
| Comer                     | la cabeza entra en la casilla de la fruta: la víbora crece 1 casilla (la cola no avanza ese paso), `+10` puntos                                                                                                                                            |
| Nivel                     | `1 + floor(frutas / 5)`; sin tope en el número de nivel                                                                                                                                                                                                    |
| Velocidad                 | `min(8 + (nivel − 1), 16)` pasos por segundo: 8 en el nivel 1 (125 ms por paso) y 16 desde el nivel 9 (62,5 ms)                                                                                                                                            |
| Derrota                   | la cabeza sale del tablero (pared) o entra en una casilla de su propio cuerpo                                                                                                                                                                              |
| Cola que se libera        | moverse a la casilla que ocupa la cola **no** es choque cuando ese paso no come, porque la cola se libera en ese mismo paso; si el paso come, sí es choque (decisión de diseño: es la regla habitual del género y no estaba en las respuestas del usuario) |
| Victoria                  | al comer, la víbora ocupa las 300 casillas: no hay sitio para otra fruta y termina la partida (`onGameOver`)                                                                                                                                               |
| Fin de partida            | derrota o victoria; en ambas se dibuja un último frame y el bucle se detiene                                                                                                                                                                               |
| Orden de dibujo           | fondo y cuadrícula, fruta, cuerpo, cabeza, HUD, mensaje de inicio (solo si no ha empezado)                                                                                                                                                                 |
| Víbora                    | primitivas del canvas, sin sprites: segmentos redondeados en verde neón, cabeza más clara con dos ojos orientados según la dirección                                                                                                                       |
| HUD del canvas            | texto `bold 18px monospace`: `Puntos: N` arriba a la izquierda y `Nivel: N` arriba a la derecha, dibujado encima de la víbora y la fruta con contorno oscuro para que se lea                                                                               |
| Mensaje de inicio         | "PULSA UNA FLECHA PARA EMPEZAR" centrado, visible solo hasta la primera flecha válida                                                                                                                                                                      |
| Puntuación máxima posible | 297 frutas (300 casillas − 3 iniciales) × 10 = 2 970, muy por debajo del `check` de 10 000 000                                                                                                                                                             |

Cambios de comportamiento respecto a un Snake "de libro" (únicos):

- El motor arranca en `createSnake` y no se reinicia con ninguna tecla: el reinicio lo hace React (`runId`).
- Sin overlay de "GAME OVER" ni de PAUSA en el canvas: los sustituyen el "EN PAUSA" y el modal de `GamePlayer`. En derrota o victoria el motor dibuja un último frame con el HUD, deja de leer teclas y detiene su bucle; `pause` y `resume` no lo reviven.
- No hay tecla de pausa: la pausa la controla `paused` desde React. Con el motor en pausa se descartan las flechas.
- El bucle empieza cuando termina la carga del sprite, y también si la carga falla (en ese caso la fruta se dibuja como un círculo de color y la partida es jugable).
- `input` limpia las teclas en `blur` y hace `preventDefault` en las cuatro flechas fuera de `input`/`textarea`.
- `dt` en segundos con tope de 0,05 s (menor que el paso más corto, 62,5 ms, así que un frame largo da como mucho un paso); `resume` reinicia la marca de tiempo y conserva el acumulador.
- Entidades y funciones reciben `ctx` e `input` por parámetro; el estado vive en el cierre de `createSnake`.

Convenciones:

- Coordenadas de casilla con origen arriba a la izquierda; coordenadas de canvas en píxeles de 800×600.
- Callbacks solo cuando el valor cambia; `onLevel(1)` se emite al iniciar y `onScore` no (empieza en 0). `onLives` no se emite nunca.
- Textos de la UI en español.
- El canvas se escala por CSS (4:3, sin `devicePixelRatio`), igual que Asteroids y Arkanoid.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components, efectos con `useEffect` y archivos estáticos de `public/`, y repasar `CLAUDE.md` y las specs 05, 06, 07 y 09. Prueba manual: ninguna.
2. Crear `supabase/migrations/YYYYMMDDHHMMSS_snake.sql` (fila `snake` en `games` y política `scores_insert_real_games` ampliada) y aplicarla con `mcp__supabase__apply_migration`; comprobar con `list_migrations` que el nombre del archivo coincide con la versión remota. Añadir `snake` a `REAL_GAME_IDS` en `app/actions/scores.ts`. Comprobar si `generate_typescript_types` produce diferencias en `app/lib/supabase/database.types.ts` y regenerar si las hay. Prueba manual: `execute_sql` muestra la fila en `games_with_stats` con `plays = 0`; `get_advisors` (security) sin avisos nuevos; `/biblioteca` muestra la tarjeta y `/juegos/snake` carga el detalle (con la cover sin estilo hasta el paso 10); `npx tsc --noEmit` sin errores.
3. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`. Prueba manual: con el servidor de desarrollo, `/games/snake/fruits.png` responde 200.
4. Crear `app/games/snake/constants.ts` e `input.ts`. Prueba manual: `npx tsc --noEmit`.
5. Crear `app/games/snake/sprites.ts` con los 22 recortes del atlas, `loadFruits` y `drawFruit`. Prueba manual: `npx tsc --noEmit`; la lista tiene 22 entradas.
6. Crear `app/games/snake/snake.ts` con la lógica pura (estado inicial, giros, paso, fruta libre). Prueba manual: `npx tsc --noEmit`.
7. Crear `app/games/snake/engine.ts` con `createSnake`: acumulador de tiempo, `draw`, bucle, `pause`, `resume`, `destroy` y los tres callbacks. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
8. Crear `app/components/snake-canvas.tsx` copiando `asteroids-canvas.tsx` (`<canvas>` de 800×600, efecto de motor con `[runId]`, efecto de pausa con `[paused, runId]`, callbacks en `ref`; `onLives` se recibe y no se usa). Prueba manual: `npx tsc --noEmit` y `npm run lint`.
9. Añadir la entrada `snake` a `app/games/registry.ts`. Prueba manual: `/juegos/snake/jugar` muestra el juego real con la barra Jugador, Puntuación y Nivel (sin Vidas); `/juegos/asteroids/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen igual.
10. Cover `.cover-snake` (con `/frontend-design`) en `app/globals.css` y regla `.crt-screen > .snake-canvas` (o extender la de `.asteroids-canvas` y `.arkanoid-canvas`) con `width: 100%; height: auto`. Prueba manual: a 1280 px y a 375 px el canvas se ve completo, sin deformarse ni scroll horizontal; la tarjeta de `/biblioteca` muestra la cover.
11. Recorrido completo con Playwright MCP (capturas en `.playwright-screenshots/`): comprobar visualmente que los 22 recortes muestran frutas completas y sin cortes (jugando o forzando varias frutas), espera inicial, giros, comer, crecimiento, nivel y velocidad, choque con pared y con el cuerpo, victoria (si es alcanzable con un script de teclas, si no, lo cubre la lógica del paso 6 revisada a mano), pausa, FIN, guardado en Supabase, leaderboard en `/juegos/snake` y `/salon`, reinicio y salida. Corregir lo que falle.
12. Actualizar `CLAUDE.md` (motor, entrada del registro, política RLS, `REAL_GAME_IDS`, `sort_order` siguiente = 4 y asset). Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración, `list_migrations` muestra su versión igual al nombre del archivo y `games` tiene la fila `snake` (`VÍBORA`, `ARCADE`, `cover-snake`, `green`, `sort_order = 3`). `database.types.ts` está actualizado.
- [ ] Con la clave publicable, un `insert` en `scores` con `game_id = 'snake'` se acepta; con un `game_id` que no está en la lista se rechaza; un `update` y un `delete` se rechazan. `get_advisors` (security) no reporta avisos nuevos.
- [ ] `saveScore` con `gameId = 'snake'` inserta la fila; con un id fuera de `REAL_GAME_IDS` devuelve el error genérico y no inserta.
- [ ] `/biblioteca` muestra la tarjeta VÍBORA (ARCADE, cover propia) y `/juegos/snake` carga su detalle con el leaderboard vacío antes de la primera partida.
- [ ] `public/games/snake/fruits.png` existe y `/games/snake/fruits.png` responde 200.
- [ ] `/juegos/snake/jugar` muestra un `<canvas>` de 800×600 con el tablero de 20×15, una víbora de 3 casillas en el centro mirando a la derecha, una fruta con sprite en una casilla libre, `Puntos: 0`, `Nivel: 1` y el mensaje "PULSA UNA FLECHA PARA EMPEZAR", sin errores en consola.
- [ ] Antes de la primera flecha la víbora no se mueve, ni siquiera tras varios segundos; ← no la arranca; ↑, ↓ o → la arrancan y el mensaje desaparece.
- [ ] La víbora avanza una casilla por paso a 8 pasos por segundo en el nivel 1 (una casilla cada ~125 ms) y las flechas cambian su dirección.
- [ ] Una flecha contraria a la dirección actual no la gira (no hay marcha atrás), y dos giros pulsados casi a la vez se aplican en pasos consecutivos sin perder ninguno ni permitir un giro de 180°.
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la víbora 1 casilla y coloca otra fruta en una casilla libre (nunca sobre el cuerpo) con un sprite al azar.
- [ ] Los 22 sprites se ven completos, sin cortes y sin deformarse, dentro de la casilla de 40 px.
- [ ] El nivel sube a 2 al comer la 5.ª fruta (`Nivel: 2`, 9 pasos por segundo), a 3 con la 10.ª, y la velocidad no pasa de 16 pasos por segundo desde el nivel 9.
- [ ] Salir por cualquier borde abre el modal "FIN DEL JUEGO" con el puntaje correcto; chocar con el propio cuerpo también.
- [ ] Moverse a la casilla de la cola cuando ese paso no come no termina la partida; hacerlo comiendo sí.
- [ ] Llenar las 300 casillas abre el modal "FIN DEL JUEGO" con el puntaje correcto (máximo 2 970) y no aparece otra fruta (verificable con un script de teclas en Playwright o, si no es alcanzable, revisando la lógica de `snake.ts`).
- [ ] La barra de la plataforma muestra Jugador, Puntuación y Nivel (sin Vidas) con los mismos valores que el HUD del canvas y se actualiza al cambiar.
- [ ] Las flechas no hacen scroll en la página.
- [ ] `P`, `Escape` y Espacio no pausan; no hay overlay de pausa ni de fin dentro del canvas.
- [ ] PAUSA congela la víbora y el contador de pasos, las flechas se descartan en pausa y REANUDAR continúa sin salto ni paso doble.
- [ ] FIN abre el modal "FIN DEL JUEGO" con el puntaje actual y el juego queda congelado con el último frame dibujado; escribir las iniciales (incluidas las flechas) no mueve la víbora ni hace scroll.
- [ ] Guardar con iniciales `abc` inserta en `scores` una fila con `game_id = 'snake'`, `name = 'ABC'` y el puntaje correcto; aparece en el top 10 de `/juegos/snake` y en la pestaña VÍBORA de `/salon`, y `best` y `plays` la reflejan.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia: puntaje 0, nivel 1, víbora de 3 casillas quieta esperando la primera flecha y velocidad de 8 pasos por segundo.
- [ ] Salir de la ruta no deja `requestAnimationFrame` ni listeners (teclado y `blur`); en Strict Mode hay un solo motor y una pulsación gira la víbora una sola vez.
- [ ] Si `fruits.png` no carga (por ejemplo, bloqueando la petición), la partida arranca y la fruta se ve como un círculo de color.
- [ ] Asteroids, Tetris y Arkanoid siguen funcionando y guardando igual que antes.
- [ ] A 1280 px y 375 px el canvas se ve completo, sin deformarse y sin scroll horizontal; sin errores de consola ni de hidratación.
- [ ] `CLAUDE.md` documenta el motor, el asset, la entrada del registro, la política RLS y `REAL_GAME_IDS`.

## Decisions

- **Sí:** misma forma que Asteroids (`createXxx(canvas, callbacks)`, `runId`, `paused`, callbacks en `ref`, motor sin React). Decidida en la spec 05.
- **Sí:** guardado con `saveScore` y RLS por lista de ids. Decidido en la spec 06; esta spec amplía la política `scores_insert_real_games` a `snake`.
- **Sí:** entrada nueva `snake` con `sort_order = 3`. Los simuladores ya no existen (spec 08), así que no hay nada que sustituir.
- **Sí:** id `snake`, cover `cover-snake`, título visible VÍBORA, `ARCADE` y `green`. Decisión del usuario; mismo criterio que `tetris`/APILADOR. **No:** id `vibora` ni título SERPIENTE.
- **Sí:** el juego se diseña desde cero con las reglas del Snake clásico (decisión del usuario: "seguir las reglas del juego popular"). Lo que no estaba en el prompt lo cerró el usuario en las preguntas; la regla de la cola que se libera es la única decisión de diseño añadida aquí (queda anotada en la tabla).
- **Sí:** las paredes matan. **No:** atravesar el borde; es el modo clásico y limita la duración de las partidas.
- **Sí:** tablero de 20×15 casillas de 40 px (canvas 800×600, 4:3). **No:** 30×22 ni 16×12: los sprites de fruta se ven bien a 40 px y 300 casillas dan una victoria alcanzable.
- **Sí:** movimiento por pasos con acumulador de tiempo. **No:** movimiento fluido por píxel ni interpolación: es el modelo del género y evita giros a media casilla.
- **Sí:** nivel `1 + floor(frutas / 5)` con velocidad `min(8 + nivel − 1, 16)` pasos por segundo, y `hud: { lives: false, level: true }`. **No:** velocidad constante (la casilla Nivel quedaría fija en 01) ni acelerar sin mostrar Nivel (obligaría a tocar `GamePlayer`).
- **Sí:** `+10` por fruta, fruta al azar entre los 22 sprites. **No:** `+10 × nivel` (puntuación no lineal) ni una fruta fija (desaprovecha el asset).
- **Sí:** la partida espera a la primera flecha y muestra "PULSA UNA FLECHA PARA EMPEZAR". **No:** arrancar sola (se pierde sin haber tocado nada). El mensaje es un elemento nuevo del canvas, a diferencia de los overlays de fin y pausa, que se eliminan.
- **Sí:** cola de hasta 2 giros y sin giro de 180°. Sin cola, dos flechas rápidas en el mismo paso se perderían o permitirían morderse al girar hacia atrás.
- **Sí:** solo flechas; la pausa es el botón PAUSA de `GamePlayer`. Mismo criterio que Arkanoid: dos fuentes de pausa dejarían a React y al motor fuera de sincronía.
- **Sí:** copiar `fruits.png` entero (586 KB) a `public/games/snake/` y usar la fila central pixel-art con los recortes del atlas. **No:** recortar la hoja (cambia el asset) ni usar las otras filas (hay que medirlas de nuevo y chocan con el estilo neón de la plataforma).
- **Sí:** tratar los 22 recortes como índices y no copiar `sprites.js`. Los nombres del atlas están desfasados respecto a las imágenes y el archivo depende de `window`.
- **Sí:** dibujar la víbora con primitivas del canvas (verde neón), sin sprites. La referencia no trae arte de cuerpo.
- **Sí:** sin sonido. La referencia no trae audio; si se quiere, va en otra spec.
- **Sí:** conservar el HUD dibujado en el canvas además de la barra de la plataforma, como Asteroids y Arkanoid. Se dibuja sobre el tablero (la fila superior también es jugable), con contorno oscuro.
- **Sí:** victoria y derrota disparan el mismo `onGameOver` y abren el mismo modal. Mismo criterio que la spec 09.
- **Sí:** el bucle arranca al terminar la carga del sprite, y también si falla, con la fruta como círculo. **No:** dejar el juego sin arrancar si el PNG no carga, como hace Arkanoid con su spritesheet: aquí el sprite es solo decoración de la fruta.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para la cover y el ajuste del marco CRT.

## Risks

| Riesgo                                                                                          | Mitigación                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los sprites vienen de un sitio de terceros (según `sprites.js`, de un juego de Snake de Google) | Es un asset de la referencia del curso y no se modifica; el título, la cover y el arte de la víbora son propios. Revisar la licencia (o sustituir las frutas) antes de publicar el sitio. |
| Los nombres del atlas no coinciden con los dibujos                                              | La spec usa índices. El paso 11 comprueba a ojo que cada recorte muestra una fruta completa; si alguno corta el sprite, se corrige la coordenada en `sprites.ts` y se anota.              |
| Recortes con márgenes transparentes distintos hacen que la fruta se vea descentrada             | `drawFruit` centra el recorte completo en la casilla; si se nota, se ajusta en el paso 11 sin cambiar el asset.                                                                           |
| Reducir el pixel-art de ~110×160 a ~27×40 px lo deja borroso                                    | Se acepta el suavizado por defecto del canvas (es una reducción grande); si molesta, se prueba `imageSmoothingEnabled = false` en `drawFruit`.                                            |
| El HUD del canvas tapa una fruta o parte de la víbora en la fila superior                       | Se dibuja con contorno oscuro y solo en las esquinas; la barra de la plataforma repite los mismos datos. Si molesta, se reserva una franja o se elimina el HUD del canvas en otra spec.   |
| Strict Mode monta el motor dos veces                                                            | `destroy` cancela el rAF, hace `detach` y descarta la carga del sprite; el efecto depende solo de `runId`. Se comprueba en desarrollo con una pulsación = un giro.                        |
| El sprite carga después de `destroy` y arranca un bucle huérfano                                | El motor comprueba `destroyed` al resolver o fallar la carga y no arranca; se verifica con un cambio rápido de ruta.                                                                      |
| Dos giros rápidos producen un giro de 180° aparente (↑ y luego ← cuando va a la derecha)        | La validación se hace contra la última dirección de la cola, no contra la dirección actual; el criterio de giros lo comprueba.                                                            |
| Teclas llegan al motor con el modal abierto                                                     | El motor está en pausa mientras el modal está abierto, `setActive(false)` descarta la cola y `input` ignora los eventos con foco en `input`/`textarea`.                                   |
| La fruta se coloca sobre la víbora cuando queda poco sitio                                      | Se elige entre las casillas libres (no se reintenta al azar sobre todo el tablero); con 0 libres es victoria.                                                                             |
| El nombre de la migración no coincide con la versión remota                                     | Comprobar con `list_migrations` tras `apply_migration` y renombrar el archivo.                                                                                                            |
| Olvidar `REAL_GAME_IDS`, la política RLS o el registro                                          | El criterio de guardado falla o `/juegos/snake/jugar` da 404; la migración y `REAL_GAME_IDS` van en el paso 2 y el registro en el 9.                                                      |
| Los puntajes superan 10 000 000                                                                 | No aplica: el máximo posible es 2 970.                                                                                                                                                    |
| Escalar el canvas por CSS lo ve algo borroso (no hay `devicePixelRatio`)                        | Se acepta, como en Asteroids y Arkanoid; si molesta, se aborda en otra spec.                                                                                                              |
| El id `snake` expone en la URL el nombre del género en inglés                                   | Decisión del usuario (igual que `tetris` y `arkanoid`); el título visible es en español. Se puede cambiar el id en otra spec.                                                             |

## What is **not** in this spec

- Sonido o música, controles táctiles, gamepad, WASD o teclas de pausa.
- Atravesar paredes, obstáculos, frutas especiales, varios tableros o dificultad elegible.
- Las otras dos filas de `fruits.png`, reempaquetar la hoja o corregir los nombres del atlas.
- Un modal distinto para la victoria.
- Auth, `user_id`, antitrampas o rate limiting.
- Cambios en `leaderboard.tsx`, `hall-board.tsx`, `/salon`, `app/lib/games.ts` o `game-player.tsx`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
