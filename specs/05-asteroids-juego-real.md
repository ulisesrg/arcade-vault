# SPEC 05 — Asteroids: primer juego real en la plataforma

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-19
> **Objective:** Portar el juego `references/started-games/02-asteroids/` a un motor TypeScript con canvas y publicarlo como la entrada nueva `asteroids` del catálogo, jugable en `/juegos/asteroids/jugar` dentro del `GamePlayer` existente, con pausa, fin de partida y guardado de puntuación reales.

## Por qué existe este spec

Hasta ahora `GamePlayer` (`app/components/game-player.tsx`) es un simulador: el puntaje sube con `Math.random()` y la arena son divs decorativos. Asteroids es el primer juego con código real, y su forma actual no encaja en Next.js: `game.js` son 510 líneas de JS global que leen `document.getElementById('canvas')`, escuchan `window` sin limpiar, arrancan solos y no avisan al exterior cuando termina. Este spec define cómo se porta a un módulo con ciclo de vida (`create` / `destroy`) y callbacks hacia React. Esa forma es la que reutilizarán los siguientes juegos (`03-tetris`, `04-arkanoid`), así que se decide aquí.

## Scope

**In:**

- Nueva entrada `asteroids` en `app/data/games.ts` y nueva clase `.cover-asteroids` en `app/globals.css`.
- Motor del juego en `app/games/asteroids/`, portado de `game.js` a TypeScript estricto, sin variables globales y sin acceso a `document`.
- API del motor: `createAsteroids(canvas, callbacks)` que devuelve `{ pause, resume, destroy }`.
- Componente cliente `app/components/asteroids-canvas.tsx` que monta el motor en un `<canvas>` de 800×600 y lo destruye al desmontar.
- `GamePlayer` elige el comportamiento por `game.id`: para `asteroids` usa el motor real; para los otros 8 juegos sigue el simulador actual sin cambios.
- Barra superior de la plataforma completa (Jugador, Puntuación, Vidas, Nivel) alimentada por los callbacks del motor, además del HUD que el juego dibuja en el canvas.
- Botones PAUSA y FIN conectados al motor. FIN termina la partida con el puntaje actual.
- Fin de partida (0 vidas): el motor avisa con `onGameOver()`, se abre el modal "FIN DEL JUEGO" existente y "GUARDAR PUNTUACIÓN" escribe en `av_scores` con `game: "asteroids"`.
- "JUGAR DE NUEVO" reinicia una partida limpia.
- El canvas se escala por CSS al ancho del marco CRT conservando la proporción 4:3.
- Se quita del canvas únicamente el overlay "GAME OVER — ESPACIO PARA REINICIAR" (lo sustituye el modal).
- Actualizar `CLAUDE.md` con la arquitectura de juegos reales.

**Out of scope (para futuros specs):**

- Cambiar la entrada mock `rocas`: queda intacta en el catálogo como deuda conocida (mismo concepto que `asteroids`). Decidir si se elimina o se redirige va en otro spec.
- Supabase: guardar o leer puntuaciones remotas. `av_scores` sigue en `localStorage`, como dice la spec 04.
- Leer `av_scores` en el Salón de la Fama o en el detalle. Hoy solo se escribe, y eso no cambia.
- Controles táctiles o gamepad. El juego es solo teclado.
- Recolorear el canvas a neón o rediseñar los sprites. Se conserva el look vectorial blanco sobre negro, con el power-up en cian.
- Sonido y música.
- Ajustar la dificultad, añadir OVNIs, nuevos power-ups o más niveles de contenido.
- Portar `03-tetris` y `04-arkanoid`, o convertir los otros 8 juegos a reales.
- Resolución adaptativa o `devicePixelRatio`: el canvas es de 800×600 fijos.
- Tests automatizados (no hay runner configurado).

## Data model

Entrada nueva del catálogo (los textos son una propuesta a revisar):

```ts
// app/data/games.ts  (se añade al final de GAMES)
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Destroza el campo de asteroides sin chocar.",
  long: "Pilota una nave en un espacio sin bordes: lo que sale por un lado entra por el otro. Dispara a los asteroides grandes para partirlos en medianos y pequeños, recoge el power-up 3x para disparar en abanico y sobrevive con tus 3 vidas.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

API del motor:

```ts
// app/games/asteroids/engine.ts
export interface AsteroidsCallbacks {
  onScore: (score: number) => void; // al cambiar la puntuación
  onLives: (lives: number) => void; // al perder una vida (y al iniciar)
  onLevel: (level: number) => void; // al pasar de nivel (y al iniciar)
  onGameOver: () => void; // una sola vez, al quedarse sin vidas
}

