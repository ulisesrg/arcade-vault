# Checklist de integración de un juego real

Cada punto aplicable debe aparecer en la spec (Scope, plan y criterios). `<id>` es el slug del juego; `<Name>` su nombre en PascalCase.

## 1. Archivos que aparecen o cambian

| Punto                  | Ruta                                         | Qué se hace                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor                  | `app/games/<id>/`                            | `constants.ts`, `input.ts` y los módulos de entidades que pida el juego (`entities.ts`, `board.ts`, `pieces.ts`, `levels.ts`…) y `engine.ts`. TypeScript estricto, sin React, sin `document`, sin globales.                                                                                                                      |
| API del motor          | `app/games/<id>/engine.ts`                   | `create<Name>(canvas, callbacks)` → `{ pause, resume, destroy }`. Callbacks solo cuando el valor cambia. `onGameOver` una sola vez.                                                                                                                                                                                              |
| Wrapper React          | `app/components/<id>-canvas.tsx`             | Client Component con `<canvas width height>`, `runId`, `paused`, callbacks en `ref`, efecto del motor con dependencia `runId` y efecto de pausa `[paused, runId]`. Copiar `asteroids-canvas.tsx`.                                                                                                                                |
| GamePlayer             | `app/components/game-player.tsx`             | Con 1 juego real hoy: refactor a registro (`isReal` = id en el registro) y renderizar el canvas que toque. HUD según los callbacks del juego. Simuladores sin cambios.                                                                                                                                                           |
| Registro (condicional) | `app/games/registry.ts` (o lo que se decida) | Solo al llegar el segundo juego real; después solo se añade la entrada.                                                                                                                                                                                                                                                          |
| Server Action          | `app/actions/scores.ts`                      | Añadir `<id>` a `REAL_GAME_IDS`. Revisar que `MAX_SCORE` cubre el juego.                                                                                                                                                                                                                                                         |
| Migración              | `supabase/migrations/<timestamp>_<id>.sql`   | `insert` en `games` (o `update` si sustituye un simulado) y recrear la política de insert de `scores` con `game_id in ('asteroids', …, '<id>')` (`drop policy` + `create policy`). Aplicar con `mcp__supabase__apply_migration`; el nombre del archivo debe coincidir con la versión de `schema_migrations` (`list_migrations`). |
| Tipos                  | `app/lib/supabase/database.types.ts`         | Regenerar con `generate_typescript_types` (no editar a mano). Si solo cambian datos, comprobar que no hay diff.                                                                                                                                                                                                                  |
| Cover                  | `app/globals.css`                            | Clase `.cover-<id>` en CSS puro al estilo de las demás (usar `/frontend-design`). Si se sustituye un simulado, decidir si se mantiene su cover.                                                                                                                                                                                  |
| Canvas en el CRT       | `app/globals.css`                            | Regla `.crt-screen > .<id>-canvas` (o una clase común a todos los canvas reales) con `width: 100%; height: auto` y la proporción del canvas.                                                                                                                                                                                     |
| Assets (condicional)   | `public/games/<id>/`                         | Sprites y sonidos copiados de la referencia; el motor los recibe o carga por URL, sin `document.getElementById`.                                                                                                                                                                                                                 |
| Documentación          | `CLAUDE.md`                                  | Lista de juegos reales, registro, política RLS y `REAL_GAME_IDS` actualizados.                                                                                                                                                                                                                                                   |

## 2. Lo que NO cambia (ya existe desde la spec 06)

- `app/lib/games.ts` (`getGames`, `getGame`, `getLeaderboard`), `app/components/leaderboard.tsx`, `hall-board.tsx`, `/salon` y `/juegos/[id]`: el juego aparece solo al tener fila en `games` y puntajes en `scores`.
- Vista `games_with_stats`, índice y `check` de `scores`.
- Modal "FIN DEL JUEGO", flujo de guardado con botón deshabilitado y reintento.

## 3. Traducción de `game.js` (global) a motor modular

| En la referencia                                  | En el motor                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `const canvas = document.getElementById(...)`     | `canvas` llega como parámetro de `create<Name>`                                                                  |
| Variables globales de estado                      | Estado privado dentro del cierre de `create<Name>`                                                               |
| `window.addEventListener` sin limpiar             | `createInput()` con `attach()`/`detach()`; `destroy` llama a `detach`                                            |
| Bucle que arranca solo                            | Arranca en `create<Name>`; `destroy` cancela el `requestAnimationFrame` (y cualquier `setInterval`/`setTimeout`) |
| Reinicio con tecla (Espacio, Enter, R)            | Eliminado: reinicia React cambiando `runId`                                                                      |
| Overlay "GAME OVER" en el canvas                  | Eliminado: lo sustituye el modal de `GamePlayer`. En game over el motor deja de leer teclas                      |
| Overlay o tecla de pausa propia (P, Esc)          | Eliminado o redirigido: la pausa la controla `paused` desde React (decidir en la spec)                           |
| HUD dibujado en el canvas                         | Se conserva (como en Asteroids), salvo decisión en contra                                                        |
| HUD en el HTML fuera del canvas                   | Pasa a la barra de `GamePlayer` vía callbacks                                                                    |
| Funciones que leen `ctx` global                   | Reciben `ctx` como parámetro                                                                                     |
| `keydown` sin `preventDefault`                    | `preventDefault` en las teclas del juego salvo con foco en `input`/`textarea`                                    |
| Teclas pegadas al cambiar de ventana              | `input` limpia las teclas en `blur`                                                                              |
| `dt` sin tope / `setInterval` fijo                | `dt` en segundos con tope (0,05 s) y `resume` reinicia la marca de tiempo                                        |
| `new Image()` / `new Audio()` con rutas relativas | Rutas bajo `/games/<id>/`; carga asíncrona sin bloquear el primer frame                                          |

## 4. Criterios que toda spec de juego debe incluir

- `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.
- La migración está en `supabase/migrations/` y `games` tiene la fila del juego con los datos acordados.
- Con la clave publicable, un `insert` en `scores` con `game_id = '<id>'` se acepta y uno con un juego simulado sigue rechazado; `update`/`delete` siguen rechazados. `get_advisors` (security) sin avisos nuevos.
- Guardar con iniciales `abc` inserta `name = 'ABC'`, `game_id = '<id>'` y el puntaje correcto; aparece en el top 10 de `/juegos/<id>` y en la pestaña del juego en `/salon`, y `best`/`plays` se actualizan.
- `saveScore` con `gameId = '<id>'` funciona y con un simulado sigue fallando.
- Reglas conservadas verificables una a una (tabla de reglas).
- Pausa congela todo y reanuda sin salto; FIN abre el modal con el puntaje actual; escribir las iniciales no mueve el juego ni hace scroll.
- "JUGAR DE NUEVO" empieza una partida limpia; salir de la ruta no deja `requestAnimationFrame` ni listeners; en Strict Mode hay un solo motor.
- A 1280 px y 375 px el canvas se ve completo, sin deformarse y sin scroll horizontal; sin errores de consola ni de hidratación.
- Asteroids (y los demás juegos reales previos) siguen funcionando igual; los simuladores siguen guardando en `localStorage["av_scores"]`.
- `CLAUDE.md` actualizado.
