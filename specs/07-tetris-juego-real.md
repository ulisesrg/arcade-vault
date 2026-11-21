# SPEC 07 — Tetris: segundo juego real con leaderboard

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-21
> **Objective:** Portar `references/started-games/03-tetris/` como motor TypeScript con dos canvas, jugable en `/juegos/tetris/jugar` dentro de `GamePlayer` (ahora con un registro de motores), con su puntuación guardada en Supabase y visible en el leaderboard de `/juegos/tetris` y en `/salon`.

## Por qué existe este spec

La referencia `03-tetris` son 332 líneas de `game.js` global, más `index.html` y `style.css`, sin carpeta `assets/` (todo se dibuja con primitivas de canvas). Para Next.js tiene los mismos problemas que tenía Asteroids, y alguno más:

- Lee `document.getElementById` para el tablero (`#board`), la vista previa (`#next-canvas`) y el HUD (`#score`, `#lines`, `#level`).
- Registra un `keydown` en `document` que nunca se quita.
- Arranca solo con `init()` y se reinicia con un botón HTML.
- Tiene un overlay HTML para PAUSA y GAME OVER, con la pausa en la tecla `P`.
- Lee el color de la cuadrícula con `getComputedStyle(document.body)` y tiene un tema claro/oscuro guardado en `localStorage["tetris-theme"]`.

Este es el **segundo juego real**, así que aquí llega el registro de motores que anunció la spec 05: `GamePlayer` deja de bifurcar por `game.id === "asteroids"` y consulta `app/games/registry.ts`.

Entra como **entrada nueva** `tetris` en `games`, no sustituye a `caida`. `caida` (PUZZLE, `cover-tetro`) es un simulador del mismo concepto y queda como deuda conocida, igual que `rocas`.

El juego no tiene vidas, dibuja la siguiente pieza en un segundo canvas y su pantalla es el tablero más un panel lateral en HTML (SCORE, LINES, LEVEL, NEXT y CONTROLS). Se conserva esa pantalla tal cual, con las mismas medidas y estilos que `index.html` y `style.css`. Por eso este spec cambia tres cosas de la forma de la spec 05:

- La firma del motor recibe dos canvas (tablero y NEXT) y emite también `onLines`.
- El componente de React dibuja el panel lateral además de los canvas.
- La barra de la plataforma oculta la casilla Vidas para este juego.

## Scope

**In:**

- Entrada nueva `tetris` en `games` mediante la migración `supabase/migrations/20261121HHMMSS_tetris.sql` (la versión real la fija `apply_migration`), que también amplía la política de insert de `scores` a `tetris`.
- `tetris` en `REAL_GAME_IDS` de `app/actions/scores.ts`, y `database.types.ts` comprobado tras la migración (regenerado si cambia).
- Motor en `app/games/tetris/`, portado de `game.js` a TypeScript estricto, sin globales y sin acceso a `document`.
- API del motor: `createTetris(board, next, callbacks)` con dos canvas (tablero de 300×600 y NEXT de 120×120, como la referencia), que devuelve `{ pause, resume, destroy }`.
- Componente cliente `app/components/tetris-canvas.tsx` con la pantalla del original: tablero, panel lateral de 160 px con PUNTUACIÓN, LÍNEAS y NIVEL (HTML, alimentados por los callbacks), el canvas NEXT y la lista de CONTROLES (HTML con `<kbd>`), separados 20 px. El grupo mide 482×602 px a escala 1 y se escala de forma uniforme al marco CRT.
- Estilos del tablero y del panel (`.tetris-*` en `app/globals.css`) con los mismos valores del `style.css` de la referencia: fondo, borde, radio, sombra, tipografías, tamaños y colores.
- Registro de motores `app/games/registry.ts` con Asteroids y Tetris. `GamePlayer` lo usa en vez de comparar `game.id`, y los simuladores no cambian.
- Barra de la plataforma con Jugador, Puntuación y Nivel para Tetris (la casilla Vidas se oculta). Asteroids sigue mostrando Vidas y Nivel.
- PAUSA, FIN, modal "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" con `saveScore` y "JUGAR DE NUEVO" con `runId`, como Asteroids.
- Clase `.cover-tetris` en `app/globals.css` y el escalado del grupo de 482×602 dentro del marco CRT de 4:3, centrado y sin deformarse.
- Actualizar `CLAUDE.md`.

**Out of scope (para futuros specs):**