export interface AsteroidsHandle {
  pause: () => void;
  resume: () => void;
  destroy: () => void; // cancela el rAF y quita los listeners
}

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsHandle;
```

Props del componente de React:

```ts
// app/components/asteroids-canvas.tsx  ("use client")
interface AsteroidsCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  onScore: (n: number) => void;
  onLives: (n: number) => void;
  onLevel: (n: number) => void;
  onGameOver: () => void;
}
```

Estado interno del motor (privado a `createAsteroids`, sin exportar):

```ts
type Phase = "playing" | "dead" | "gameover";
// ship, bullets, asteroids, particles, powerUps, score, lives, level,
// phase, deadTimer, powerUpSpawned, killsSinceSpawn, paused, destroyed
```

Módulos del motor (todos en `app/games/asteroids/`):

| Archivo        | Contenido                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `constants.ts` | `W = 800`, `H = 600`, `RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD` y las demás constantes de `game.js` con los mismos valores |
| `input.ts`     | `createInput()`: `keys`, `pressed(code)`, `attach()` / `detach()` sobre `window`, y limpieza de teclas en `blur`                           |
| `entities.ts`  | `Bullet`, `Asteroid`, `PowerUp`, `Particle`, con `draw(ctx)` recibiendo el contexto como parámetro                                         |
| `ship.ts`      | `Ship`, con `update(dt, input)` y `draw(ctx)`                                                                                              |
| `engine.ts`    | estado, `update`, `draw`, bucle con `requestAnimationFrame` y `createAsteroids`                                                            |

Reglas de juego que se conservan tal cual de `game.js`:

| Regla                        | Valor                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Asteroides por nivel         | 4 en el nivel 1; `3 + nivel` desde el 2                                                              |
| Puntos por asteroide         | grande 20, mediano 50, pequeño 100                                                                   |
| Vidas                        | 3                                                                                                    |
| Invencibilidad al reaparecer | 3 s con parpadeo                                                                                     |
| Espera tras morir            | 2 s                                                                                                  |
| Disparo                      | 1 bala, recarga 0,2 s; con power-up, abanico de 3                                                    |
| Power-up `3x`                | dura 5 s, aparece con 15 % por asteroide destruido o garantizado a los 5, un solo power-up por nivel |
| Espacio toroidal             | todos los objetos salen por un borde y entran por el opuesto                                         |

Cambios de comportamiento respecto a `game.js` (únicos):

- El motor no se reinicia solo con Espacio; el reinicio lo hace React (`runId`).
- En `gameover` el motor deja de leer teclas y no dibuja el overlay.
- `Ship.update` y las entidades reciben `ctx` e `input` por parámetro, en vez de globales.
- `input` limpia las teclas pulsadas al perder el foco de la ventana, para evitar la nave bloqueada en propulsión.
- `keydown` de Espacio y flechas llama a `preventDefault()` salvo cuando el foco está en un `input` o `textarea`, para que la página no haga scroll.

Registro de puntuación (sin cambios en el esquema existente):

```ts
// app/components/game-player.tsx — SavedScore ya existente
{ game: "asteroids", score: number, name: string, at: number }
```

Convenciones:

- Coordenadas con origen arriba a la izquierda; velocidades en píxeles por segundo; `dt` en segundos con tope de 0,05 s (igual que `game.js`).
- Los callbacks se invocan solo cuando el valor cambia, no en cada frame.
- Los textos de la UI van en español.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` la guía de Client Components y de efectos en el navegador (`useEffect`, `cacheComponents`) y repasar `CLAUDE.md`. Prueba manual: ninguna; el resultado es confirmar que un Client Component con `<canvas>` bajo `Suspense` en `jugar/page.tsx` no necesita cambios en la ruta.
2. Añadir la entrada `asteroids` a `app/data/games.ts` y la clase `.cover-asteroids` (fondo oscuro con un polígono de asteroide y una nave en CSS, al estilo de `.cover-rocas`) a `app/globals.css`. Prueba manual: `npm run dev`; `/biblioteca` muestra la tarjeta ASTEROIDS, `/juegos/asteroids` carga el detalle y `/juegos/asteroids/jugar` abre el simulador actual sin errores.
3. Crear `app/games/asteroids/constants.ts` y `input.ts`. Prueba manual: `npx tsc --noEmit` sin errores.
4. Crear `app/games/asteroids/entities.ts` con `Bullet`, `Asteroid`, `PowerUp` y `Particle`. Prueba manual: `npx tsc --noEmit` sin errores.
5. Crear `app/games/asteroids/ship.ts` con `Ship`. Prueba manual: `npx tsc --noEmit` sin errores.
6. Crear `app/games/asteroids/engine.ts` con `createAsteroids`: estado, `update`, `draw` (con HUD del canvas, sin overlay de fin), bucle, `pause`, `resume`, `destroy` y los cuatro callbacks. `resume` reinicia la marca de tiempo para evitar un salto de `dt`. Prueba manual: `npx tsc --noEmit` y `npm run lint` sin errores.
7. Crear `app/components/asteroids-canvas.tsx`: `<canvas width={800} height={600}>`, un `useEffect` que llama a `createAsteroids` y devuelve `destroy` como limpieza (dependencia `runId`), y otro efecto que llama a `pause` o `resume` según `paused`. Los callbacks se guardan en una `ref` para no recrear el motor al cambiar. Prueba manual: `npx tsc --noEmit` y `npm run lint` sin errores.
8. Conectar `GamePlayer` para `game.id === "asteroids"`: renderizar `AsteroidsCanvas` en lugar de la arena decorativa, desactivar el intervalo de puntaje aleatorio y el efecto de nivel simulado, alimentar `score`, `lives` y `level` desde los callbacks, pasar `paused={paused || over}`, usar `onGameOver` para `setOver(true)` y que "JUGAR DE NUEVO" incremente `runId`. Los otros juegos siguen igual. Prueba manual: `/juegos/asteroids/jugar` muestra el juego real y `/juegos/caida/jugar` sigue con el simulador.
9. Ajustar el CSS de `.crt-screen` para que el canvas ocupe el ancho disponible conservando 4:3 (`width: 100%; height: auto`) sin romper la arena de los otros juegos. Prueba manual: a 1280 px y a 375 px el canvas se ve completo, sin scroll horizontal y sin deformarse.
10. Pasar el recorrido completo de juego en el navegador (con Playwright MCP, capturas en `.playwright-screenshots/`): controles, colisiones, power-up, pausa, FIN, guardado y reinicio. Corregir lo que falle. Prueba manual: ver criterios de aceptación.
11. Actualizar `CLAUDE.md` con la forma de los juegos reales (`app/games/<id>/`, `createXxx(canvas, callbacks)`, `runId` y `paused` en el componente) y la excepción por `game.id` en `GamePlayer`. Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] La biblioteca muestra una tarjeta ASTEROIDS (categoría SHOOTER, cover propia) y `/juegos/asteroids` carga su detalle. La entrada `rocas` sigue igual que antes.
- [ ] `/juegos/asteroids/jugar` muestra un `<canvas>` de 800×600 con la nave en el centro, 4 asteroides y el HUD del canvas, sin errores en la consola.
- [ ] ← y → rotan la nave, ↑ propulsa con llama visible y Espacio dispara una sola bala por pulsación, con 0,2 s de recarga.
- [ ] Al pulsar Espacio o las flechas con el juego en foco, la página no hace scroll.
- [ ] Un objeto que sale por un borde del canvas entra por el borde opuesto (nave, balas, asteroides).
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100, y los grandes y medianos se parten en dos del tamaño inferior.
- [ ] La barra de la plataforma muestra Puntuación, Vidas y Nivel con los mismos valores que el HUD del canvas, y se actualizan al cambiar.
- [ ] Chocar con un asteroide fuera de la invencibilidad quita una vida, deja la nave muerta 2 s y reaparece con 3 s de parpadeo.
- [ ] Al destruir todos los asteroides el nivel sube y aparecen `3 + nivel` asteroides nuevos.
- [ ] Recoger el power-up `3x` dispara 3 balas en abanico durante 5 s y el canvas muestra el contador.
- [ ] PAUSA congela asteroides, nave y temporizadores, muestra "EN PAUSA"; REANUDAR continúa sin salto de movimiento.
- [ ] FIN abre el modal "FIN DEL JUEGO" con el puntaje actual y el juego queda congelado.
- [ ] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" con el puntaje correcto y el canvas no dibuja "GAME OVER".
- [ ] Con el modal abierto, escribir las iniciales (incluido el Espacio) no dispara ni mueve la nave, y no hace scroll en la página.
- [ ] "GUARDAR PUNTUACIÓN" añade a `localStorage["av_scores"]` una entrada con `game: "asteroids"`, el puntaje y el nombre.
- [ ] "JUGAR DE NUEVO" empieza una partida limpia: puntaje 0, 3 vidas, nivel 1 y 4 asteroides.
- [ ] "SALIR" y la navegación a otra ruta detienen el juego: no queda ningún `requestAnimationFrame` ni listener activo, y volver a entrar arranca una partida nueva.
- [ ] En desarrollo (React Strict Mode) hay un solo motor activo, sin teclas duplicadas.
- [ ] `/juegos/caida/jugar` y los demás juegos siguen con el simulador actual.
- [ ] A 375 px de ancho el canvas se ve completo sin scroll horizontal.
- [ ] No hay errores de hidratación en consola al cargar `/juegos/asteroids/jugar` con y sin sesión guardada.
- [ ] `/`, `/biblioteca`, `/salon` y `/acerca-de` cargan sin cambios visuales aparte de la tarjeta nueva.

