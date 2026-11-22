# SPEC 08 — Quitar los juegos simulados y dejar solo juegos reales

> **Status:** Implementado
> **Depends on:** SPEC 02, SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-21
> **Objective:** Eliminar los 8 juegos simulados (filas de `games`, rama simulador de `GamePlayer`, covers y datos ficticios de la home) para que el sitio solo muestre juegos con motor real: `asteroids` y `tetris`.

## Por qué existe este spec

Las specs 01 a 07 dejaron dos tipos de juego conviviendo: 2 con motor real (`asteroids`, `tetris`) y 8 simulados (puntaje aleatorio, arena decorativa, guardado en `localStorage["av_scores"]`). Los simuladores eran andamiaje de la spec 01; ya no sirven y dos de ellos (`caida`, `rocas`) duplican juegos reales, una deuda anotada en las specs 05, 06 y 07. Además la home sigue con partidas y jugadores ficticios que nombran juegos que van a dejar de existir.

Los 8 simuladores tienen 0 puntuaciones en `scores` (consultado el 2026-11-21), así que el borrado no destruye datos reales.

## Scope

**In:**

- Migración `supabase/migrations/20261121HHMMSS_quitar_juegos_simulados.sql` (la versión real la fija `apply_migration`) que borra de `games` los 8 ids simulados y renumera `sort_order` (`asteroids` = 0, `tetris` = 1).
- Quitar de `GamePlayer` (`app/components/game-player.tsx`) la rama del simulador: intervalo de puntaje aleatorio, `.game-arena`, `SCORES_KEY = "av_scores"` y el guardado local. `GamePlayer` solo renderiza juegos del registro y guarda siempre con `saveScore`.
- `/juegos/[id]/jugar` llama a `notFound()` si el juego no existe en `games` **o** no está en `REAL_GAMES`.
- Eliminar las covers CSS sin uso de `app/globals.css` (`.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`) y los estilos `.game-arena` si quedan sin uso. Se comprueba con `grep` antes de borrar cada clase.
- Filtro de categorías de `/biblioteca` derivado de los juegos cargados: `TODOS` más las categorías que tengan al menos un juego (hoy `PUZZLE` y `SHOOTER`).
- Home: `RECENT_SCORES` y `TOP_PLAYERS` pasan a leer `scores` reales (con estado vacío) mediante dos funciones nuevas de `app/lib/games.ts`; `HOME_STATS` (JUEGOS y PARTIDAS) se calcula de `games_with_stats`; el texto de `FEATURES` se reescribe sin nombrar juegos que no existen.
- Formato "hace N min" para la actividad reciente (`formatAgo` en `app/lib/format-date.ts`).
- Eliminar de `app/data/home.ts` los datos ficticios sustituidos (`RECENT_SCORES`, `TOP_PLAYERS` y los números de `HOME_STATS`).
- Actualizar `CLAUDE.md` (quitar el simulador, `av_scores`, el duplicado `caida`/`tetris` y `rocas`/`asteroids`, y los datos ficticios de la home).

**Out of scope (para futuros specs):**

- Juegos nuevos (`04-arkanoid` y siguientes): se añaden con `/new-game`.
- Cambiar el `check` de `games.cat`, `GameCategory` o la política RLS de `scores` (`asteroids` y `tetris` siguen siendo los ids permitidos).
- Borrar o modificar `scores` existentes (las 2 de `asteroids` se conservan).
- Auth, `user_id`, antitrampas y rate limiting (ver spec 06).
- Filtros por fecha en la home: no existe "hoy" ni "esta semana".
- Rediseño de la home, de `/biblioteca` o de la cover de los juegos reales.
- Editar specs anteriores (05, 06, 07): quedan como registro histórico.
- Tests automatizados (no hay runner configurado).

## Data model

Migración (se muestra el esquema, no el SQL completo):

```sql
-- supabase/migrations/20261121HHMMSS_quitar_juegos_simulados.sql
delete from public.games
where id in ('bloque-buster', 'caida', 'serpentina', 'gloton',
             'invasores', 'rocas', 'ranaria', 'duelo-pixel');
-- falla por la FK si alguno tuviera puntuaciones: es intencional

update public.games set sort_order = 0 where id = 'asteroids';
update public.games set sort_order = 1 where id = 'tetris';
```