- Sonido y música (la referencia no trae ninguno).
- Controles táctiles o gamepad.
- Tema claro/oscuro: se elimina el botón y se fija la paleta oscura de la referencia.
- El título "TETRIS" de la página original (`h1`): la página del juego ya tiene su propia cabecera.
- Cambios de reglas o dificultad: bolsa de 7 piezas, hold, T-spin, retardo de bloqueo, tabla de niveles distinta o rediseño visual del tablero.
- La tecla `P` como pausa: la pausa es solo el botón PAUSA.
- Tocar `caida`: queda como simulador duplicado, deuda conocida igual que `rocas`.
- Mostrar Líneas en la barra de la plataforma (se ven solo en el panel lateral, como en el original).
- Auth, `user_id`, antitrampas y rate limiting (ver spec 06).
- Cambios en `app/lib/games.ts`, `leaderboard.tsx`, `hall-board.tsx` o `/salon`: el juego aparece por tener fila en `games`.
- Tests automatizados (no hay runner configurado).

## Data model

Catálogo (migración; se muestra el esquema, no el SQL completo). Los textos son una propuesta a revisar. El título es propio (no el nombre comercial) aunque el `id` sea `tetris`, por decisión del usuario:

```sql
-- supabase/migrations/20261121HHMMSS_tetris.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('tetris', 'APILADOR',
   'Apila las piezas y limpia líneas antes de llegar al techo.',
   'Piezas de cuatro bloques caen sobre un tablero de 10 × 20. Muévelas, rótalas y déjalas caer para completar filas y borrarlas. Cada 10 líneas sube el nivel y la caída se acelera.',
   'PUZZLE', 'cover-tetris', 'yellow', 9);

drop policy "scores_insert_asteroids" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris'));
```

API del motor:

```ts
// app/games/tetris/engine.ts
export interface TetrisCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación
  onLines: (lines: number) => void; // al borrar líneas
  onLevel: (level: number) => void; // al subir de nivel (y al iniciar, con 1)
  onGameOver: () => void; // una sola vez, cuando la pieza nueva colisiona al aparecer
}
// No hay onLives: el juego no tiene vidas.

export interface TetrisHandle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo y vacía la cola de teclas
  destroy: () => void; // cancela el rAF y quita los listeners
}

export function createTetris(
  board: HTMLCanvasElement, // 300×600: tablero, fantasma y pieza actual
  next: HTMLCanvasElement, // 120×120: vista previa de la siguiente pieza
  callbacks: TetrisCallbacks,
): TetrisHandle;
```

Registro de motores (nuevo):

```ts
// app/games/registry.ts
export interface RealCanvasProps {
  runId: number;
  paused: boolean;
  onScore: (n: number) => void;
  onLives: (n: number) => void; // los juegos sin vidas lo reciben y nunca lo invocan
  onLevel: (n: number) => void;
  onGameOver: () => void;
}

export interface RealGameEntry {
  Canvas: ComponentType<RealCanvasProps>;
  hud: { lives: boolean; level: boolean }; // casillas que muestra la barra
}

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { Canvas: AsteroidsCanvas, hud: { lives: true, level: true } },
  tetris: { Canvas: TetrisCanvas, hud: { lives: false, level: true } },
};
```

`GamePlayer`: `isReal` pasa a ser `game.id in REAL_GAMES`. Renderiza `REAL_GAMES[game.id].Canvas` con los mismos props y oculta la casilla Vidas cuando `hud.lives` es `false`. El resto del flujo (pausa, FIN, `handleSave`, `runId`) no cambia. Un juego del registro guarda por `saveScore` (Server Action); los demás siguen con `localStorage["av_scores"]`.

Props del componente (cumple `RealCanvasProps`; `onLives` se acepta y se ignora):

```ts
// app/components/tetris-canvas.tsx  ("use client")
// Estructura (misma que index.html, sin el h1 ni el botón de tema):
//   .tetris-stage            ← mide el marco CRT y aplica la escala uniforme
//     .tetris-group          ← 482×602 px a escala 1, flex con gap 20 px
//       <canvas .tetris-board  width=300 height=600>   (borde 1 px → 302×602)
//       <aside .tetris-panel>                          (160 px)
//         PUNTUACIÓN · LÍNEAS · NIVEL    (valores en estado local de React)
//         SIGUIENTE → <canvas .tetris-next width=120 height=120>
//         CONTROLES → ← → mover · ↑ rotar · ↓ bajar · Espacio caída
// Efectos: motor con dependencia [runId] y pausa con [paused, runId], como asteroids-canvas.tsx.
// El estado local (score, lines, level) se reinicia con runId y se alimenta de los callbacks;
// además se reenvían a onScore y onLevel de las props para la barra de la plataforma.
```