## Decisions

- **Sí:** portar a TypeScript con `createAsteroids(canvas, callbacks)`. Es lo único que permite HUD, pausa y guardado reales; los siguientes juegos copian esta forma.
- **No:** `iframe` con el HTML original. No hay forma limpia de leer el puntaje, pausar ni guardar.
- **No:** montar `game.js` casi tal cual como script global. Conserva globales y listeners sin limpiar, y falla con el doble montaje de React en desarrollo.
- **Sí:** entrada nueva `asteroids` en el catálogo, tal como se pidió. Se prefirió no tocar `rocas`.
- **No:** reutilizar o renombrar `rocas`. Decisión del usuario: dejarlo intacto. Queda un duplicado conceptual, anotado como deuda en el alcance.
- **Sí:** barra de la plataforma completa y HUD del canvas a la vez. Decisión del usuario; implica ver el puntaje dos veces, pero mantiene la coherencia con los otros juegos y no cambia el aspecto del juego original.
- **Sí:** quitar solo el overlay "GAME OVER" del canvas. El modal de la plataforma ya cubre ese momento y dos pantallas de fin a la vez serían confusas.
- **Sí:** modal "FIN DEL JUEGO" existente con guardado en `av_scores`. Reutiliza lo ya hecho en la spec 01; Supabase llegará en otro spec.
- **Sí:** reinicio por `runId` (se destruye y se crea un motor nuevo) en lugar de un `restart()` en la API. Es más simple y un motor nuevo garantiza el estado limpio.
- **Sí:** FIN congela el motor con `paused` y no añade `end()` a la API. El puntaje final ya está en el estado de React gracias a `onScore`.
- **Sí:** bifurcar por `game.id === "asteroids"` dentro de `GamePlayer`. Con un solo juego real un registro de motores sería sobreingeniería; se refactoriza al llegar el segundo.
- **Sí:** conservar el look vectorial original, 800×600 fijos escalados por CSS. No se pidió rediseñarlo y evita decisiones de `devicePixelRatio`.
- **Sí:** `preventDefault` en Espacio y flechas fuera de `input`/`textarea`, y limpiar teclas en `blur`. Sin esto la página hace scroll y la nave puede quedarse acelerando.
- **No:** controles táctiles ni sonido. Cada uno es un spec aparte.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js y respetar `CLAUDE.md` (incluido `/frontend-design` para la cover y el ajuste del marco CRT).

