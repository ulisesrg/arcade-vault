# SPEC 06 — Leaderboard real y tabla `games` en Supabase

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-11-19
> **Objective:** Crear las tablas `games` y `scores` en Supabase para que `/biblioteca`, el detalle del juego y el Salón de la Fama lean catálogo y puntuaciones reales, y para que Asteroids guarde su puntaje allí.

## Por qué existe este spec

Hasta ahora el catálogo vive en `app/data/games.ts` (con `best` y `plays` fijos), el Salón y el detalle usan `seededScores` (datos aleatorios) y las puntuaciones se escriben solo en `localStorage["av_scores"]`. La spec 04 dejó Supabase conectado pero sin tablas, y la spec 05 dejó un primer juego real (`asteroids`) que ya produce puntajes reales. Este spec crea el primer esquema: `games` (catálogo, clave foránea) y `scores` (puntuaciones), y conecta las tres pantallas que muestran estos datos. Sigue sin haber Auth: el jugador se identifica con unas iniciales libres, y la protección se limita a RLS y validación (ver Riesgos).

## Scope

**In:**

- Migración SQL con las tablas `games` y `scores`, la vista `games_with_stats`, RLS, índice y el seed de los 9 juegos del catálogo. El SQL queda versionado en `supabase/migrations/` y se aplica con el MCP (`apply_migration`).
- Tipos generados (`generate_typescript_types`) en `app/lib/supabase/database.types.ts` y clientes `createClient` tipados con `Database`.
- Capa de acceso `app/lib/games.ts` (solo servidor): `getGames()`, `getGame(id)` y `getLeaderboard(gameId, limit)`.
- `/biblioteca`, la home (sección de juegos), `/juegos/[id]` y `/juegos/[id]/jugar` leen los juegos de `games_with_stats` en vez de `GAMES`. `best` y `plays` se calculan desde `scores`.
- Leaderboard real en `/juegos/[id]` (top 10 del juego), con estado vacío.
- `/salon` lee las puntuaciones reales por juego (podio + tabla, con las pestañas actuales), con estado vacío.
- Server Action `app/actions/scores.ts` (`saveScore`) que valida e inserta en `scores`. El modal "GUARDAR PUNTUACIÓN" de `GamePlayer` la usa para `asteroids`.
- Componente `app/components/leaderboard.tsx` para la tabla del detalle.
- Actualizar `CLAUDE.md` con el esquema, la capa de datos y el flujo de guardado.

**Out of scope (para futuros specs):**

- Supabase Auth, `proxy.ts`, `user_id` en `scores` y verificar la identidad del jugador. `av_user` sigue simulado.
- Guardar puntuaciones de los otros 8 juegos (siguen siendo simuladores y mantienen su guardado actual en `localStorage["av_scores"]`).
- Migrar o leer los `av_scores` ya guardados en `localStorage`. Se ignoran.
- Antitrampas: rate limiting, firma de partida o validación del puntaje contra el motor. Un puntaje enviado a mano puede falsificarse.
- Fila "tu posición" en el Salón (depende de identidad real).
- Leaderboard dentro de `/juegos/[id]/jugar` (se decidió solo en el detalle).
- Reemplazar `RECENT_SCORES` y `TOP_PLAYERS` de la home (`app/data/home.ts`): siguen ficticios.
- Cache con `"use cache"` y revalidación por etiquetas: las lecturas son dinámicas dentro de `<Suspense>`.
- Vista nueva de tabla en `/biblioteca`: la UI de tarjetas no cambia.
- Realtime, paginación, filtros por fecha o por periodo.
- Resolver el duplicado `rocas` / `asteroids`: ambos pasan a `games` tal cual.
- Tests automatizados (no hay runner configurado).

## Data model

Migración (se muestra el esquema, no el SQL completo):

```sql
-- supabase/migrations/<timestamp>_games_and_scores.sql
create table public.games (
  id         text primary key,                       -- slug de la URL, p. ej. 'asteroids'
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                          -- clase CSS, p. ej. 'cover-asteroids'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order integer not null unique                 -- orden del catálogo actual (0..8)
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id),
  name       text not null check (char_length(name) between 1 and 10),
  score      integer not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);

create view public.games_with_stats with (security_invoker = on) as
  select g.*, coalesce(max(s.score), 0) as best, count(s.id) as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;
```