Escala: `.tetris-stage` ocupa el marco CRT (`position: absolute; inset: 0`) y el grupo se centra y se escala con `transform: scale(k)`, donde `k = min(ancho del marco / 482, alto del marco / 602)`. Un `ResizeObserver` recalcula `k`; se mide en el primer efecto y el grupo no se muestra hasta entonces. Así los canvas, las tipografías y los espacios se escalan juntos y el panel conserva las proporciones del original.

Módulos del motor (todos en `app/games/tetris/`):

| Archivo        | Contenido                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `BOARD_W = 300`, `BOARD_H = 600`, `NEXT_SIZE = 120`, `COLORS` (índices 1–7), `GRID_COLOR = "#22222e"`, `PIECES` (7 matrices), `LINE_SCORES`, constantes de velocidad, `KICKS` y `MAX_DT_MS = 50` |
| `input.ts`     | `createInput()`: cola de `keydown` (con repeticiones) y `drain()`, `attach()` / `detach()`, `setActive()`, `clear()`, `preventDefault` en teclas del juego y limpieza en `blur`                                                          |
| `pieces.ts`    | tipo `Piece` (`type`, `shape`, `x`, `y`), `randomPiece()`, `rotateCW(shape)`                                                                                                                                                             |
| `board.ts`     | `createBoard()`, `collide(board, shape, ox, oy)`, `merge(board, piece)`, `clearLines(board)`, `ghostY(board, piece)`, `tryRotate(board, piece)`                                                                                          |
| `render.ts`    | `drawBlock(ctx, x, y, colorIndex, size, alpha)`, `drawGrid(ctx)`, `drawBoard(ctx, board, piece, ghostY)` y `drawNext(ctx, next)`; todas reciben el contexto por parámetro y limpian con `clearRect`, como el original                    |
| `engine.ts`    | estado, `update`, `draw`, bucle con `requestAnimationFrame` y `createTetris`                                                                                                                                                             |

`input.ts`: `drain()` devuelve y vacía los `code` de todos los `keydown` desde la última llamada, incluidas las repeticiones del sistema al mantener una tecla. El motor los aplica en el siguiente `update`. Mientras `setActive(false)` (pausa o game over) no se encola nada. `preventDefault` se hace siempre fuera de `input`/`textarea`, para que la página no haga scroll.

Reglas de juego que se conservan tal cual de `game.js`:

| Regla                  | Valor                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Tablero                | 10 columnas × 20 filas, bloque de 30 px (300×600)                                                                                              |
| Piezas                 | 7 tipos: I, O, T, S, Z, J y L (la N, tuerca, queda desactivada y comentada en `constants.ts`)                                                  |
| Elección de pieza      | uniforme entre los 7 tipos (`Math.random`, 1/7 cada uno), sin bolsa                                                                            |
| Colores                | I `#4dd0e1`, O `#ffd54f`, T `#ba68c8`, S `#81c784`, Z `#e57373`, J `#90caf9`, L `#ffb74d`                                                      |
| Aparición              | `x = floor(10/2) − floor(ancho/2)`, `y = 0`                                                                                                    |
| Fin de partida         | la pieza nueva colisiona al aparecer                                                                                                           |
| Rotación               | horario (transponer + invertir filas); intenta desplazar en x `[0, −1, 1, −2, 2]` y, si ninguno cabe, no gira                                  |
| Mover                  | ← y → una columna si no hay colisión                                                                                                           |
| Soft drop (↓)          | baja una fila y suma 1 punto; si no puede bajar, fija la pieza (sin puntos)                                                                    |
| Hard drop (Espacio)    | baja hasta el fantasma, suma 2 puntos por celda recorrida y fija la pieza                                                                      |
| Rotar (teclas)         | ↑ y `X`                                                                                                                                        |
| Caída automática       | cada `dropInterval` ms baja una fila o fija; al cumplirse el intervalo el acumulador vuelve a 0 (no conserva el resto); sin retardo de bloqueo |
| Acumulador de caída    | soft drop y hard drop no lo reinician                                                                                                          |
| Velocidad inicial      | 1000 ms                                                                                                                                        |
| Líneas                 | se recorren de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía arriba                                                 |
| Puntos por líneas      | `[0, 100, 300, 500, 800][líneas a la vez] × nivel` (el nivel anterior a recalcular)                                                            |
| Nivel                  | `floor(líneas / 10) + 1`                                                                                                                       |
| Velocidad por nivel    | `dropInterval = max(100, 1000 − (nivel − 1) × 90)` ms, recalculado al borrar líneas                                                            |
| Fantasma               | proyección de la pieza actual hacia abajo, dibujada con `globalAlpha = 0.2`                                                                    |
| Dibujo de bloque       | `fillRect(x·s+1, y·s+1, s−2, s−2)` y franja de brillo `rgba(255,255,255,0.12)` de 4 px de alto                                                 |
| Cuadrícula             | líneas de 0,5 px, color `#22222e`, entre celdas (sin borde exterior)                                                                           |
| Vista previa NEXT      | canvas de 120×120; la pieza siguiente a 30 px por bloque, centrada en una cuadrícula de 4×4 (`offX = floor((4 − ancho)/2)`, igual en y)        |
| Fondo de los canvas    | `#1a1a25` por CSS (no se pinta en el canvas), con borde `1px solid #2a2a3a` y radio 4 px                                                       |
| Sombra del tablero     | `box-shadow: 0 0 40px rgba(0, 0, 0, 0.6)`                                                                                                      |
| Medidas de la pantalla | tablero 300×600 (302×602 con el borde) + 20 px de separación + panel de 160 px = 482×602                                                       |
| Panel: secciones       | columna con separación de 20 px, `padding-top: 4px`; cada sección con rótulo y valor separados 6 px                                            |
| Panel: rótulo          | 10 px, `letter-spacing: 2px`, peso 600, `#555570`, fuente del sistema                                                                          |
| Panel: valor           | `Courier New` 26 px, peso 700, `letter-spacing: 1px`, `#7aa2f7`                                                                                |
| Panel: controles       | lista de 12 px, color `#888`, separación 6 px; teclas en `<kbd>` (fondo `#22223a`, borde `1px solid #3a3a5a`, radio 3 px, 11 px, `#aaa`)       |

Cambios de comportamiento respecto al original (únicos):

- El motor no se reinicia solo ni con un botón HTML; el reinicio lo hace React (`runId`).
- Sin overlay de PAUSA ni de GAME OVER en el canvas: los sustituyen el "EN PAUSA" y el modal de `GamePlayer`. En game over el motor dibuja un último frame con el tablero ya fusionado (sin la pieza nueva que colisionó), deja de leer teclas y no sigue el bucle.
- La tecla `P` ya no pausa: la pausa la controla `paused` desde React. Con el motor en pausa se ignora el teclado, como hacía el original.
- Se elimina el tema claro/oscuro y su `localStorage["tetris-theme"]`. Se fija la paleta oscura: `--grid-line` pasa a la constante `GRID_COLOR` del motor (ya no se lee con `getComputedStyle`) y el resto de colores pasan a clases `.tetris-*` con los valores del tema oscuro. No hay variables CSS de tema.
- El panel lateral se conserva como HTML, no como canvas. Sus rótulos pasan a español (`PUNTUACIÓN`, `LÍNEAS`, `NIVEL`, `SIGUIENTE`, `CONTROLES`) y los números se formatean con `es-ES`, como la plataforma. En CONTROLES desaparece la línea `P pausa`, porque `P` ya no pausa; quedan ← → mover, ↑ rotar, ↓ bajar y Espacio caída.
- Se omiten el título `h1` "TETRIS" y el botón de tema del HTML original.
- La pieza N (tuerca, anillo 3×3 de ocho bloques) queda desactivada: su matriz y su color están comentados en `constants.ts` y `randomPiece` elige entre las 7 piezas restantes.
- Todo el grupo (canvas y panel) se escala junto por CSS al marco CRT; a escala 1 mide lo mismo que el original.
- El teclado conserva el comportamiento de `keydown` del original, con la repetición del sistema en todas las teclas (incluidos rotar y Espacio). La diferencia es que las pulsaciones se encolan y se aplican en el siguiente `update`, no dentro del evento.
- Estado en el cierre de `createTetris`; las funciones reciben `board`, `piece` y `ctx` por parámetro.
- `input` limpia la cola en `blur` y hace `preventDefault` en ← → ↑ ↓ y Espacio fuera de `input`/`textarea`.
- `dt` en milisegundos con tope de 50 ms (el original no tiene tope). Los intervalos de caída del original están en ms, así que se conserva esa unidad.

