# SPEC 09 — Rompebloques: tercer juego real con leaderboard

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Date:** 2026-11-21
> **Objective:** Portar `references/started-games/04-arkanoid/` como motor TypeScript con canvas, jugable en `/juegos/arkanoid/jugar` dentro de `GamePlayer` (añadiendo una entrada al registro de motores), con su puntuación guardada en Supabase y visible en el leaderboard de `/juegos/arkanoid` y en `/salon`.

## Por qué existe este spec

La referencia `04-arkanoid` son 268 líneas de `game.js` global, 50 de `levels.js`, 69 de `spritesheet.js`, un `index.html` mínimo y una carpeta `assets/` con un spritesheet PNG (30 KB) y dos efectos de sonido MP3 (10 KB y 8 KB). Para Next.js tiene los mismos problemas que tenían Asteroids y Tetris, y alguno más:

- Lee `document.getElementById('game')` y crea un canvas auxiliar con `document.createElement('canvas')` para copiar el spritesheet.
- Registra `keydown` y `keyup` en `document` y `click` y `mousemove` en el canvas, y ninguno se quita.
- Arranca solo al terminar de cargar el spritesheet (`loadSpritesheet(cb)`) y no tiene reinicio: tras GAME OVER o victoria el bucle sigue dibujando el overlay.
- Pausa con `P` o `Escape` y dibuja su propio overlay con cinco botones "Saltar al nivel" que responden al clic. `loadLevel(n)` repone todos los bloques sin tocar el puntaje, así que ese selector permitiría farmear puntos antes de guardar.
- Carga el spritesheet y los dos sonidos con rutas relativas (`assets/...`) y reproduce los sonidos con `cloneNode().play()` sin tratar la promesa rechazada (el navegador bloquea el audio hasta que hay un gesto del usuario).
- Usa `dt` sin tope y estado global (`blocks`, `lives`, `score`, `isPaused`...).

Entra como **entrada nueva** `arkanoid` en `games` (`sort_order = 2`): tras la spec 08 ya no quedan simuladores que sustituir (el catálogo solo tiene `asteroids` y `tetris`). El título visible es propio (ROMPEBLOQUES), igual que APILADOR para `tetris`.

Es el **tercer juego real**: el registro de motores (`app/games/registry.ts`) ya existe desde la spec 07, así que aquí solo se añade la entrada. A diferencia de Tetris, este juego encaja en la forma de la spec 05 sin cambios de firma: un solo canvas de 800×600 y los callbacks `onScore`, `onLives`, `onLevel` y `onGameOver`. Lo nuevo respecto a Asteroids es que carga assets (sprites y sonidos), que se mueve también con el ratón y que tiene una victoria (limpiar el nivel 5) además de la derrota.

## Scope

**In:**

- Entrada nueva `arkanoid` en `games` (ROMPEBLOQUES, `ARCADE`, `cover-arkanoid`, `magenta`, `sort_order = 2`) mediante la migración `supabase/migrations/20261121HHMMSS_arkanoid.sql` (la versión real la fija `apply_migration`), que también amplía la política de insert de `scores` a `arkanoid`.
- `arkanoid` en `REAL_GAME_IDS` de `app/actions/scores.ts`, y `database.types.ts` comprobado tras la migración (regenerado si cambia).
- Motor en `app/games/arkanoid/`, portado de `game.js`, `levels.js` y `spritesheet.js` a TypeScript estricto, sin globales y sin acceso a `document`.
- API del motor: `createArkanoid(canvas, callbacks)` que devuelve `{ pause, resume, destroy }`, con `onScore`, `onLives`, `onLevel` y `onGameOver`.
- Assets copiados de la referencia a `public/games/arkanoid/`: `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3`. El motor los carga por URL (`/games/arkanoid/...`).
- Los dos efectos de sonido (rebote y rotura de bloque) se conservan, sin botón de silencio ni volumen.
- Control con ← → y con el ratón (`mousemove` sobre el canvas, con la escala CSS).
- Componente cliente `app/components/arkanoid-canvas.tsx` con un `<canvas>` de 800×600, copia de `asteroids-canvas.tsx` (`runId`, `paused`, callbacks en `ref`).
- Entrada `arkanoid` en `app/games/registry.ts` con `hud: { lives: true, level: true }`. `GamePlayer` no cambia: ya consulta el registro.
- Barra de la plataforma (Jugador, Puntuación, Vidas, Nivel) alimentada por los callbacks del motor.
- HUD del canvas conservado (puntos, nivel y una bola por vida), con el rótulo "Score" traducido.
- Victoria (limpiar el nivel 5) y derrota (0 vidas) disparan `onGameOver` una sola vez y abren el mismo modal "FIN DEL JUEGO".
- PAUSA, FIN, modal "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" con `saveScore` y "JUGAR DE NUEVO" con `runId`, como Asteroids y Tetris.
- Clase `.cover-arkanoid` en `app/globals.css` y escalado del canvas en el marco CRT (extender la regla `.crt-screen > .asteroids-canvas` al canvas de este juego).
- Actualizar `CLAUDE.md`.

