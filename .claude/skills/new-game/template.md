# SPEC <NN> — <Título>: juego real con leaderboard

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06<, otras>
> **Date:** <fecha del contexto>
> **Objective:** <Una frase: portar/crear <juego> como motor TypeScript con canvas, jugable en `/juegos/<id>/jugar`, con su puntuación guardada en Supabase y visible en el leaderboard.>

## Por qué existe este spec

<Origen del juego (carpeta `references/started-games/NN-x/` y su tamaño, o diseño nuevo). Qué problemas tiene la forma actual para Next.js (globales, `document`, listeners, auto-arranque, overlays).>

## Scope

**In:**

- Entrada nueva `<id>` en `games` (`sort_order` <N>) mediante la migración `supabase/migrations/<timestamp>_<id>.sql`, que también amplía la política de insert de `scores` a `<id>`.
- `<id>` en `REAL_GAME_IDS` de `app/actions/scores.ts`, y `database.types.ts` regenerado.
- Motor en `app/games/<id>/`, <portado de `game.js` | diseñado desde cero> en TypeScript estricto, sin globales y sin acceso a `document`.
- API del motor: `create<Name>(canvas, callbacks)` que devuelve `{ pause, resume, destroy }`.
- Componente cliente `app/components/<id>-canvas.tsx` con un `<canvas>` de <W>×<H>.
- Entrada `<id>` en `REAL_GAMES` de `app/games/registry.ts` con su `hud`; `GamePlayer` no cambia.
- Barra de la plataforma (<Jugador, Puntuación, …>) alimentada por los callbacks del motor.
- PAUSA, FIN, modal "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" con `saveScore` y "JUGAR DE NUEVO" con `runId`, como Asteroids.
- Clase `.cover-<id>` en `app/globals.css` <si aplica> y escalado del canvas en el marco CRT.
- <Condicional: assets en `public/games/<id>/`.>
- Añadir la fila del juego a `references/implemented-games.md` (y tocar `CLAUDE.md` solo si cambia el contrato común de los juegos).

**Out of scope (para futuros specs):**

- <Sonido y música | …>
- Controles táctiles o gamepad.
- <Cambios de dificultad, contenido nuevo, rediseño visual del canvas.>
- Auth, `user_id`, antitrampas y rate limiting (ver spec 06).
- Cambios en `app/lib/games.ts`, `leaderboard.tsx`, `hall-board.tsx` o `/salon`: el juego aparece por tener fila en `games`.
- Tests automatizados (no hay runner configurado).

## Data model

Catálogo (migración; se muestra el esquema, no el SQL completo):

```sql
-- supabase/migrations/<timestamp>_<id>.sql
<insert into public.games (id, title, short, long, cat, cover, color, sort_order) values ('<id>', '<TÍTULO>', '<short>', '<long>', '<CAT>', 'cover-<id>', '<color>', <n>);
 | update public.games set title = …, short = …, long = …, cover = … where id = '<id>';>

drop policy "<política de insert vigente>" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', <…>, '<id>'));
```

API del motor:

```ts
// app/games/<id>/engine.ts
export interface <Name>Callbacks {
  onScore: (score: number) => void; // al cambiar la puntuación
  <onLives / onLevel / onLines …: (n: number) => void; // cuándo se emite>
  onGameOver: () => void; // una sola vez
}

export interface <Name>Handle {
  pause: () => void;
  resume: () => void; // reinicia la marca de tiempo
  destroy: () => void; // cancela el rAF/temporizadores y quita los listeners
}

export function create<Name>(
  canvas: HTMLCanvasElement,
  callbacks: <Name>Callbacks,
): <Name>Handle;
```

Props del componente:

```ts
// app/components/<id>-canvas.tsx  ("use client")
// usa RealCanvasProps de app/games/registry.ts
interface RealCanvasProps {
  runId: number;
  paused: boolean;
  onScore: (n: number) => void;
  <…>
  onGameOver: () => void;
}
```

Entrada en el registro:

```ts
// app/games/registry.ts
<id>: { Canvas: <Name>Canvas, hud: { lives: <true|false>, level: <true|false> } },
```

Módulos del motor (todos en `app/games/<id>/`):

| Archivo        | Contenido                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `constants.ts` | <constantes con los mismos valores que la referencia>                                                        |
| `input.ts`     | `createInput()` con `attach()`/`detach()`, `preventDefault` fuera de `input`/`textarea` y limpieza en `blur` |
| `<…>.ts`       | <entidades, tablero, piezas, niveles…>                                                                       |
| `engine.ts`    | estado, `update`, `draw`, bucle y `create<Name>`                                                             |

Reglas de juego que se conservan tal cual:

| Regla | Valor                                                     |
| ----- | --------------------------------------------------------- |
| <…>   | <valor real de la referencia o confirmado por el usuario> |

Cambios de comportamiento respecto al original (únicos):

- El motor no se reinicia solo; el reinicio lo hace React (`runId`).
- Sin overlay de fin en el canvas; en game over el motor deja de leer teclas.
- <Pausa propia del juego eliminada o redirigida a `paused`.>
- Entidades y funciones reciben `ctx` e `input` por parámetro.
- `input` limpia teclas en `blur` y hace `preventDefault` en las teclas del juego fuera de `input`/`textarea`.
- <otros confirmados>