Convenciones:

- Coordenadas con origen arriba a la izquierda, en celdas dentro del tablero y en píxeles al dibujar.
- Callbacks solo cuando el valor cambia; `onLevel(1)` se emite al iniciar y `onScore` y `onLines` no (empiezan en 0).
- Textos de la UI en español.
- El motor solo dibuja en sus dos canvas: no conoce el panel, el fondo ni el borde. Los colores del dibujo están en `constants.ts` y no se leen del DOM ni del CSS.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y efectos con `useEffect`, y repasar `CLAUDE.md` y las specs 05 y 06. Prueba manual: ninguna.
2. Crear `supabase/migrations/20261121HHMMSS_tetris.sql` (fila `tetris` en `games` y política `scores_insert_real_games`) y aplicarla con `mcp__supabase__apply_migration`; comprobar con `list_migrations` que el nombre del archivo coincide con la versión remota. Añadir `tetris` a `REAL_GAME_IDS` en `app/actions/scores.ts`. Comprobar si `generate_typescript_types` produce diferencias en `app/lib/supabase/database.types.ts` (solo cambian datos) y regenerar si las hay. Prueba manual: `execute_sql` muestra la fila en `games_with_stats` con `plays = 0`; `get_advisors` (security) sin avisos nuevos; `/biblioteca` muestra la tarjeta y `/juegos/tetris` carga el detalle (con la cover sin estilo hasta el paso 10); `npx tsc --noEmit` sin errores.
3. Crear `app/games/tetris/constants.ts` e `input.ts`. Prueba manual: `npx tsc --noEmit`.
4. Crear `app/games/tetris/pieces.ts` y `board.ts` (colisión, fusión, limpieza de líneas, fantasma y rotación con kicks). Prueba manual: `npx tsc --noEmit`.
5. Crear `app/games/tetris/render.ts` con `drawBlock`, `drawGrid`, `drawBoard` y `drawNext`. Prueba manual: `npx tsc --noEmit`.
6. Crear `app/games/tetris/engine.ts` con `createTetris`: estado, `update`, `draw`, bucle, `pause`, `resume`, `destroy` y los cuatro callbacks. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
7. Crear `app/components/tetris-canvas.tsx` con la estructura descrita (dos `<canvas>`, panel con PUNTUACIÓN, LÍNEAS, NIVEL, SIGUIENTE y CONTROLES, estado local, efecto de motor con `[runId]`, efecto de pausa con `[paused, runId]`, callbacks en `ref`). Prueba manual: `npx tsc --noEmit` y `npm run lint`.
8. Crear `app/games/registry.ts` solo con la entrada `asteroids` y refactorizar `GamePlayer` para usarlo (`isReal` = id en el registro; casilla Vidas según `hud.lives`), sin cambiar el comportamiento de Asteroids. Prueba manual: `/juegos/asteroids/jugar` funciona igual (juega, pausa, FIN, guarda, reinicia) y `/juegos/caida/jugar` sigue con el simulador.
9. Añadir la entrada `tetris` al registro con `hud: { lives: false, level: true }`. Prueba manual: `/juegos/tetris/jugar` muestra el juego real con la barra Jugador, Puntuación y Nivel, sin la casilla Vidas.
10. Cover `.cover-tetris` (con `/frontend-design`) y estilos `.tetris-*` en `app/globals.css`, transcribiendo los valores del `style.css` de la referencia (tablas "Reglas de juego"). Escalado del grupo de 482×602 al marco CRT con `ResizeObserver`. Prueba manual: a 1280 px y a 375 px se ven el tablero y el panel completos, sin scroll horizontal ni deformación; la tarjeta de `/biblioteca` muestra la cover.
11. Comparar con la referencia: abrir `references/started-games/03-tetris/index.html` y `/juegos/tetris/jugar` con Playwright MCP en el mismo estado (partida recién empezada y con piezas apiladas) y comparar capturas del tablero y del panel (medidas, colores, tipografías y posiciones). Anotar y corregir las diferencias que no estén en "Cambios de comportamiento". Después, recorrido completo (capturas en `.playwright-screenshots/`): reglas, controles, pausa, FIN, game over, guardado en Supabase, leaderboard en `/juegos/tetris` y `/salon`, reinicio y salida. Corregir lo que falle.
12. Actualizar `CLAUDE.md`. Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración, `list_migrations` muestra su versión igual al nombre del archivo y `games` tiene la fila `tetris` (`APILADOR`, `PUZZLE`, `cover-tetris`, `yellow`, `sort_order = 9`). `database.types.ts` está actualizado.
- [ ] Con la clave publicable, un `insert` en `scores` con `game_id = 'tetris'` se acepta; con `game_id = 'caida'` se rechaza; un `update` y un `delete` se rechazan. `get_advisors` (security) no reporta avisos nuevos.
- [ ] `saveScore` con `gameId = 'tetris'` inserta la fila; con `'caida'` devuelve el error genérico y no inserta.
- [ ] `/biblioteca` muestra la tarjeta APILADOR (PUZZLE, cover propia) además de CAÍDA, y `/juegos/tetris` carga su detalle con el leaderboard vacío antes de la primera partida.
- [ ] `/juegos/tetris/jugar` muestra dos `<canvas>` (tablero de 300×600 y NEXT de 120×120), sin errores en consola: tablero vacío con la primera pieza en la fila 0 y, en el panel, `PUNTUACIÓN 0`, `LÍNEAS 0`, `NIVEL 1`, la pieza siguiente y los cuatro controles.
- [ ] Con el grupo a escala 1 (medido con el factor de escala), el tablero mide 302×602 con borde, el panel 160 px, la separación 20 px y el conjunto 482×602, igual que en la referencia.
- [ ] Una captura del tablero y otra del panel de `/juegos/tetris/jugar` coinciden con las de la referencia en el mismo estado en colores, rejilla, fantasma, tipografías y posición de los elementos. Las diferencias se limitan a los textos en español, la ausencia de `P pausa`, el título omitido y los efectos del marco CRT.
- [ ] El panel sigue la partida: PUNTUACIÓN, LÍNEAS y NIVEL cambian con las reglas, SIGUIENTE muestra la pieza que aparecerá y los tres valores se reinician con "JUGAR DE NUEVO".
- [ ] La barra muestra Jugador, Puntuación y Nivel, y no muestra Vidas; en `/juegos/asteroids/jugar` sigue mostrando Vidas.
- [ ] ← y → mueven la pieza una columna y no la sacan del tablero ni la solapan con bloques; mantener la tecla repite el movimiento.
- [ ] ↑ y `X` rotan en sentido horario; pegada a una pared, la pieza rota desplazándose hasta 2 columnas si hace falta, y si no cabe no gira.
- [ ] ↓ baja una fila y suma exactamente 1 punto; con la pieza apoyada la fija y no suma. Espacio la lleva hasta el fantasma, suma 2 puntos por celda y la fija.
- [ ] El fantasma se dibuja con transparencia 0,2 donde aterrizará la pieza actual.
- [ ] Sin pulsar nada, la pieza baja una fila por segundo en el nivel 1 y fija al apoyarse.
- [ ] Completar 1, 2, 3 o 4 filas a la vez suma 100, 300, 500 u 800 puntos × nivel y las elimina desplazando el resto hacia abajo; `LÍNEAS` del panel las cuenta.
- [ ] Al llegar a 10 líneas el nivel pasa a 2 (barra y callback), la caída pasa a 900 ms y se mantiene en 100 ms como mínimo en niveles altos.
- [ ] Aparecen las 7 piezas (I, O, T, S, Z, J y L), sin la tuerca, y el canvas NEXT muestra la siguiente antes de que aparezca.
- [ ] Al pulsar teclas del juego con el foco en la página no hay scroll.
- [ ] PAUSA congela la caída y muestra "EN PAUSA"; las teclas no mueven la pieza; REANUDAR continúa sin salto de caída. La tecla `P` no hace nada.
- [ ] FIN abre el modal "FIN DEL JUEGO" con el puntaje actual y el juego queda congelado.
- [ ] Al apilar hasta que la pieza nueva colisiona se abre el modal con el puntaje correcto, sin overlay de GAME OVER en el canvas, y el tablero se queda dibujado.
- [ ] Con el modal abierto, escribir las iniciales (incluido el Espacio) no mueve ni suelta piezas y no hace scroll.
- [ ] Guardar con iniciales `abc` inserta en `scores` una fila con `game_id = 'tetris'`, `name = 'ABC'` y el puntaje correcto; aparece en el top 10 de `/juegos/tetris` y en la pestaña APILADOR de `/salon`, y `best` y `plays` la reflejan.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia: puntaje 0, nivel 1, 0 líneas, tablero vacío y velocidad de 1000 ms.
- [ ] Salir de la ruta no deja `requestAnimationFrame` ni listeners; en Strict Mode hay un solo motor y una pulsación mueve una sola vez.
- [ ] Asteroids sigue funcionando y guardando igual que antes; `/juegos/caida/jugar` y los demás simuladores siguen con el simulador y guardando solo en `localStorage["av_scores"]`.
- [ ] A 1280 px y 375 px el tablero y el panel se ven completos y escalados juntos como un solo bloque 482×602, centrado en el marco, sin deformarse y sin scroll horizontal; sin errores de consola ni de hidratación.
- [ ] `CLAUDE.md` documenta el motor, el registro, la política RLS y `REAL_GAME_IDS`.