**Out of scope (para futuros specs):**

- Botón de silencio, volumen o música de fondo.
- Controles táctiles o gamepad.
- Selector de nivel del overlay de pausa y su clic en el canvas: se elimina (ver Decisions).
- Distinguir la victoria de la derrota en el modal (texto "¡Completaste el juego!"): el modal es el mismo.
- Cambios de reglas, dificultad o contenido: ángulo de rebote según el punto de la paleta, power-ups, bloques resistentes, más niveles o pantalla de saque.
- Rediseño visual del canvas o de los sprites.
- Auth, `user_id`, antitrampas y rate limiting (ver spec 06).
- Cambios en `app/lib/games.ts`, `leaderboard.tsx`, `hall-board.tsx`, `/salon` y `game-player.tsx`: el juego aparece por tener fila en `games` y entrada en el registro.
- Tests automatizados (no hay runner configurado).

## Data model

Catálogo (migración; se muestra el esquema, no el SQL completo). Los textos son una propuesta a revisar:

```sql
-- supabase/migrations/20261121HHMMSS_arkanoid.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('arkanoid', 'ROMPEBLOQUES',
   'Devuelve la bola con la paleta y rompe todo el muro.',
   'Mueve la paleta para que la bola no caiga y rompe todos los bloques. Tienes 3 vidas y cinco niveles con patrones distintos; en cada nivel la bola va más rápida.',
   'ARCADE', 'cover-arkanoid', 'magenta', 2);

drop policy "scores_insert_real_games" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris', 'arkanoid'));
```

API del motor:

```ts
// app/games/arkanoid/engine.ts
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
}

export function createArkanoid(
  canvas: HTMLCanvasElement, // 800×600
  callbacks: ArkanoidCallbacks,
): ArkanoidHandle;
```

Props del componente (cumple `RealCanvasProps` del registro):

```ts
// app/components/arkanoid-canvas.tsx  ("use client")
interface ArkanoidCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  onScore: (n: number) => void;
  onLives: (n: number) => void;
  onLevel: (n: number) => void;
  onGameOver: () => void;
}
// <canvas className="arkanoid-canvas" width={800} height={600} aria-label="Juego Rompebloques" />
```

Registro de motores (solo se añade la entrada):

```ts
// app/games/registry.ts
arkanoid: { Canvas: ArkanoidCanvas, hud: { lives: true, level: true } },
```

Módulos del motor (todos en `app/games/arkanoid/`):