Sin cambios de esquema: `database.types.ts` no cambia (se comprueba con `generate_typescript_types`). Las políticas RLS, el índice y la vista `games_with_stats` quedan igual.

Capa de datos nueva (`app/lib/games.ts`, solo servidor, dentro de `<Suspense>`):

```ts
// app/lib/games.ts
export interface RecentScore {
  name: string;
  gameTitle: string;
  gameColor: GameColor; // games.color; la home lo usa como clase neon-*
  score: number;
  createdAt: string; // ISO; la UI lo muestra con formatAgo
}
export interface TopScore {
  rank: number;
  name: string;
  score: number;
}
export async function getRecentScores(limit: number): Promise<RecentScore[]>;
// scores + games(title, color), orden created_at desc
export async function getTopScores(limit: number): Promise<TopScore[]>;
// mejores puntajes entre todos los juegos: score desc, created_at asc; rank 1..N

// app/lib/format-date.ts
export function formatAgo(iso: string, now?: number): string;
// "hace un momento" (< 1 min), "hace N min", "hace N h", "hace N d"
```

Estadísticas de la home (derivadas de `getGames()`, sin consulta nueva):

```ts
// JUEGOS  = games.length
// PARTIDAS = suma de game.plays
```

`HOME_STATS` en `app/data/home.ts` conserva solo los rótulos fijos (`u`, `s`); los números `n` los calcula `app/page.tsx`. El tercer bloque (`GLOBAL` / `RANKING`) se mantiene como texto fijo.

Filtro de categorías (`app/components/library-browser.tsx`):

```ts
// categorías = ["TODOS", ...CATEGORY_ORDER.filter((c) => games.some((g) => g.cat === c))]
// CATEGORY_ORDER conserva el orden ARCADE, PUZZLE, SHOOTER, VERSUS (en app/data/games.ts)
```

Convenciones:

- Textos de la UI en español; números con `es-ES`; fechas `dd/mm/aaaa` en UTC cuando son absolutas.
- Estados vacíos en la home: `AÚN NO HAY PUNTUACIONES. ¡SÉ EL PRIMERO!` en las dos tarjetas de actividad.
- Si la lectura falla, cada tarjeta muestra un mensaje en español y no rompe la página (como `HomeGames`).
- El título "TOP JUGADORES · HOY" pasa a "TOP JUGADORES": sin filtro de fecha, "HOY" sería falso.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a `cacheComponents` y `<Suspense>` (para las nuevas lecturas de la home) y a `notFound()`. Repasar `CLAUDE.md` y las specs 06 y 07. Prueba manual: ninguna.
2. Crear `supabase/migrations/20261121HHMMSS_quitar_juegos_simulados.sql` y aplicarla con `mcp__supabase__apply_migration`; comprobar con `list_migrations` que el nombre del archivo coincide con la versión remota. Prueba manual: `execute_sql` sobre `games_with_stats` devuelve 2 filas (`asteroids` con `sort_order` 0 y `plays` = 2, `tetris` con 1); `generate_typescript_types` no produce diferencias; `get_advisors` (security) sin avisos nuevos. Hasta el paso siguiente `/biblioteca` ya muestra 2 juegos.
3. Quitar la rama simulador de `GamePlayer` y que `/juegos/[id]/jugar` llame a `notFound()` si el juego no está en `REAL_GAMES`. Prueba manual: `/juegos/asteroids/jugar` y `/juegos/tetris/jugar` juegan, pausan, terminan y guardan en `scores`; `/juegos/caida/jugar` da 404; `npx tsc --noEmit` y `npm run lint` sin errores.
4. Filtro de categorías derivado en `library-browser.tsx` (y `CATEGORY_ORDER` en `app/data/games.ts`, sustituyendo a `CATEGORIES`). Prueba manual: `/biblioteca` muestra los chips TODOS, PUZZLE y SHOOTER, y cada uno filtra bien.
5. Eliminar las covers sin uso y `.game-arena` de `app/globals.css`, comprobando cada clase con `grep` antes. Prueba manual: `/`, `/biblioteca` y `/juegos/asteroids` se ven igual; las covers `.cover-asteroids` y `.cover-tetris` siguen intactas.
6. Añadir `getRecentScores` y `getTopScores` a `app/lib/games.ts` y `formatAgo` a `app/lib/format-date.ts`. Prueba manual: `npx tsc --noEmit` sin errores y `execute_sql` coincide con la forma de los tipos.
7. Migrar la home: las tarjetas "ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES" leen de la capa de datos dentro de `<Suspense>` con estado vacío y de error; `HOME_STATS` usa conteos reales; reescribir el texto de `FEATURES` ("JUEGOS CLÁSICOS") sin nombrar juegos inexistentes; limpiar `app/data/home.ts`. Usar `/frontend-design` para el estado vacío. Prueba manual: `/` muestra las 2 puntuaciones reales de Asteroids, JUEGOS = 2 y PARTIDAS = 2, sin errores en consola ni de hidratación.
8. Actualizar `CLAUDE.md`. Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración, `list_migrations` muestra su versión igual al nombre del archivo y `games` tiene exactamente 2 filas: `asteroids` (`sort_order = 0`) y `tetris` (`sort_order = 1`).
- [ ] Las 2 puntuaciones existentes de `asteroids` siguen en `scores`.
- [ ] `database.types.ts` no cambia tras regenerarlo y `get_advisors` (security) no reporta avisos nuevos.
- [ ] `/biblioteca` muestra solo las tarjetas ASTEROIDS y APILADOR, y los chips de categoría son TODOS, PUZZLE y SHOOTER.
- [ ] `/juegos/caida`, `/juegos/caida/jugar` y `/juegos/rocas/jugar` muestran la página 404 (`noindex`; el estado HTTP es 200 por el streaming dentro de `<Suspense>`).
- [ ] `/juegos/asteroids/jugar` y `/juegos/tetris/jugar` siguen jugando, pausando, abriendo el modal de fin y guardando con `saveScore`; la fila aparece en `/juegos/<id>` y en `/salon`.
- [ ] `grep -rn "av_scores\|game-arena" app` no devuelve resultados; `av_user` sigue existiendo.
- [ ] `grep -rnE "cover-(bricks|tetro|snake|glot|invaders|rocas|rana|duelo)" app` no devuelve resultados.
- [ ] `app/data/home.ts` ya no exporta `RECENT_SCORES` ni `TOP_PLAYERS`, y ningún texto de `app` nombra BLOQUE BUSTER, SERPENTINA, GLOTÓN, INVASORES, RANARIA, DUELO PIXEL, CAÍDA ni ROCAS.
- [ ] La home muestra en "ÚLTIMAS PUNTUACIONES" las partidas reales más recientes (nombre, juego, puntaje y "hace N min/h/d"), ordenadas por fecha descendente.
- [ ] La home muestra en "TOP JUGADORES" los 5 mejores puntajes de todos los juegos, ordenados por puntaje descendente y, a igualdad, por fecha ascendente, con el título sin "· HOY".
- [ ] Con 0 puntuaciones en `scores` (comprobado en una rama o simulado), las dos tarjetas muestran el estado vacío sin errores.
- [ ] Los bloques de estadísticas de la home muestran JUEGOS = 2 y PARTIDAS = el total real de `scores`, y no queda ninguna cifra inventada (`12+`, `MILES`).
- [ ] Si falla la lectura de `scores` (p. ej. sin red), cada tarjeta de la home muestra un mensaje genérico en español y el resto de la home carga.
- [ ] A 1280 px y 375 px, `/`, `/biblioteca`, `/juegos/asteroids`, `/juegos/tetris`, `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/salon`, `/auth` y `/acerca-de` cargan sin errores en consola ni de hidratación y sin scroll horizontal.
- [ ] `CLAUDE.md` ya no menciona el simulador, `av_scores`, `caida` ni `rocas` como deuda, y refleja el catálogo de 2 juegos y la home con datos reales.

## Decisions

