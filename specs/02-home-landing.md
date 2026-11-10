# SPEC 02 — Landing page (Home) de Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-10
> **Objective:** Portar la landing del template `references/resources/templates/home-about/` como nueva página `/`, moviendo la Biblioteca a `/biblioteca` y añadiendo "Inicio" al Nav.

## Por qué existe este spec

La spec 01 dejó la Biblioteca en `/`. El template nuevo (`home-about/`) separa "Inicio" (landing de presentación) de "Biblioteca" (catálogo). Esto cambia una ruta ya implementada, así que hay que fijar qué se mueve y qué enlaces se actualizan para que nada quede roto.

## Scope

**In:**

- Nueva landing en `/` con las secciones del template (`home.jsx`):
  - Hero: eyebrow "INSERTA UNA MONEDA", título en 3 líneas, subtítulo, CTAs "EXPLORAR JUEGOS" (→ `/biblioteca`) y "CREAR CUENTA" (→ `/auth`), indicador "DESLIZA" y 8 siluetas pixel flotantes decorativas.
  - `// 01` "¿POR QUÉ ARCADE VAULT?": 4 tarjetas de características con icono pixel.
  - `// 02` "JUEGOS DISPONIBLES AHORA": riel con 6 mini-tarjetas (cada una lleva a `/juegos/[id]`) y botón "VER TODOS LOS JUEGOS →" (→ `/biblioteca`).
  - Banda de 3 estadísticas.
  - `// 03` "ACTIVIDAD EN VIVO": ticker de últimas puntuaciones y lista "TOP JUGADORES · HOY" con enlace "VER SALÓN →" (→ `/salon`).
  - `// 04` "PRECIOS": tarjeta del plan único "JUGADOR VAULT" ($0), botón "EMPEZAR GRATIS →" (→ `/auth`) y 3 preguntas frecuentes.
  - CTA final "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →" (→ `/biblioteca`).
- Animación de aparición al hacer scroll (clase `.reveal` + `IntersectionObserver`) en las secciones.
- La Biblioteca actual (`LibraryBrowser` con su hero) se mueve a `/biblioteca`.
- Nav: añadir "Inicio" (`/`). Orden: Inicio · Biblioteca · Salón de la Fama. Aplica a la barra y al panel móvil.
- Actualizar los enlaces que apuntan a la Biblioteca para que usen `/biblioteca`.
- Datos ficticios de la landing tipados en `app/data/home.ts`.
- Añadir a `app/globals.css` las clases del template que falten (`home-*`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `ticker`, `top-*`, `pricing-*`, `price-*`, `faq-*`, `reveal`, `final-*`, etc.).

**Out of scope (para futuros specs):**

- La página "Acerca de" (`about.jsx`) y su formulario de contacto. El Nav no muestra "Acerca de" hasta que exista la página.
- Datos reales: actividad en vivo, top de hoy y estadísticas son ficticios y estáticos. No leen `av_scores`.
- Que "CRÉDITOS" o el contador cambien con algo.
- Cambios en las pantallas de la spec 01 más allá de actualizar enlaces.
- Pestaña preseleccionada en `/auth` al venir de "CREAR CUENTA" (el botón solo navega a `/auth`).
- Tests automatizados.

## Data model

Datos ficticios en `app/data/home.ts`, sustituibles luego por consultas a backend:

```ts
// app/data/home.ts
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: NeonColor;
}

export interface HomeStat { n: string; u: string; s: string }

export interface RecentScore {
  player: string;
  game: string;       // nombre mostrado, p. ej. "Bloque Buster"
  score: number;
  ago: string;        // texto ya formateado, p. ej. "hace 2 min"
  color: NeonColor;
}

export interface TopPlayer { rank: number; player: string; score: number }

export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];            // 4
export const HOME_STATS: HomeStat[];         // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_PLAYERS: TopPlayer[];       // 5
export const PRICING_PERKS: string[];        // 6
export const FAQ: FaqItem[];                 // 3
```

Convenciones:

- Los textos se copian del template tal cual (en español).
- El riel de juegos usa `GAMES.slice(0, 6)` de `app/data/games.ts`. No se duplican juegos.
- Números formateados con `toLocaleString("es-ES")`.
- Los nombres de juego de `RECENT_SCORES` coinciden con `title` de `GAMES` (el template usa "Caída", "Glotón", etc.; si alguno no coincide con `GAMES`, se corrige al título real).

## Implementation plan