RLS (ambas tablas con RLS activada):

| Tabla    | Política                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `games`  | `select` para `anon` y `authenticated`. Sin `insert`, `update` ni `delete`.                                                                        |
| `scores` | `select` para `anon` y `authenticated`. `insert` para `anon` y `authenticated` con `with check (game_id = 'asteroids')`. Sin `update` ni `delete`. |

Seed: los 9 juegos actuales de `app/data/games.ts` (mismos `id`, `title`, `short`, `long`, `cat`, `cover`, `color`), con `sort_order` según su posición en `GAMES`. `best` y `plays` no se siembran: se calculan.

Tipos de la capa de datos (`app/data/games.ts` conserva los tipos y `CATEGORIES`; se elimina la constante `GAMES`):

```ts
// app/data/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number; // antes fijo; ahora MAX(score), 0 si no hay partidas
  plays: number; // antes texto "12.4K"; ahora COUNT(*), formateado en la UI
}

// app/lib/games.ts  (solo servidor)
export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  createdAt: string; // ISO; la UI lo formatea "dd/mm/aaaa"
}
export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardEntry[]>;
```

Server Action:

```ts
// app/actions/scores.ts  ("use server")
export type SaveScoreResult = { ok: true } | { ok: false; error: string }; // error: texto genérico en español
export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SaveScoreResult>;
```

Reglas de `saveScore` (validación en servidor, además de los `check` de la BD):

- `gameId` debe ser `"asteroids"`; cualquier otro devuelve error.
- `name`: se recorta, se pasa a mayúsculas y debe tener entre 1 y 10 caracteres.
- `score`: entero entre 0 y 10 000 000.
- El error real solo se registra en el servidor; el usuario ve un mensaje genérico en español (misma regla que `sendContact`).

Convenciones:

- Orden del ranking: `score` descendente y, a igualdad, `created_at` ascendente (gana quien llegó antes). `rank` se calcula en la capa de datos (1..N), no se guarda.
- Solo la clave publicable (`server.ts`). Nunca `service_role`.
- Los textos de la UI van en español. Fechas `dd/mm/aaaa`, números con `es-ES`.
- Un juego sin partidas muestra `best` = 0 y `plays` = 0, y un estado vacío en el leaderboard ("AÚN NO HAY PUNTUACIONES. ¡SÉ EL PRIMERO!").

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a `cacheComponents` con datos dinámicos (`<Suspense>`), Server Actions y `generateStaticParams`/rutas dinámicas sin parámetros estáticos, y en la documentación de Supabase (`search_docs`) la guía de RLS e inserciones anónimas. Prueba manual: ninguna; el resultado es confirmar que las páginas leen de Supabase dentro de `<Suspense>` y que se puede quitar `generateStaticParams`.
2. Crear `supabase/migrations/<timestamp>_games_and_scores.sql` con las tablas, el índice, la vista, RLS y el seed, y aplicarla con `mcp__supabase__apply_migration`. Prueba manual: `mcp__supabase__list_tables` muestra `games` y `scores` con RLS; `execute_sql` devuelve 9 filas de `games_with_stats` con `plays = 0`; `mcp__supabase__get_advisors` (security) no reporta tablas sin RLS.
3. Generar `app/lib/supabase/database.types.ts` con `generate_typescript_types` y tipar `createClient` (servidor y navegador) con `Database`. Prueba manual: `npx tsc --noEmit` sin errores.
4. Crear `app/lib/games.ts` con `getGames`, `getGame` y `getLeaderboard`. Prueba manual: `npx tsc --noEmit` sin errores y una consulta directa con `execute_sql` coincide con la forma de los tipos.
5. Migrar `/biblioteca` y la home a `getGames()` (dentro de `<Suspense>`): `library-browser.tsx`, `game-card.tsx`, `home/mini-card.tsx` y `app/page.tsx` reciben `games` por props en vez de importar `GAMES`; `plays` se formatea en la UI. Prueba manual: `npm run dev`; `/` y `/biblioteca` muestran las 9 tarjetas en el mismo orden, con `best` y `plays` en 0, sin cambios visuales aparte de esos valores.
6. Migrar `/juegos/[id]` y `/juegos/[id]/jugar` a `getGame(id)` (`notFound()` si no existe) y quitar `generateStaticParams`. Prueba manual: `/juegos/asteroids` y `/juegos/caida/jugar` cargan; `/juegos/no-existe` devuelve 404.
7. Crear `app/actions/scores.ts` (`saveScore`) con la validación y el insert. Prueba manual: `npx tsc --noEmit` y `npm run lint` sin errores.
8. Conectar el modal de `GamePlayer` para `game.id === "asteroids"`: "GUARDAR PUNTUACIÓN" llama a `saveScore`, deshabilita el botón mientras guarda, muestra el error genérico si falla (permitiendo reintentar) y, si va bien, sigue el mismo flujo posterior que hoy. Los otros 8 juegos mantienen `saveScore` local a `av_scores`. Prueba manual: jugar una partida de Asteroids, guardar y comprobar la fila con `execute_sql`; un juego simulado no inserta nada.
9. Crear `app/components/leaderboard.tsx` y mostrarlo en `/juegos/[id]` con `getLeaderboard(id, 10)`, además de `best` y `plays` reales en la franja de estadísticas. Quitar `seededScores` de esta página. Prueba manual: `/juegos/asteroids` muestra la puntuación guardada en el paso 8; `/juegos/caida` muestra el estado vacío.
10. Migrar `/salon`: `app/salon/page.tsx` carga juegos y top 12 por juego con `getLeaderboard` (en paralelo) y `hall-board.tsx` los recibe por props; podio y tabla soportan menos de 3 y menos de 12 filas, con estado vacío; se elimina la fila simulada "tu posición". Prueba manual: `/salon` pestaña ASTEROIDS muestra los datos reales; las otras pestañas muestran el estado vacío; no hay errores en la consola.
11. Eliminar `GAMES` de `app/data/games.ts`, `seededScores`, `getGame` y el módulo `app/data/scores.ts` si queda vacío, y actualizar `CLAUDE.md` (esquema, `app/lib/games.ts`, RLS, flujo de guardado de Asteroids vs. simuladores, `database.types.ts`). Prueba manual: `grep -rn "seededScores\|data/scores" app` sin resultados, y `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `mcp__supabase__list_tables` muestra `games` y `scores` con RLS activada, y `mcp__supabase__get_advisors` (security) no reporta tablas sin RLS ni la vista como `security definer`.
- [ ] `supabase/migrations/` contiene el SQL de la migración y `app/lib/supabase/database.types.ts` está generado.
- [ ] `games` tiene 9 filas con los mismos `id`, `title`, `cat`, `cover` y `color` que el antiguo `GAMES`, y `/biblioteca` las muestra en el mismo orden.
- [ ] `GAMES` y `seededScores` ya no existen en el código (`grep` sin resultados) y no queda ningún import de `app/data/scores`.
- [ ] Una partida de Asteroids guardada con iniciales `abc` inserta en `scores` una fila con `game_id = 'asteroids'`, `name = 'ABC'`, el puntaje correcto y `created_at` actual.
- [ ] Tras guardar, `/juegos/asteroids` muestra esa fila en el top 10 y `plays` y `best` reflejan la partida.
- [ ] `/salon`, pestaña ASTEROIDS, muestra podio y tabla con las puntuaciones reales ordenadas por puntaje descendente y, a igualdad, por fecha ascendente.
- [ ] Con 0, 1, 2 o más de 3 puntuaciones, el podio y la tabla del Salón se muestran sin errores ni huecos rotos, y con 0 aparece el estado vacío.
- [ ] Los otros 8 juegos muestran el estado vacío en el Salón y en su detalle, con `best` = 0 y `plays` = 0.
- [ ] Jugar un juego simulado y guardar no inserta nada en `scores` (consulta `execute_sql` con el conteo antes y después).
- [ ] `saveScore` rechaza un `gameId` distinto de `asteroids`, un nombre vacío o de más de 10 caracteres y un puntaje negativo, no entero o mayor que 10 000 000, y no inserta nada en esos casos.
- [ ] Con la clave publicable, un `insert` directo con `game_id = 'caida'`, un `update` o un `delete` sobre `scores` son rechazados por RLS; un `insert` en `games` también.
- [ ] Si la inserción falla (p. ej. sin red), el modal muestra un mensaje genérico en español, no expone detalles del error y permite reintentar.
- [ ] El botón "GUARDAR PUNTUACIÓN" queda deshabilitado mientras se guarda y no genera filas duplicadas con doble clic.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404 (`notFound()`, con `<meta name="robots" content="noindex">`). El código de estado HTTP es 200 porque la respuesta se transmite dentro de `<Suspense>`.
- [ ] La clave publicable y la URL no aparecen en `.next/static` más allá de lo que ya existía; no hay `service_role` ni `sb_secret` en `app` (`grep` sin coincidencias).
- [ ] `/`, `/biblioteca`, `/juegos/asteroids`, `/juegos/asteroids/jugar`, `/salon`, `/auth` y `/acerca-de` cargan sin errores en consola ni de hidratación, a 1280 px y a 375 px sin scroll horizontal.
- [ ] `CLAUDE.md` documenta el esquema, la capa de datos y las diferencias de guardado entre Asteroids y los simuladores.

## Decisions

- **Sí:** un solo spec para `games`, `scores` y las tres pantallas que los leen. La tabla `games` es clave foránea de `scores` y las pantallas comparten la capa de datos; separarlas dejaría specs no verificables por sí solos. Es grande, por eso los pasos 5 a 10 son independientes y commiteables.
- **Sí:** tabla `games` en Supabase y que `/biblioteca` (y home, detalle y jugar) lea de ella. Decisión del usuario: "la tabla de juegos" es `/biblioteca`. Una única fuente de verdad evita que el catálogo y la clave foránea se desincronicen.
- **No:** nueva ruta `/games` ni vista de tabla alternativa en `/biblioteca`. No se pidió; la UI de tarjetas no cambia.
- **Sí:** `best` y `plays` calculados con la vista `games_with_stats` (`security_invoker = on`). Evita columnas duplicadas que se desincronizan; el volumen es pequeño. Si crece, se reemplaza por una tabla de agregados en otro spec.
- **No:** guardar `best` y `plays` como columnas de `games`. Habría que actualizarlas en cada inserción y arriesgar inconsistencias.
- **Sí:** `scores` en Supabase como única escritura de Asteroids. Decisión del usuario: se ignora lo que haya en `av_scores`.
- **No:** migrar `av_scores` antiguos. No hay identidad verificada ni forma de validar esos datos, y subirlos permitiría inflar el ranking con valores arbitrarios.
- **Sí:** identificación anónima por iniciales (máx. 10), como el modal actual. Es lo único posible sin Auth; `user_id` llega con el spec de Auth.
- **Sí:** RLS que solo permite `insert` con `game_id = 'asteroids'`, sin `update` ni `delete`. Aplica el alcance en la BD y no solo en la interfaz; cada juego real futuro añade su `id` a la política con su migración.
- **Sí:** `saveScore` como Server Action con validación en servidor, además de los `check` de la tabla. Sigue el patrón de `sendContact` y mantiene el error real fuera del cliente.
- **No:** insertar directamente desde el navegador con `client.ts`. La Server Action centraliza la validación y evita exponer lógica de guardado en un Client Component.
- **Sí:** los 8 juegos simulados conservan su guardado en `localStorage`. Sus puntajes son aleatorios y rankearlos en la base de datos contaminaría el leaderboard.
- **Sí:** leaderboard por juego solo en `/juegos/[id]`, no en `/juegos/[id]/jugar`. Decisión del usuario; evita ocupar espacio en el marco CRT.
- **Sí:** lecturas dinámicas dentro de `<Suspense>` con el cliente de servidor existente, y quitar `generateStaticParams`. Sin caché es lo más simple y `cacheComponents` obliga a aislar lo dinámico; cachear con etiquetas va en otro spec cuando haya tráfico real.
- **No:** forzar un 404 HTTP real en `/juegos/[id]`. Obligaría a resolver `params` y la lectura fuera de `<Suspense>` y a bloquear el esqueleto en cada visita. Se acepta 200 con la página 404 y `noindex`, que ya era el comportamiento antes de este spec.
- **No:** `generateStaticParams` consultando Supabase en el build. Acopla el build a la red y a los datos.
- **Sí:** desempate del ranking por `created_at` ascendente. Es determinista y premia llegar primero.
- **Sí:** quitar la fila simulada "tu posición" del Salón. Sin identidad verificada no hay forma honesta de calcularla.
- **Sí:** migración versionada en `supabase/migrations/` y aplicada con el MCP. La spec 04 dejó las migraciones para el primer spec con tablas; este es ese spec.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y respetar `CLAUDE.md` (incluido `/frontend-design` para el componente de leaderboard y los estados vacíos).

## Risks

| Riesgo                                                                                                                 | Mitigación                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin Auth, cualquiera puede insertar un puntaje falso (por la API REST con la clave publicable, o llamando a la acción) | Aceptado y documentado. RLS limita el daño (solo `insert` de `asteroids`, rangos en `check`). Antitrampas y `user_id` van en specs posteriores.         |
| Spam de inserciones (sin rate limiting)                                                                                | Fuera de alcance. Los `check` limitan tamaño y rango; se revisa con `get_advisors` y se aborda con Auth o un límite en otro spec.                       |
| La vista `games_with_stats` se ejecuta como `security definer` por defecto y se salta RLS                              | Se crea con `security_invoker = on` y el criterio de aceptación comprueba `get_advisors`.                                                               |
| `cookies()` del cliente de servidor bajo `cacheComponents` falla si se usa fuera de `<Suspense>`                       | El paso 1 lo revisa; todas las lecturas van dentro de `<Suspense>` con fallback, como ya hace `/juegos/[id]`.                                           |
| Quitar `generateStaticParams` y leer de BD ralentiza el detalle                                                        | El volumen es de 9 juegos y consultas indexadas; se mide en el paso 9 y, si hace falta, el cache va en otro spec.                                       |
| Doble clic en "GUARDAR" duplica filas                                                                                  | El botón se deshabilita mientras guarda y se prueba en los criterios de aceptación.                                                                     |
| Proyecto Supabase pausado o sin red deja `/biblioteca` y `/` sin datos                                                 | Cada página maneja el error de lectura con un mensaje en español en vez de romper; se revisa el estado del proyecto con el MCP antes de depurar código. |
| Tipos generados desactualizados tras cambiar el esquema                                                                | Se regeneran en cada migración futura; `tsc` en CI local los detecta al compilar.                                                                       |
| Duplicado `rocas` / `asteroids` en `games` confunde en la biblioteca y el Salón                                        | Deuda conocida de la spec 05; se migra tal cual y se resuelve en otro spec.                                                                             |
| Se pierden los puntajes simulados guardados antes en `localStorage`                                                    | Esperado: eran del simulador y de un solo navegador; los guardados de Asteroids antes de esta spec también se ignoran por decisión explícita.           |

## What is **not** in this spec

- Supabase Auth, `proxy.ts`, `user_id` o identidad verificada.
- Guardar o rankear puntajes de los 8 juegos simulados.
- Migrar los `av_scores` existentes en `localStorage`.
- Antitrampas, rate limiting o validación de la partida.
- Leaderboard en `/juegos/[id]/jugar` o fila "tu posición" en el Salón.
- Vista de tabla nueva o ruta `/games`.
- Datos reales para `RECENT_SCORES` y `TOP_PLAYERS` de la home.
- Cache con etiquetas, Realtime, paginación o filtros por fecha.
- Resolver el duplicado `rocas` / `asteroids`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