Convenciones:

- `dt` en segundos con tope de 0,05 s<, o el modelo de tiempo del juego>.
- Callbacks solo cuando el valor cambia.
- Textos de la UI en español.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y efectos, y repasar `CLAUDE.md` y las specs 05 y 06. Prueba manual: ninguna.
2. Crear `supabase/migrations/<timestamp>_<id>.sql` (fila en `games` y política ampliada) y aplicarla con `mcp__supabase__apply_migration`; regenerar `app/lib/supabase/database.types.ts`; añadir `<id>` a `REAL_GAME_IDS`. Prueba manual: `execute_sql` muestra la fila en `games_with_stats`; `get_advisors` (security) sin avisos nuevos; `/biblioteca` y `/juegos/<id>` muestran el juego; `npx tsc --noEmit` sin errores.
3. Crear `app/games/<id>/constants.ts` e `input.ts`. Prueba manual: `npx tsc --noEmit`.
4. <Crear los módulos de entidades/tablero.> Prueba manual: `npx tsc --noEmit`.
5. Crear `app/games/<id>/engine.ts` con `create<Name>` y los callbacks. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
6. Crear `app/components/<id>-canvas.tsx`. Prueba manual: `npx tsc --noEmit` y `npm run lint`.
7. Añadir `<id>` a `REAL_GAMES` en `app/games/registry.ts`. Prueba manual: `npx tsc --noEmit`.
8. Probar `<id>` en `GamePlayer` (canvas, HUD, pausa, fin, guardado, reinicio). Prueba manual: `/juegos/<id>/jugar` muestra el juego real y otro juego real sigue funcionando igual.
9. Cover `.cover-<id>` (con `/frontend-design`) y escalado del canvas en `.crt-screen`. Prueba manual: 1280 px y 375 px sin deformar ni scroll horizontal.
10. Recorrido completo con Playwright MCP (capturas en `.playwright-screenshots/`): reglas, pausa, FIN, guardado en Supabase, leaderboard en `/juegos/<id>` y `/salon`, reinicio y salida. Corregir lo que falle.
11. Añadir la fila del juego a `references/implemented-games.md`. Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene la migración y `games` tiene la fila `<id>` con los datos acordados; `database.types.ts` está regenerado.
- [ ] Con la clave publicable, un `insert` en `scores` con `game_id = '<id>'` se acepta, y un `update` o un `delete` se rechaza. `get_advisors` (security) no reporta avisos nuevos.
- [ ] `/juegos/<id>/jugar` muestra un `<canvas>` de <W>×<H> <estado inicial esperado>, sin errores en consola.
- [ ] <Un criterio verificable por cada regla de la tabla y cada control.>
- [ ] La barra de la plataforma muestra <…> con los mismos valores que el juego y se actualiza al cambiar.
- [ ] Las teclas del juego no hacen scroll en la página.
- [ ] PAUSA congela el juego y REANUDAR continúa sin salto.
- [ ] FIN y la condición de fin abren el modal "FIN DEL JUEGO" con el puntaje correcto, sin overlay en el canvas; escribir las iniciales no afecta al juego.
- [ ] Guardar con iniciales `abc` inserta en `scores` una fila con `game_id = '<id>'`, `name = 'ABC'` y el puntaje correcto; aparece en el top 10 de `/juegos/<id>` y en la pestaña del juego en `/salon`, y `best` y `plays` la reflejan.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia.
- [ ] Salir de la ruta no deja `requestAnimationFrame`, temporizadores ni listeners; en Strict Mode hay un solo motor.
- [ ] Los demás juegos reales siguen funcionando y guardando igual que antes.
- [ ] A 1280 px y 375 px el canvas se ve completo, sin deformarse y sin scroll horizontal; sin errores de hidratación.
- [ ] `references/implemented-games.md` tiene la fila del juego con su spec; `CLAUDE.md` solo cambia si cambió el contrato común.

## Decisions

- **Sí:** misma forma que Asteroids (`create<Name>(canvas, callbacks)`, `runId`, `paused`, callbacks en `ref`). Decidida en la spec 05.
- **Sí:** guardado con `saveScore` y RLS por lista de ids. Decidido en la spec 06; cada juego real amplía la lista.
- **Sí/No:** <HUD y callbacks elegidos.>
- **Sí/No:** <assets y sonido.>
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y usar `/frontend-design` para la cover y el ajuste del marco CRT.

## Risks

| Riesgo                                                                                                      | Mitigación                                                                        |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Strict Mode monta el motor dos veces                                                                        | `destroy` cancela rAF/temporizadores y hace `detach`; se comprueba en desarrollo. |
| El nombre de la migración no coincide con la versión remota                                                 | Comprobar con `list_migrations` tras `apply_migration` y renombrar el archivo.    |
| Olvidar `REAL_GAME_IDS` o la política RLS                                                                   | El criterio de guardado falla; ambos van en el mismo paso.                        |
| <Puntajes del juego superan 10 000 000>                                                                     | <Mitigación o "no aplica" justificado.>                                           |
| <Riesgos propios del juego (assets que cargan tarde, `setInterval` del original, teclas de pausa propias…)> | <…>                                                                               |

## What is **not** in this spec

- <Lista corta coherente con "Out of scope".>

Cada uno de estos puntos, si se aborda, va en su propio spec.