| Archivo        | Contenido                                                                                                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | `CANVAS_W = 800`, `CANVAS_H = 600`, `PADDLE_SPEED`, `BLOCK_COLS`, `BLOCK_ROWS`, `BLOCK_W`, `BLOCK_H`, `BLOCKS_ORIGIN_X`, `BLOCKS_ORIGIN_Y`, `BASE_BALL_VX`, `BASE_BALL_VY`, medidas de paleta y bola, `INITIAL_LIVES`, `POINTS_PER_BLOCK`, `MAX_DT = 0.05`, URLs de assets bajo `/games/arkanoid/` |
| `input.ts`     | `createInput()` con `attach()`/`detach()`, teclas ← → por `code`, `preventDefault` fuera de `input`/`textarea` y limpieza en `blur`                                                                                                                                                                |
| `levels.ts`    | `LEVELS` (5 niveles con `speed` y `blocks[]` con `col`, `row` y `color`), generados con las mismas reglas que `levels.js`                                                                                                                                                                          |
| `sprites.ts`   | `SPRITES` y `EXPLOSION_FRAMES` (recortes del spritesheet), `EXPLOSION_DURATION = 150`, `loadSpritesheet(url)` que devuelve una promesa con la `HTMLImageElement`, y `drawSprite` / `drawFrame` que reciben `ctx` e imagen por parámetro                                                            |
| `engine.ts`    | estado, sonidos, `update`, `draw`, bucle con `requestAnimationFrame` y `createArkanoid`                                                                                                                                                                                                            |

Reglas de juego que se conservan tal cual de `game.js` y `levels.js`:

| Regla                     | Valor                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas                    | 800×600, fondo `#000` pintado en el canvas en cada frame                                                                                                                                             |
| Vidas                     | 3 al empezar                                                                                                                                                                                         |
| Puntos                    | 10 por bloque roto, acumulados en los 5 niveles                                                                                                                                                      |
| Paleta                    | 81×14 px dibujada con el sprite `paddle` (el recorte del spritesheet es de 162×14 y se escala a 81 de ancho), `y = 560`, centrada al iniciar (`x = (800 − 81) / 2`)                                  |
| Velocidad de la paleta    | 400 px/s con ← y →, limitada a `[0, 800 − 81]`                                                                                                                                                       |
| Paleta con ratón          | `x = mouseX − 81/2`, limitada a `[0, 800 − 81]`, con `mouseX` convertido a coordenadas del canvas por la escala CSS                                                                                  |
| Bola                      | 16×16 px; sale pegada a la paleta (`x = paleta.x + (81 − 16)/2`, `y = paleta.y − 16`) y se lanza sola, sin esperar tecla                                                                             |
| Velocidad de la bola      | `vx = 200 × speed`, `vy = −300 × speed` (la bola sale hacia la derecha y hacia arriba), con `speed` del nivel                                                                                        |
| Niveles                   | 5: velocidad ×1,00, ×1,10, ×1,21, ×1,33 y ×1,46                                                                                                                                                      |
| Muro                      | 10 columnas × 6 filas, bloque de 64×24, origen `x = (800 − 10 × 64)/2 = 80`, `y = 80`                                                                                                                |
| Nivel 1                   | parrilla completa 10×6 (60 bloques), colores por fila: red, yellow, cyan, magenta, hotpink, green                                                                                                    |
| Nivel 2                   | pirámide centrada (40 bloques): columnas por fila `[4–5, 3–6, 2–7, 1–8, 0–9, 0–9]`, colores por fila: gray, cyan, hotpink, yellow, magenta, green                                                    |
| Nivel 3                   | tablero de ajedrez, `(col + fila)` par (30 bloques): yellow las filas 0–2 y magenta las filas 3–5                                                                                                    |
| Nivel 4                   | filas con huecos (39 bloques): huecos por fila `[2,5,8]`, `[0,4,7,9]`, `[1,3,6]`, `[2,5,8,9]`, `[0,4,7]`, `[1,3,6,9]`; colores por fila: cyan, magenta, green, yellow, hotpink, red                  |
| Nivel 5                   | marco (columnas 0 y 9, filas 0 y 5) más cruz (columna 4 y fila 2), 39 bloques: marco cyan, cruz interior hotpink                                                                                     |
| Rebote en paredes         | izquierda, derecha y techo: la bola se recoloca dentro y la velocidad de ese eje pasa a apuntar hacia dentro; suena el rebote                                                                        |
| Rebote en la paleta       | solo con `vy > 0`, con solape en x y con `ball.y + 16` entre `paleta.y` y `paleta.y + 14 + 8`; la bola se recoloca sobre la paleta, `vy = −                                                          | vy  | `, `vx` no cambia; suena el rebote |
| Colisión con bloques      | AABB; se procesa como máximo un bloque por frame (el primero vivo del arreglo que solape)                                                                                                            |
| Al romper un bloque       | se marca muerto, `+10`, `vy = −vy`, suena la rotura y se crea una explosión de su color                                                                                                              |
| Explosión                 | 150 ms, 4 frames del spritesheet (`min(floor(elapsed / 150 × 4), 3)`), en la posición y tamaño del bloque; `gray` usa los mismos frames que `red`                                                    |
| Nivel limpio              | al romper el último bloque: si el nivel es menor de 5, carga el siguiente (muro nuevo, explosiones borradas, bola reposicionada con la velocidad del nivel, paleta donde está); si es el 5, victoria |
| Bola perdida              | `ball.y > 600`: pierde una vida; con 0 vidas termina la partida; si no, la bola vuelve a la paleta con la velocidad del nivel actual                                                                 |
| Fin de partida            | 0 vidas (derrota) o nivel 5 limpiado (victoria)                                                                                                                                                      |
| Orden de dibujo           | fondo, bloques vivos, explosiones, paleta, bola, HUD                                                                                                                                                 |
| HUD del canvas            | texto `bold 18px monospace` blanco: puntos arriba a la izquierda (`x = 10`, `y = 10`), `Nivel: N` centrado arriba, y una bola de 16 px por vida arriba a la derecha (separación 4 px, margen 10 px)  |
| Sonidos                   | `ball-bounce.mp3` en cada rebote de pared o paleta; `break-sound.mp3` al romper un bloque; se reproduce un clon del audio en cada evento                                                             |
| Puntuación máxima posible | 208 bloques × 10 = 2 080 (60 + 40 + 30 + 39 + 39), muy por debajo del `check` de 10 000 000                                                                                                          |