## Risks

| Riesgo                                                                                | Mitigación                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Con el foco en un botón (PAUSA, SALIR), Espacio lo activa en lugar de disparar        | `preventDefault` en `keydown` de Espacio; el paso 10 lo comprueba tras pulsar PAUSA y REANUDAR. Si no basta, se hace `blur()` del botón tras pulsarlo. |
| React Strict Mode monta el efecto dos veces y deja dos motores o listeners duplicados | `destroy` cancela el `requestAnimationFrame` y llama a `input.detach()`. Se comprueba en desarrollo.                                                   |
| Los callbacks cambian de identidad en cada render y recrean el motor                  | Se guardan en una `ref` y el efecto depende solo de `runId`.                                                                                           |
| Salto de movimiento al reanudar tras una pausa larga                                  | `resume` reinicia la marca de tiempo y el tope de `dt` sigue en 0,05 s.                                                                                |
| La pestaña pasa a segundo plano y el bucle se detiene                                 | El tope de `dt` evita el salto al volver. No se pausa automáticamente (queda fuera de alcance).                                                        |
| Tecleando las iniciales en el modal el motor sigue leyendo teclas                     | En `gameover` el motor ignora la entrada y `paused` es `true` mientras el modal está abierto.                                                          |
| El canvas escalado por CSS se ve borroso o deformado en pantallas distintas           | El tamaño interno fijo y `height: auto` con proporción 4:3; el paso 9 lo revisa a 1280 px y 375 px.                                                    |
| `best: 0` y `plays: "0"` rompen ordenaciones o la landing                             | El paso 2 revisa `/`, `/biblioteca` y `/salon` con la tarjeta nueva.                                                                                   |
| Duplicado `rocas` / `asteroids` confunde a los jugadores                              | Deuda reconocida y explícita en el alcance; se resuelve en otro spec.                                                                                  |
| `asteroids` se queda sin puntajes en el Salón                                         | Esperado: `av_scores` hoy solo se escribe y el Salón usa datos ficticios. Lo resuelve el spec de puntuaciones con Supabase.                            |

## What is **not** in this spec

- Tocar o eliminar la entrada `rocas`.
- Supabase, puntuaciones remotas o lectura de `av_scores` en el Salón.
- Controles táctiles, gamepad o sonido.
- Rediseño visual del canvas, OVNIs, nuevos power-ups o ajustes de dificultad.
- Portar Tetris, Arkanoid u otro de los juegos del catálogo.
- Un registro genérico de motores de juego.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