## Decisions

- **Sí:** misma forma que Asteroids (`createXxx(…, callbacks)`, `runId`, `paused`, callbacks en `ref`, motor sin React). Decidida en la spec 05.
- **Sí:** guardado con `saveScore` y RLS por lista de ids. Decidido en la spec 06; esta spec añade `tetris` a la lista con una política renombrada `scores_insert_real_games`, en vez de crear una política por juego.
- **Sí:** entrada nueva `tetris`. Decisión del usuario: no se sustituye `caida`. Queda otro duplicado conceptual, anotado como deuda.
- **Sí:** `id` `tetris` y `cover-tetris`, por decisión del usuario. **No:** usar `TETRIS` como título visible; el catálogo no usa nombres comerciales de juegos existentes, así que el título propuesto es APILADOR. Si se prefiere otro título, solo cambia la migración y el texto de la cover.
- **Sí:** barra de la plataforma sin Vidas ni Líneas (Jugador, Puntuación y Nivel). Decisión del usuario. Las líneas se ven en el panel lateral, igual que en el original.
- **Sí:** pantalla fiel al original: dos canvas (tablero 300×600 y NEXT 120×120) y panel lateral en HTML con PUNTUACIÓN, LÍNEAS, NIVEL, SIGUIENTE y CONTROLES, con las medidas y estilos de `style.css`. Decisión del usuario, que sustituye a la propuesta anterior de un lateral de 180×600 dibujado por el motor. **Cambio de la forma de la spec 05:** `createTetris(board, next, callbacks)` y un `onLines` más.
- **No:** un canvas lateral de 180×600 con NEXT, líneas y controles dibujados por el motor. Se descartó por no ser fiel al original.
- **No:** un solo canvas de 480×600 con el panel dentro. Se eligió el original de dos canvas.
- **Sí:** panel en React con estado local alimentado por los callbacks del motor, que además reenvía puntuación y nivel a la barra de la plataforma. El motor no toca el DOM.
- **Sí:** fondo, borde, radio y sombra por CSS y el motor limpia con `clearRect`, como el original. Así se conserva el aspecto sin pintar el fondo en el canvas.
- **Sí:** escalar todo el grupo con `transform: scale()` según el tamaño del marco, en vez de ajustar cada canvas con `width: 100%`. Mantiene las proporciones del panel y de la tipografía.
- **Sí:** se elimina el tema claro/oscuro y se fija la paleta oscura. Un botón de tema HTML no encaja en la barra de la plataforma y duplicaría la paleta de la web.
- **Sí:** rótulos del panel en español y la línea `P pausa` fuera de CONTROLES. Son los dos únicos cambios de contenido del panel; la regla de la plataforma exige textos en español y `P` ya no pausa.
- **Sí:** `P` deja de pausar y solo cuenta el botón PAUSA. Dos fuentes de pausa dejarían a React y al motor fuera de sincronía.
- **Sí:** repetición de teclas igual que el original (todas las teclas, incluidas rotar y Espacio). Decisión del usuario. Mantener Espacio lanza una pieza tras otra; es el comportamiento de la referencia y queda anotado.
- **Sí:** teclas por cola (`drain()`) en vez de aplicarlas dentro del evento. Mantiene el motor sin acceso al estado desde un listener y permite ignorar el teclado en pausa y game over.
- **Sí:** `dt` en milisegundos con tope de 50 ms. Es un cambio menor frente al original (sin tope); solo afecta tras una pestaña en segundo plano y la regla de la plataforma exige el tope.
- **Sí:** registro de motores `app/games/registry.ts` con Canvas y `hud`. Cumple lo anunciado en la spec 05 ahora que hay un segundo juego real. `isReal` = id en el registro.
- **No:** registro solo de componentes con condicionales por id en `GamePlayer`. Volvería a bifurcar por id.
- **Sí:** `RealCanvasProps` con `onLives` obligatorio y ya ignorado por Tetris. Un contrato único evita un tipo por juego.
- **Sí:** sin assets ni sonido. La referencia no trae `assets/` y lo dibuja todo con primitivas del canvas.
- **No:** la pieza N (tuerca). Decisión del usuario posterior a la implementación: se comenta en el código (no se borra) por si se recupera. Se actualizan la descripción del catálogo (migración `20261121234434_tetris_sin_tuerca.sql`) y la cover, que mostraba la tuerca.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para la cover y el ajuste del marco CRT.

