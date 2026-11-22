---
name: new-game
description: Genera la spec para añadir un juego real a Arcade Vault (motor canvas en TypeScript, integración en GamePlayer, fila en la tabla games, política RLS de scores y leaderboard), partiendo o no de un juego de references/started-games/. Solo escribe la spec; la implementación se hace luego con /spec-impl.
disable-model-invocation: true
argument-hint: "carpeta de references/started-games (p. ej. 03-tetris) o descripción del juego"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*), Bash(grep:*)
---

# /new-game — Spec de un juego real con leaderboard

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay juegos de referencia"`

Motores de juegos reales ya implementados (`app/games/`):
!`ls app/games/ 2>/dev/null || echo "Ninguno"`

Juegos reales que pueden guardar puntuación hoy:
!`grep -n "REAL_GAME_IDS = " app/actions/scores.ts 2>/dev/null || echo "No se encontró REAL_GAME_IDS"`

Migraciones de Supabase:
!`ls supabase/migrations/ 2>/dev/null || echo "No hay migraciones"`

---

Esta skill produce **una spec** (`specs/NN-<slug>.md`) para convertir un juego en un juego real de la plataforma: motor propio, integrado en `GamePlayer`, con su puntuación guardada en Supabase y visible en el leaderboard de `/juegos/[id]` y en `/salon`. **No escribes código, SQL ni CSS aquí.** La spec es el contrato que después ejecuta `/spec-impl`.

Las specs 05 (Asteroids) y 06 (tablas `games` y `scores`) ya resolvieron cómo se hace esto para el primer juego. Tu trabajo es aplicar ese mismo patrón al juego nuevo, preguntar lo que cambia y no reabrir lo que ya está decidido.

Archivos de apoyo de esta skill (léelos siempre):

- `template.md`: estructura de la spec, con lo fijo ya rellenado y huecos `<...>`.
- `checklist.md`: todos los puntos de integración y la traducción de un `game.js` global a un motor modular. Ninguno puede faltar en la spec.

Esta skill **se apoya en la skill `/spec`** para el método y el formato de las especificaciones. Sus archivos son la referencia base:

- `.claude/skills/spec/SKILL.md`: método spec-driven, fases, tono, reglas de guardado y el archivo de configuración.
- `.claude/skills/spec/template.md`: estructura base de toda spec del proyecto.

(`.claude/skills/spec` es un enlace a `.agents/skills/spec`; si la ruta de `.claude` no existe, usa la de `.agents`. Si ninguna existe, avisa al usuario de que `/spec` no está instalada y continúa solo con `template.md` y `checklist.md` de esta skill.)

`template.md` y `checklist.md` de `/new-game` **añaden** lo específico de un juego real encima del método de `/spec`. Si hay conflicto en la estructura o las reglas generales de guardado, manda `/spec`; si es sobre contenido propio de un juego (motor, `GamePlayer`, RLS, leaderboard), mandan los de `/new-game`.

Responde siempre en el idioma del prompt inicial (normalmente español, como las specs del repo).

## Fase 1 — Contexto del proyecto

0. **Lee `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` completos**, antes de cualquier otra cosa. Sigue sus fases, su tono y sus reglas generales (preguntas en bloques, nada de código, no inventar decisiones, spec por secciones solo si falta información).
1. Lee `CLAUDE.md` (sobre todo las secciones "Supabase" y "Real games") y `references/implemented-games.md` (juegos existentes, sus specs y el siguiente `sort_order`).
2. Lee `specs/05-asteroids-juego-real.md` y `specs/06-leaderboard-y-tabla-games.md`, y la spec más reciente de `specs/` para copiar convenciones (idioma, títulos de sección, palabra de estado).
3. Lee la implementación de referencia actual:
   - `app/games/asteroids/engine.ts` (forma de `createAsteroids`, callbacks, `pause`/`resume`/`destroy`) y `app/games/asteroids/input.ts`.
   - `app/components/asteroids-canvas.tsx` (`runId`, `paused`, callbacks en `ref`).
   - `app/games/registry.ts` (`REAL_GAMES`, `RealCanvasProps`, `hud`) y `app/components/game-player.tsx` (barra HUD, `handleSave`).
   - `app/actions/scores.ts` (`REAL_GAME_IDS`, límites de nombre y puntaje).
   - La migración más reciente de `supabase/migrations/` (política `scores_insert_*` vigente y datos de `games`).
4. El registro de motores ya existe: la spec solo añade la entrada `<id>` a `REAL_GAMES` y `GamePlayer` no cambia, salvo que el juego necesite algo que el contrato común no cubre (en ese caso, va en la spec como cambio explícito).

## Fase 2 — Origen del juego

Mira `$ARGUMENTS`:

- **Si nombra una carpeta de `references/started-games/`** (p. ej. `03-tetris` o `tetris`): lee todos sus archivos de texto (`game.js`, `index.html`, `style.css`, `README.md`, `CLAUDE.md`, `levels.js`, `assets/*.js`) y lista `assets/` (imágenes y sonidos). Usa `wc -l` para dimensionar. Extrae y anota:
  - Variables globales, accesos a `document`/`window`, listeners sin limpiar, bucle (`requestAnimationFrame`, `setInterval`), auto-arranque y reinicio (tecla, overlay).
  - HUD y overlays que dibuja el canvas (puntuación, vidas, nivel, líneas, "GAME OVER", "PAUSA", siguiente pieza…), y qué hay en el HTML/CSS fuera del canvas.
  - Reglas con sus **valores reales** (puntos, velocidades, vidas, niveles, tamaños, temporizadores). No los redondees ni los inventes: van a la tabla "Reglas que se conservan".
  - Tamaño del canvas, controles, assets (sprites, sonidos) y cómo se cargan.
  - Puntuación máxima razonable (para comprobar el `check` de 0..10 000 000).