1. Mover la Biblioteca: crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (hero + `LibraryBrowser`) y dejar `app/page.tsx` con un placeholder mínimo. Prueba manual: `/biblioteca` muestra las 8 tarjetas y el filtro funciona.
2. Actualizar enlaces a la Biblioteca a `/biblioteca`: "VOLVER AL VAULT" en `app/juegos/[id]/page.tsx:85`, el enlace de `app/salon/page.tsx:17` y el de `app/components/game-player.tsx:182`. Dejar `/` en `app/not-found.tsx:28` y en las redirecciones de `app/auth/page.tsx:18,23` (llevan a la landing). Prueba manual: el botón del detalle vuelve a `/biblioteca`.
3. Actualizar `app/components/nav.tsx`: añadir "Inicio" (`/`) en la barra y el panel móvil, mover Biblioteca a `/biblioteca`, y cambiar `isActive` para que "Inicio" solo sea activo en `/` y Biblioteca lo sea en `/biblioteca` y `/juegos/*`. Prueba manual: cada enlace se marca bien en `/`, `/biblioteca`, `/juegos/bloque-buster` y `/salon`.
4. Crear `app/data/home.ts` con los tipos y datos del template. Prueba manual: `npx tsc --noEmit` sin errores.
5. Comparar `app/globals.css` con `references/resources/templates/home-about/styles.css` y añadir solo las clases que falten (incluidas las `@keyframes` `float` y `bounce` y los `@media` responsivos). Prueba manual: `npm run dev` arranca y las pantallas existentes no cambian.
6. Crear los componentes de la landing en `app/components/home/`: `floating-silhouettes.tsx` (SVG decorativo), `feature-icon.tsx` y `mini-card.tsx` (Server Components), y `reveal.tsx` (Client Component que aplica el `IntersectionObserver` a sus hijos). Prueba manual: `npx tsc --noEmit` sin errores.
7. Implementar la landing en `app/page.tsx` como Server Component: hero y secciones 01 y 02 con `Link` en lugar de `navigate`. Prueba manual: "EXPLORAR JUEGOS" lleva a `/biblioteca` y una mini-tarjeta lleva a su detalle.
8. Añadir a `app/page.tsx` la banda de estadísticas, la sección 03, la sección 04 de precios y la CTA final, todas envueltas en `Reveal`. Prueba manual: al bajar, las secciones aparecen con la animación y todos los botones navegan a su destino.
9. Pulir: revisión a 375 px de ancho (siluetas, riel con scroll horizontal propio, rejillas a 1 columna) y con `prefers-reduced-motion` (sin animaciones de `float`, `bounce` ni `reveal` que oculten contenido).

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/` muestra el hero con el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" y las secciones 01 a 04 y la CTA final, sin errores en la consola.
- [ ] `/biblioteca` muestra 8 tarjetas, el filtro "PUZZLE" deja solo "CAÍDA" y buscar "zzz" muestra "NO HAY RESULTADOS".
- [ ] El riel de la sección 02 muestra exactamente 6 mini-tarjetas y cada una navega a `/juegos/[id]` de su juego.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/biblioteca`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`. "VER SALÓN →" navega a `/salon`.
- [ ] La sección 01 muestra 4 tarjetas, el ticker 7 filas, el top 5 filas y el FAQ 3 preguntas.
- [ ] El Nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" (barra y panel móvil) y no muestra "Acerca de".
- [ ] "Inicio" está activo solo en `/`. "Biblioteca" está activo en `/biblioteca` y `/juegos/bloque-buster`. Ninguno de los dos lo está en `/salon`.
- [ ] El logo del Nav lleva a `/`.
- [ ] "VOLVER AL VAULT" en el detalle lleva a `/biblioteca`.
- [ ] Iniciar sesión en `/auth` redirige a `/` y el Nav muestra el nombre.
- [ ] Las secciones con `.reveal` pasan a visibles al entrar en el viewport.
- [ ] Con `prefers-reduced-motion: reduce` todas las secciones son visibles sin scroll previo.
- [ ] A 375 px de ancho no hay scroll horizontal en `/`.
- [ ] No hay errores de hidratación en consola al cargar `/` con y sin sesión guardada.

## Decisions

- **Sí:** la landing en `/` y la Biblioteca en `/biblioteca`. Es lo que hace el template (Inicio y Biblioteca separados) y la landing es la portada natural.
- **No:** landing en `/inicio` dejando la Biblioteca en `/`. Evita tocar enlaces, pero la portada seguiría siendo el catálogo y se aleja del template.
- **Sí:** dejar "Acerca de" para otro spec y no mostrar su enlace en el Nav. Un enlace sin página sería un enlace roto, y el pedido fue solo el home.
- **No:** portar `about.jsx` ahora. Añade formulario con estado y validación, un área distinta de la landing.
- **Sí:** datos de la landing en `app/data/home.ts` tipados. Mismo criterio que la spec 01: se sustituyen luego por backend sin tocar la UI.
- **No:** datos incrustados en los componentes, como en el template. Dificultan el reemplazo.
- **Sí:** reutilizar `GAMES.slice(0, 6)` para el riel. Una sola fuente de verdad para los juegos.
- **Sí:** CSS plano con las clases del template en `app/globals.css`, como en la spec 01. Es lo más fiel al diseño.
- **Sí:** la landing es un Server Component. Solo `Reveal` es Client Component porque usa `IntersectionObserver`. Se sustituye `navigate()` por `Link`.
- **Sí:** tras iniciar sesión, `/auth` sigue redirigiendo a `/` (ahora la landing) y 404 sigue enlazando a `/`. Son salidas generales, no "volver al catálogo".
- **Sí:** "VOLVER AL VAULT", el enlace del Salón vacío y el del reproductor apuntan a `/biblioteca`, porque su intención es volver al catálogo.
- **Sí:** respetar `/frontend-design` y consultar `node_modules/next/dist/docs/` antes de escribir código Next.js (`cacheComponents`), como indica `CLAUDE.md`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Quedan enlaces a `/` que antes significaban "Biblioteca" | El paso 2 lista todos los enlaces con `grep` de `"/"` en `app/` y decide caso por caso. |
| `.reveal` deja secciones invisibles si falla el JS o con `prefers-reduced-motion` | El paso 9 fuerza visibilidad con `prefers-reduced-motion` y se verifica en los criterios de aceptación. |
| Colisión de nombres entre clases nuevas y las existentes (`.av-hero`, `.btn`, `.pulse`) | El paso 5 compara ambos CSS y añade solo lo que falta, sin sobrescribir reglas existentes. |
| Los títulos de `RECENT_SCORES` del template no coinciden con `GAMES` | Se comprueban en el paso 4 y se ajustan al título real. |
| Peso visual: 8 SVG animados y muchas secciones en móvil | Revisión a 375 px en el paso 9. |

## What is **not** in this spec

- La página "Acerca de" ni el formulario de contacto.
- Datos reales o conectados a `av_scores`, backend o API.
- Cambios en el reproductor, el detalle o el Salón, salvo actualizar enlaces.
- Pestaña preseleccionada en `/auth`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