## Risks

| Riesgo                                                                                                     | Mitigación                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta el motor dos veces con dos canvas                                                        | `destroy` cancela el rAF y hace `detach`; el efecto depende solo de `runId`. Se comprueba en desarrollo con una pulsación = un movimiento. |
| El nombre de la migración no coincide con la versión remota                                                | Comprobar con `list_migrations` tras `apply_migration` y renombrar el archivo.                                                             |
| Olvidar `REAL_GAME_IDS` o la política RLS                                                                  | El criterio de guardado falla; ambos van en el mismo paso 2.                                                                               |
| El refactor del registro rompe Asteroids                                                                   | Paso 8 aparte, sin tocar Tetris, con recorrido manual de Asteroids antes de seguir.                                                        |
| Los puntajes superan 10 000 000                                                                            | No aplica en la práctica: exigiría miles de líneas. Si ocurriera, el `check` y `saveScore` rechazan el guardado sin romper la partida.     |
| Las teclas se encolan durante la pausa o el modal y se aplican al reanudar                                 | `setActive(false)` en pausa y game over descarta la cola; `resume` también la vacía.                                                       |
| Mantener una tecla en el modal (repetición del sistema) llega al motor                                     | `input` ignora los eventos con foco en `input`/`textarea`, y el motor está inactivo mientras el modal está abierto.                        |
| El grupo de 482×602 (≈4:5) queda con barras negras laterales en el marco CRT de 4:3 y muy pequeño a 375 px | Es esperado: se centra y no se deforma. Los controles táctiles y una disposición móvil quedan fuera de alcance.                            |
| El escalado con `transform` y `ResizeObserver` parpadea o falla en el primer render                        | El grupo no se muestra hasta medir el marco; se comprueba sin errores de hidratación y con Strict Mode.                                    |
| Las capturas no coinciden con la referencia por los efectos del marco CRT (escaneo, sombra interior)       | Son parte del marco de la plataforma y no se tocan; la comparación del paso 11 las descuenta y anota las demás diferencias.                |
| Escalar los canvas por CSS los ve algo borrosos (no hay `devicePixelRatio`)                                | Se acepta, como en Asteroids; si molesta, se aborda en otro spec.                                                                          |
| El id `tetris` expone en la URL un nombre comercial                                                        | Decisión del usuario; el título visible es propio. Se puede cambiar el id en otro spec si se quiere.                                       |
| El color de la cuadrícula dependía de una variable CSS del original (`--grid-line`)                        | Pasa a la constante `GRID_COLOR`; el motor ya no lee `document` ni `getComputedStyle`.                                                     |
| `caida` (simulador) y `tetris` (real) conviven en la biblioteca con el mismo concepto                      | Deuda conocida y explícita; se resuelve en otro spec, como `rocas`/`asteroids`.                                                            |

## What is **not** in this spec

- Sonido, música, controles táctiles o gamepad.
- Tema claro/oscuro, el título "TETRIS" de la página original y la tecla `P` como pausa.
- Cambios de reglas, dificultad o diseño (bolsa de 7, hold, T-spin, retardo de bloqueo).
- Tocar o eliminar `caida`.
- Mostrar Líneas en la barra de la plataforma.
- Auth, `user_id`, antitrampas o rate limiting.
- Cambios en `leaderboard.tsx`, `hall-board.tsx`, `/salon` o `app/lib/games.ts`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