Cambios de comportamiento respecto al original (únicos):

- El motor no arranca solo al cargar el spritesheet ni se reinicia con nada: arranca en `createArkanoid` (el bucle empieza cuando la imagen carga, como el original) y el reinicio lo hace React (`runId`).
- Sin overlay de GAME OVER, de victoria ni de PAUSA en el canvas: los sustituyen el "EN PAUSA" y el modal de `GamePlayer`. En derrota o victoria el motor dibuja un último frame (con el HUD y sin overlay), deja de leer teclas y ratón y detiene su bucle. Después, `pause` y `resume` no reviven el bucle.
- La pausa con `P` y `Escape` se elimina: la pausa la controla `paused` desde React. Con el motor en pausa se ignoran teclado y ratón (el original seguía moviendo la paleta con el ratón en pausa).
- El selector de nivel del overlay de pausa, sus cinco botones y el listener de `click` del canvas se eliminan (ver Decisions).
- El spritesheet se dibuja directamente desde la imagen cargada: se elimina el canvas auxiliar creado con `document.createElement`. El primer frame se pinta negro hasta que la imagen carga.
- Sonidos: la promesa de `play()` se captura y se ignora el rechazo del navegador (audio bloqueado antes del primer gesto). Los sonidos solo se crean y reproducen mientras el motor no está destruido.
- El rótulo del HUD `Score:` pasa a `Puntos:`; `Nivel:` se conserva. Es el único cambio de texto, por la regla de textos en español.
- La derrota y la victoria llaman a `onGameOver` una sola vez; el HUD sigue dibujado en el último frame (el original lo ocultaba bajo el overlay).
- Entidades y funciones reciben `ctx` e `input` por parámetro; el estado vive en el cierre de `createArkanoid`.
- `input` limpia teclas en `blur` y hace `preventDefault` en ← → fuera de `input`/`textarea`.
- `dt` en segundos con tope de 0,05 s (el original no tiene tope); `resume` reinicia la marca de tiempo.
- El `mousemove` y la conversión de coordenadas se registran en el canvas que recibe el motor y `destroy` los quita.

Convenciones:

- Coordenadas con origen arriba a la izquierda, en píxeles del canvas de 800×600.
- Callbacks solo cuando el valor cambia; `onLives(3)` y `onLevel(1)` se emiten al iniciar y `onScore` no (empieza en 0).
- Textos de la UI en español.
- El canvas es de 800×600 y se escala por CSS (4:3, sin `devicePixelRatio`), igual que Asteroids.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components, efectos con `useEffect` y archivos estáticos de `public/`, y repasar `CLAUDE.md` y las specs 05, 06 y 07. Prueba manual: ninguna.
2. Crear `supabase/migrations/20261121HHMMSS_arkanoid.sql` (fila `arkanoid` en `games` y política `scores_insert_real_games` ampliada) y aplicarla con `mcp__supabase__apply_migration`; comprobar con `list_migrations` que el nombre del archivo coincide con la versión remota. Añadir `arkanoid` a `REAL_GAME_IDS` en `app/actions/scores.ts`. Comprobar si `generate_typescript_types` produce diferencias en `app/lib/supabase/database.types.ts` y regenerar si las hay. Prueba manual: `execute_sql` muestra la fila en `games_with_stats` con `plays = 0`; `get_advisors` (security) sin avisos nuevos; `/biblioteca` muestra la tarjeta y `/juegos/arkanoid` carga el detalle (con la cover sin estilo hasta el paso 9); `npx tsc --noEmit` sin errores.
3. Copiar `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3` de `references/started-games/04-arkanoid/assets/` a `public/games/arkanoid/`. Prueba manual: con el servidor de desarrollo, las tres URLs `/games/arkanoid/...` responden 200.
4. Crear `app/games/arkanoid/constants.ts`, `input.ts` y `levels.ts`. Prueba manual: `npx tsc --noEmit`; los cinco niveles suman 208 bloques.
5. Crear `app/games/arkanoid/sprites.ts` con los recortes, `loadSpritesheet(url)`, `drawSprite` y `drawFrame`. Prueba manual: `npx tsc --noEmit`.
6. Crear `app/games/arkanoid/engine.ts` con `createArkanoid`: estado, sonidos, `update`, `draw`, bucle, ratón, `pause`, `resume`, `destroy` y los cuatro callbacks. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
7. Crear `app/components/arkanoid-canvas.tsx` copiando `asteroids-canvas.tsx` (`<canvas>` de 800×600, efecto de motor con `[runId]`, efecto de pausa con `[paused, runId]`, callbacks en `ref`). Prueba manual: `npx tsc --noEmit` y `npm run lint`.
8. Añadir la entrada `arkanoid` a `app/games/registry.ts`. Prueba manual: `/juegos/arkanoid/jugar` muestra el juego real con la barra Jugador, Puntuación, Vidas y Nivel; `/juegos/asteroids/jugar` y `/juegos/tetris/jugar` siguen igual.
9. Cover `.cover-arkanoid` (con `/frontend-design`) en `app/globals.css` y regla `.crt-screen > .arkanoid-canvas` (o extender la de `.asteroids-canvas`) con `width: 100%; height: auto`. Prueba manual: a 1280 px y a 375 px el canvas se ve completo, sin deformarse ni scroll horizontal; la tarjeta de `/biblioteca` muestra la cover.
10. Comparar con la referencia: abrir `references/started-games/04-arkanoid/index.html` y `/juegos/arkanoid/jugar` con Playwright MCP en el mismo estado (partida recién empezada y con el nivel 2 en marcha) y comparar capturas del canvas (muro, paleta, bola, HUD, colores y posiciones). Anotar y corregir las diferencias que no estén en "Cambios de comportamiento". Después, recorrido completo (capturas en `.playwright-screenshots/`): reglas, controles con teclado y ratón, sonidos (peticiones 200 y sin errores en consola), pausa, FIN, derrota, victoria, guardado en Supabase, leaderboard en `/juegos/arkanoid` y `/salon`, reinicio y salida. Corregir lo que falle.
11. Actualizar `CLAUDE.md` (motor, entrada del registro, política RLS, `REAL_GAME_IDS`, `sort_order` siguiente y assets). Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración, `list_migrations` muestra su versión igual al nombre del archivo y `games` tiene la fila `arkanoid` (`ROMPEBLOQUES`, `ARCADE`, `cover-arkanoid`, `magenta`, `sort_order = 2`). `database.types.ts` está actualizado.
- [ ] Con la clave publicable, un `insert` en `scores` con `game_id = 'arkanoid'` se acepta; con un `game_id` que no está en la lista se rechaza; un `update` y un `delete` se rechazan. `get_advisors` (security) no reporta avisos nuevos.
- [ ] `saveScore` con `gameId = 'arkanoid'` inserta la fila; con un id fuera de `REAL_GAME_IDS` devuelve el error genérico y no inserta.
- [ ] `/biblioteca` muestra la tarjeta ROMPEBLOQUES (ARCADE, cover propia) y `/juegos/arkanoid` carga su detalle con el leaderboard vacío antes de la primera partida.
- [ ] `public/games/arkanoid/` contiene `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3`, y las tres URLs responden 200.
- [ ] `/juegos/arkanoid/jugar` muestra un `<canvas>` de 800×600 con el nivel 1 (parrilla de 60 bloques de 6 colores), la paleta centrada, la bola sobre ella y el HUD (`Puntos: 0`, `Nivel: 1`, 3 bolas), sin errores en consola.
- [ ] La bola se lanza sola al empezar con `vx = 200` y `vy = −300` (sube hacia la derecha) y rebota en las paredes laterales y en el techo.
- [ ] ← y → mueven la paleta a 400 px/s sin sacarla del canvas; mover el ratón sobre el canvas la sigue con el centro en el cursor, también con el canvas escalado por CSS.
- [ ] La bola rebota en la paleta solo bajando, con `vy` hacia arriba y sin cambiar `vx`; si pasa de `y = 600` se pierde una vida.
- [ ] Romper un bloque suma exactamente 10 puntos, lo elimina, invierte `vy`, muestra la explosión de 4 frames durante 150 ms y suena la rotura; un solo bloque por frame.
- [ ] El rebote de pared o paleta suena; ambos MP3 se piden una vez y no hay errores de consola por audio bloqueado antes del primer gesto.
- [ ] Al perder una vida, la bola vuelve a la paleta con la velocidad del nivel actual; al llegar a 0 vidas se abre el modal "FIN DEL JUEGO" con el puntaje correcto.
- [ ] Al limpiar el nivel 1 carga el nivel 2 (pirámide de 40 bloques, bola ×1,10, `Nivel: 2`, puntaje conservado). Los niveles 3, 4 y 5 cargan con 30, 39 y 39 bloques y velocidades ×1,21, ×1,33 y ×1,46.
- [ ] Al limpiar el nivel 5 se abre el modal "FIN DEL JUEGO" con el puntaje correcto (máximo 2 080), sin overlay en el canvas, el juego queda congelado y el último frame sigue dibujado.
- [ ] La barra de la plataforma muestra Jugador, Puntuación, Vidas y Nivel con los mismos valores que el HUD del canvas y se actualiza al cambiar.
- [ ] Las teclas ← → no hacen scroll en la página.
- [ ] `P` y `Escape` no pausan; no hay selector de nivel ni overlay de pausa dentro del canvas.
- [ ] PAUSA congela bola, paleta, explosiones y contador; con el ratón o las teclas la paleta no se mueve en pausa; REANUDAR continúa sin salto de la bola.
- [ ] FIN abre el modal "FIN DEL JUEGO" con el puntaje actual y el juego queda congelado; escribir las iniciales (incluidas ← →) no mueve la paleta ni hace scroll.
- [ ] Guardar con iniciales `abc` inserta en `scores` una fila con `game_id = 'arkanoid'`, `name = 'ABC'` y el puntaje correcto; aparece en el top 10 de `/juegos/arkanoid` y en la pestaña ROMPEBLOQUES de `/salon`, y `best` y `plays` la reflejan.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia: puntaje 0, nivel 1, 3 vidas, muro del nivel 1 completo y velocidad ×1,00.
- [ ] Salir de la ruta no deja `requestAnimationFrame` ni listeners (teclado, ratón, `blur`); en Strict Mode hay un solo motor y una pulsación mueve la paleta una sola vez.
- [ ] Una captura de `/juegos/arkanoid/jugar` coincide con la de la referencia en el mismo estado en muro, colores, paleta, bola, HUD y posiciones. Las diferencias se limitan al rótulo `Puntos:`, la ausencia de overlays y los efectos del marco CRT.
- [ ] Asteroids y Tetris siguen funcionando y guardando igual que antes.
- [ ] A 1280 px y 375 px el canvas se ve completo, sin deformarse y sin scroll horizontal; sin errores de consola ni de hidratación.
- [ ] `CLAUDE.md` documenta el motor, los assets, la entrada del registro, la política RLS y `REAL_GAME_IDS`.