- **Sí:** borrar las filas de `games` con una migración. Decisión del usuario. Una única fuente de verdad y cero deuda de duplicados (`caida`, `rocas`); los 8 ids tenían 0 puntuaciones, así que no se pierde nada.
- **No:** ocultar las filas en `getGames()`. Dejaría datos muertos y contradice "borrar".
- **Sí:** renumerar `sort_order` a 0 y 1. Evita un hueco permanente en una columna `unique`; el próximo juego real entra con `sort_order` 2.
- **Sí:** el `delete` sin `cascade`. Si algún simulador tuviera puntuaciones, la FK hace fallar la migración en vez de borrarlas en silencio.
- **Sí:** eliminar la rama simulador de `GamePlayer`, `av_scores` y las covers sin uso. Decisión del usuario. Con la BD limpia son código inalcanzable.
- **Sí:** `/juegos/[id]/jugar` da 404 si el id no está en `REAL_GAMES`. Sin simulador, un juego en `games` sin motor no tiene qué renderizar; el 404 es más honesto que una pantalla vacía.
- **Sí:** filtro de categorías derivado de los juegos cargados. Decisión del usuario. El `check` de `games.cat` y `GameCategory` no cambian, así que el próximo juego ARCADE (arkanoid) aparece sin migración ni cambio de UI.
- **No:** recortar `CATEGORIES` y el `check` a SHOOTER/PUZZLE. Obligaría a otra migración al entrar arkanoid.
- **Sí:** la home lee `scores` reales con estado vacío. Decisión del usuario. Es coherente con la spec 06 y ya hay datos reales; mostrar partidas inventadas de juegos borrados sería falso.
- **No:** ocultar las dos tarjetas de actividad. Se descartó por empobrecer la home sin necesidad.
- **No:** datos reales para todo el contenido de la home ni rediseñarla. Solo se sustituye lo que nombraba juegos borrados.
- **Sí:** "TOP JUGADORES" sin "· HOY", como mejores puntajes de todos los juegos. No existe filtro por fecha (fuera de alcance de la spec 06) y mantener "HOY" sería falso.
- **Sí:** `HOME_STATS` con conteos reales (JUEGOS y PARTIDAS) y `FEATURES` reescrito. Decisión del usuario. Con 2 juegos "12+" y "Arkanoid, Tetris, Snake…" serían falsos; los conteos se calculan de datos que la página ya lee.
- **No:** textos estáticos veraces sin consulta. Se desactualizarían con cada juego nuevo.
- **Sí:** `formatAgo` en `app/lib/format-date.ts`, junto al formateador de fechas existente.
- **Sí:** no tocar las specs 05, 06 y 07. Son registro histórico; el estado vigente vive en `CLAUDE.md`.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para el estado vacío de la home, según `CLAUDE.md`.

## Risks

| Riesgo                                                                                        | Mitigación                                                                                                  |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Alguien tiene guardada una URL de un juego borrado (`/juegos/caida`)                          | Cae en la página 404 existente; no hay redirecciones, el sitio no está en producción pública.               |
| La migración falla por FK si un simulador recibió puntuaciones entre la consulta y el borrado | Es intencional; se revisa con `execute_sql` antes de aplicar y se decide caso a caso.                       |
| Borrar una cover que aún usa algo (p. ej. la home o siluetas flotantes)                       | Se hace `grep` de cada clase antes de borrarla y se comprueba visualmente `/` y `/biblioteca` en el paso 5. |
| Las nuevas lecturas de la home usan `cookies()` bajo `cacheComponents` fuera de `<Suspense>`  | Se aíslan en componentes async dentro de `<Suspense>` con fallback, como `HomeGames`.                       |
| `formatAgo` con `Date.now()` provoca desajuste de hidratación                                 | Se calcula en el servidor dentro del componente suspendido; no se renderiza en un Client Component.         |
| Con 1 o 2 juegos la home (rail de 6 `MiniCard`) y el Salón se ven vacíos                      | Esperado; `games.slice(0, 6)` ya soporta menos de 6. Se revisa visualmente a 1280 px y 375 px en el paso 7. |
| Texto de FEATURES o FAQ que aún nombre un juego borrado                                       | El criterio de aceptación incluye un `grep` de los títulos borrados en `app`.                               |

## What is **not** in this spec

- Juegos nuevos (arkanoid y siguientes) ni sus migraciones.
- Cambios al esquema de `games` o `scores`, a la política RLS o a `GameCategory`.
- Borrar o tocar las puntuaciones reales existentes.
- Auth, `user_id`, antitrampas o rate limiting.
- Filtros por fecha ("hoy", "esta semana") en la home.
- Rediseño de la home, `/biblioteca` o las covers de los juegos reales.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