- **Si es una descripción** (no hay referencia): el juego se diseña desde cero. Pregunta en la Fase 3 las reglas, controles, puntuación, condición de fin y HUD. No inventes reglas: lo que no confirme el usuario no entra en la spec.
- **Si está vacío**: pregunta qué juego es (carpeta de referencia o una frase de descripción).

## Fase 3 — Preguntas

Pregunta en bloques de 3 a 4 con `AskUserQuestion`, con la recomendación primero y marcada "(Recomendado)". Espera la respuesta antes del siguiente bloque. No preguntes lo que ya está decidido en las specs 05 y 06 ni lo que respondió el usuario.

Temas que siempre hay que cerrar:

1. **Datos de la entrada en `games`** (siempre una fila nueva). `id` (slug), `title`, `short`, `long`, `cat` (`ARCADE`|`PUZZLE`|`SHOOTER`|`VERSUS`), `color` (`cyan`|`magenta`|`yellow`|`green`), clase `cover` y `sort_order` (el siguiente al de `references/implemented-games.md`). Comprueba que el `id` y el título no choquen con un juego existente. Propón textos en español, con títulos propios (el catálogo no usa nombres comerciales de juegos existentes).
2. **HUD y callbacks.** `onScore` y `onGameOver` son obligatorios. ¿Qué más muestra la barra de la plataforma (vidas, nivel, líneas…)? Si el juego no tiene vidas o nivel, ¿se oculta esa casilla o se reemplaza por otra? Esto define la interfaz de callbacks del motor y el HUD de `GamePlayer`.
3. **Assets y sonido.** Si la referencia trae sprites o sonidos: ¿se copian a `public/games/<id>/` o se dibuja todo con primitivas del canvas? ¿El sonido entra o queda fuera (como en la spec 05)?
4. **Controles y canvas.** Solo teclado (por defecto), tamaño interno del canvas (el de la referencia) y proporción para escalar por CSS.
5. **Cambios respecto al original.** Además de los fijos (ver `checklist.md`), ¿algún cambio de reglas, dificultad o aspecto? Por defecto, ninguno.

Deja de preguntar cuando puedas responder sin suponer nada:

1. Qué archivos aparecen o cambian (todos los de `checklist.md` que apliquen).
2. Cuál es el primer paso ejecutable y cuál el último.
3. Cómo se verifica que está terminado.

Si el usuario pide saltarse las preguntas, recuerda que una spec vaga se paga en código. Si insiste, respétalo y anótalo en Decisiones ("Definición rápida sin aclaración detallada").

Si aparece algo que abre otro frente (multijugador, controles táctiles, Auth, antitrampas, rediseño del leaderboard), señálalo y propón dejarlo fuera de esta spec.

## Fase 4 — Escribir y guardar la spec

0. **Antes de crear el archivo, vuelve a leer `.claude/skills/spec/SKILL.md` (Fases 3 y 4) y `.claude/skills/spec/template.md`** y comprueba que la spec cumple su estructura, el orden de secciones y sus reglas de guardado. Después aplica `template.md` de `/new-game` encima. No avances hasta haberlos leído.
1. Rellena `template.md` (el de `/new-game`) entero: sustituye todos los `<...>` y borra las secciones o filas marcadas como condicionales que no apliquen. No queda ningún `<...>` en el archivo final.
2. Recorre `checklist.md` y comprueba que cada punto aplicable aparece en el Scope, en el plan y en los criterios de aceptación.
3. Número: el mayor de `specs/` + 1, con dos dígitos. Slug en kebab-case, p. ej. `07-tetris-juego-real`.
4. Fecha: la del contexto de la sesión. Estado: `Borrador` (como pide `/spec`, nunca `Aprobado` automáticamente). Dependencias: `SPEC 05, SPEC 06` y cualquier otra que aplique (comprueba que existen).
5. Escribe `specs/NN-slug.md` sin pedir permiso (solo pregunta si el archivo ya existe).
   5b. Si `specs/.spec-config.yml` no existe, créalo con el contenido por defecto que indica `/spec` en su Fase 4; si existe, no lo toques.
6. Confirma al usuario:
   - Ruta del archivo.
   - Que está en `Borrador` y que la marque como `Aprobado` tras releerla.
   - Siguiente paso: `/spec-impl NN-slug`.
   - **Para aquí.** No propongas implementarla.

## Reglas duras

- **No escribes código, SQL, CSS ni migraciones.** Solo el `.md` de la spec. Los fragmentos de SQL y TypeScript de la spec son esquema y firmas, no la implementación completa (igual que las specs 05 y 06).
- **No inventes reglas del juego.** Con referencia, salen del código; sin referencia, las confirma el usuario.
- **No recrees un juego comercial concreto** (nombre, personajes, arte, música o niveles reconocibles). Una mecánica de género sí; el título y el aspecto son propios de Arcade Vault.
- **Nunca `service_role` ni la clave secreta.** El guardado sigue siendo `saveScore` con la clave publicable.
- **No reabras decisiones de las specs 05 y 06** (forma `createXxx(canvas, callbacks)`, `runId`/`paused`, guardado por Server Action, RLS por lista de ids, lecturas dentro de `<Suspense>`) salvo que el usuario lo pida.
- **Un juego por spec.** Si piden varios, propón una spec por juego.