## Decisions

- **Sí:** misma forma que Asteroids (`createXxx(canvas, callbacks)`, `runId`, `paused`, callbacks en `ref`, motor sin React). Decidida en la spec 05; este juego no necesita cambiar la firma.
- **Sí:** guardado con `saveScore` y RLS por lista de ids. Decidido en la spec 06; esta spec amplía la política `scores_insert_real_games` a `arkanoid`.
- **Sí:** entrada nueva `arkanoid` con `sort_order = 2`. Los 8 simuladores ya no existen (spec 08), así que no hay nada que sustituir.
- **Sí:** id `arkanoid` y cover `cover-arkanoid`, con título visible propio ROMPEBLOQUES (mismo criterio que `tetris`/APILADOR). **No:** `ARKANOID` como título (nombre comercial) y **No:** id `rompebloques` (se prefiere el id igual que la carpeta de referencia). Si se prefiere otro título, solo cambia la migración y el texto de la cover.
- **Sí:** color `magenta` y categoría `ARCADE` para la tarjeta. Propuesta a revisar; `asteroids` es `cyan` y `tetris` `yellow`.
- **Sí:** barra con Jugador, Puntuación, Vidas y Nivel (`hud: { lives: true, level: true }`). El juego tiene vidas y niveles, igual que Asteroids.
- **Sí:** copiar el spritesheet a `public/games/arkanoid/` y cargarlo por URL. **No:** redibujar con primitivas del canvas, porque cambiaría el aspecto y obligaría a rediseñar las explosiones.
- **Sí:** los dos efectos de sonido entran, sin silencio ni volumen. Decisión del usuario, que se aparta de las specs 05 y 07 (sin audio). Queda el riesgo de que no haya forma de silenciarlos y de que el navegador bloquee el audio antes del primer gesto.
- **No:** botón de silencio, volumen ni música. Quedan para otra spec.
- **Sí:** eliminar el selector de nivel de la pausa y su clic. Decisión del usuario: saltar al nivel 1 reponía los bloques sin tocar el puntaje y permitía farmear puntos antes de guardar. La pausa queda solo en el botón PAUSA de `GamePlayer`.
- **Sí:** `P` y `Escape` dejan de pausar. Dos fuentes de pausa dejarían a React y al motor fuera de sincronía.
- **Sí:** teclado y ratón. Decisión del usuario, fiel al original. El `mousemove` va en el canvas, convierte con `getBoundingClientRect` para la escala CSS y se ignora en pausa y tras el fin.
- **Sí:** conservar el HUD dibujado en el canvas (puntos, nivel y bolas por vida), como Asteroids, además de la barra de la plataforma. Decisión del usuario.
- **Sí:** victoria y derrota disparan el mismo `onGameOver` y abren el mismo modal. Decisión del usuario. **No:** un callback `onWin` ni texto distinto en el modal, porque tocaría `GamePlayer` y `RealCanvasProps` (afecta a los otros dos juegos).
- **Sí:** el motor deja un último frame con el HUD y sin overlay y detiene su bucle; el original ocultaba el HUD bajo el overlay. Es consecuencia de quitar el overlay del canvas.
- **Sí:** `dt` en segundos con tope de 0,05 s. Es un cambio menor frente al original (sin tope) que exige la plataforma.
- **Sí:** sin cambios de reglas: la bola no cambia el ángulo según el punto de la paleta, se lanza sola y un bloque por frame, tal como en la referencia.
- **Sí:** dibujar el spritesheet directamente desde la `HTMLImageElement`. **No:** conservar el canvas auxiliar de `spritesheet.js`, que obliga a usar `document.createElement`.
- **Sí:** el bucle empieza cuando carga el spritesheet, como el original. Si `destroy` llega antes, no arranca.
- **Sí:** rótulo `Puntos:` en lugar de `Score:` en el HUD del canvas, por la regla de textos en español. Es el único cambio de texto.
- **Sí:** registro de motores existente: solo se añade una entrada. `GamePlayer` no cambia.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para la cover y el ajuste del marco CRT.

## Risks

| Riesgo                                                                                                                                                     | Mitigación                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el motor dos veces                                                                                                                       | `destroy` cancela el rAF, hace `detach`, quita el `mousemove` y descarta la carga del spritesheet; el efecto depende solo de `runId`. Se comprueba en desarrollo con una pulsación = un movimiento. |
| El spritesheet carga después de `destroy` y arranca un bucle huérfano                                                                                      | El motor comprueba `destroyed` al resolver la carga y no arranca; se verifica con un cambio rápido de ruta.                                                                                         |
| El nombre de la migración no coincide con la versión remota                                                                                                | Comprobar con `list_migrations` tras `apply_migration` y renombrar el archivo.                                                                                                                      |
| Olvidar `REAL_GAME_IDS`, la política RLS o el registro                                                                                                     | El criterio de guardado falla o `/juegos/arkanoid/jugar` da 404; la migración y `REAL_GAME_IDS` van en el paso 2 y el registro en el 8.                                                             |
| El navegador bloquea el audio antes del primer gesto                                                                                                       | Se captura el rechazo de `play()` y se ignora; el primer rebote suele llegar tras pulsar JUGAR o mover la paleta. No hay error en consola.                                                          |
| No hay forma de silenciar los efectos                                                                                                                      | Aceptado y anotado en Out of scope. Si molesta, silencio y volumen van en otra spec.                                                                                                                |
| Reproducir un clon de audio por evento acumula objetos `Audio`                                                                                             | Son clips de menos de un segundo y se liberan al terminar; la partida máxima tiene 208 roturas. Si molesta, se reutiliza un pequeño pool en otra spec.                                              |
| Los puntajes superan 10 000 000                                                                                                                            | No aplica: el máximo posible es 2 080.                                                                                                                                                              |
| Tras una pestaña en segundo plano, un frame largo mueve la bola hasta 22 px (`dt` = 0,05 × 438 px/s) y puede atravesar la paleta, cuya ventana es de 22 px | El tope de `dt` limita el salto; el margen es justo pero suficiente. La física (con huecos de túnel) no se cambia en esta spec.                                                                     |
| Teclas o ratón llegan al motor con el modal abierto                                                                                                        | El motor está en pausa mientras el modal está abierto y `input` ignora los eventos con foco en `input`/`textarea`.                                                                                  |
| El spritesheet y los sonidos son de terceros                                                                                                               | Vienen con la referencia del curso y no se modifican; el título y la cover del catálogo son propios. Revisar su licencia antes de publicar el sitio.                                                |
| Las capturas no coinciden con la referencia por los efectos del marco CRT (escaneo, sombra interior)                                                       | Son parte del marco de la plataforma y no se tocan; la comparación del paso 10 las descuenta y anota las demás diferencias.                                                                         |
| Escalar el canvas por CSS lo ve algo borroso (no hay `devicePixelRatio`)                                                                                   | Se acepta, como en Asteroids; si molesta, se aborda en otro spec.                                                                                                                                   |
| El id `arkanoid` expone en la URL un nombre comercial                                                                                                      | Decisión del usuario (igual que `tetris`); el título visible es propio. Se puede cambiar el id en otro spec si se quiere.                                                                           |

## What is **not** in this spec

- Silencio, volumen o música, controles táctiles o gamepad.
- Selector de nivel, overlay de pausa en el canvas y las teclas `P` y `Escape` como pausa.
- Un modal distinto para la victoria.
- Cambios de reglas, dificultad o diseño (ángulo según la paleta, power-ups, bloques resistentes, más niveles).
- Auth, `user_id`, antitrampas o rate limiting.
- Cambios en `leaderboard.tsx`, `hall-board.tsx`, `/salon`, `app/lib/games.ts` o `game-player.tsx`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
