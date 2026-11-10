# SPEC 01 — MVP visual de Arcade Vault

> **Status:** Implementado
> **Depends on:** Ninguna
> **Date:** 2026-11-06
> **Objective:** Portar las 5 pantallas del template (`references/resources/templates/`) a rutas reales de Next.js App Router, con datos ficticios en `app/data/` y sesión simulada, sin implementar ningún juego.

## Por qué existe este spec

El template es un prototipo de un solo archivo HTML, con React y Babel por CDN y navegación por hash. El proyecto usa Next.js 16 con App Router, así que no se puede copiar tal cual. Este spec fija cómo se traduce cada pieza (rutas, estado, datos) para que la implementación no improvise.

## Scope

**In:**

- 5 pantallas como rutas reales:
  - `/` Biblioteca: hero, búsqueda por nombre, chips de categoría, grilla de tarjetas con efecto tilt, estado vacío "NO HAY RESULTADOS".
  - `/juegos/[id]` Detalle: portada, tags, descripción, stats, ranking Top 10 y botones "JUGAR AHORA" / "VOLVER AL VAULT".
  - `/juegos/[id]/jugar` Reproductor: copia fiel del placeholder del template. HUD con puntaje que sube solo, vidas, nivel, pausa, FIN, marco CRT con arena decorativa y modal "FIN DEL JUEGO" con guardado de puntuación.
  - `/auth` Auth: pestañas "Iniciar sesión" / "Crear cuenta", "Jugar como invitado", botones sociales decorativos.
  - `/salon` Salón de la Fama: pestañas por juego, podio top 3, tabla y fila "Tu mejor marca" si hay sesión.
- Componentes compartidos en el layout raíz: Nav (con menú móvil y contador de créditos), footer, fondo `av-bg` y `av-noise` (ya existentes).
- Datos ficticios tipados en `app/data/`, pensados para sustituirse luego por una base de datos.
- Sesión simulada: cualquier credencial entra, el usuario se guarda en `localStorage` bajo `av_user`, el Nav muestra el nombre y permite cerrar sesión.
- Guardado de puntuaciones simulado en `localStorage` bajo `av_scores`, igual que el template.
- Diseño siguiendo `/frontend-design` y el tema ya presente en `app/globals.css`. Se añaden ahí solo las clases del template que falten.

**Out of scope (para futuros specs):**

- Cualquier juego real. El reproductor sigue siendo un placeholder.
- Backend, base de datos y API. Los datos son ficticios.
- Autenticación real (OAuth, contraseñas, sesiones de servidor). Los botones Google y GitHub son decorativos.
- Que el Salón de la Fama y el detalle lean las puntuaciones guardadas en `av_scores`. Siguen mostrando datos ficticios.
- Tests automatizados (no hay runner configurado).
- Internacionalización. La interfaz es solo en español.

## Data model

Los datos viven en `app/data/` y se migran del template (`data.jsx`) con tipos explícitos:

```ts
// app/data/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;            // slug de la URL, p. ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;         // clase CSS, p. ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;         // texto ya formateado, p. ej. "12.4K"
}

export const GAMES: Game[];                        // los 8 juegos del template
export const CATEGORIES: ("TODOS" | GameCategory)[];

// app/data/scores.ts
export interface ScoreEntry {
  rank: number;
  name: string;
  score: number;
  date: string;          // "dd/mm/2026"
}

export function seededScores(seed: number, count?: number): ScoreEntry[];
export function getGame(id: string): Game | undefined;
```

```ts
// Sesión (localStorage "av_user")
export interface SessionUser { name: string }   // MAYÚSCULAS, máx. 10 caracteres

// Puntuación guardada (localStorage "av_scores", arreglo)
export interface SavedScore { game: string; score: number; name: string; at: number }
```

Convenciones:

- `seededScores` es determinista: la misma semilla produce siempre las mismas filas. Las semillas son las del template: `id.length * 17 + 3` en el detalle y `id.length * 23 + 7` en el Salón.
- Números formateados con `toLocaleString("es-ES")`.
- Todo acceso a `localStorage` va en `try/catch` y solo después del montaje en cliente.

## Implementation plan

1. Crear `app/data/games.ts` y `app/data/scores.ts` con los tipos y datos del template. Prueba manual: `npx tsc --noEmit` sin errores.
2. Revisar `app/globals.css` contra `templates/styles.css` y añadir las clases que falten (cards, detalle, leaderboard, player/CRT, modal, auth, podio, mobile panel). Prueba manual: `npm run dev` sigue arrancando.
3. Crear el proveedor de sesión (`app/components/session-provider.tsx`, Client Component) con `user`, `login`, `logout` sobre `av_user`. Envolver `children` en `app/layout.tsx`.
4. Crear `app/components/nav.tsx` (Client Component) con enlaces, estado activo por `usePathname`, contador de créditos, botón de sesión y menú móvil. Añadirlo con el footer a `app/layout.tsx`. Prueba manual: el Nav se ve en `/` y el menú móvil abre y cierra.
5. Implementar la Biblioteca en `app/page.tsx`, con `GameCard` y los filtros como Client Components en `app/components/`. Prueba manual: buscar y filtrar funcionan, y el estado vacío aparece.
6. Implementar el Detalle en `app/juegos/[id]/page.tsx`. Un `id` inexistente llama a `notFound()`. Prueba manual: la tarjeta de la Biblioteca lleva al detalle.
7. Implementar el Reproductor en `app/juegos/[id]/jugar/page.tsx`, con la lógica de simulación en un Client Component. Prueba manual: el puntaje sube, la pausa lo detiene, FIN abre el modal y guardar escribe en `av_scores`.
8. Implementar Auth en `app/auth/page.tsx` (Client Component). Prueba manual: entrar redirige a `/` y el Nav muestra el nombre.
9. Implementar el Salón de la Fama en `app/salon/page.tsx`. Prueba manual: cambiar de pestaña cambia podio y tabla, y con sesión aparece "Tu mejor marca".
10. Pulir: estado activo del Nav para `/juegos/*`, `not-found` con estilo del tema y revisión a 375 px de ancho.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] Las rutas `/`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/auth` y `/salon` cargan sin errores en la consola del navegador.
- [ ] `/juegos/no-existe` muestra la página 404.
- [ ] La Biblioteca muestra 8 tarjetas y el filtro "PUZZLE" deja solo "CAÍDA".
- [ ] Buscar "zzz" en la Biblioteca muestra "NO HAY RESULTADOS".
- [ ] Pulsar una tarjeta o su botón "JUGAR" navega a `/juegos/[id]`.
- [ ] El Detalle muestra 10 filas de ranking y "JUGAR AHORA" lleva a `/juegos/[id]/jugar`.
- [ ] En el Reproductor el puntaje aumenta solo, "PAUSA" lo detiene y "REANUDAR" lo retoma.
- [ ] "FIN" abre el modal "FIN DEL JUEGO". "GUARDAR PUNTUACIÓN" añade un registro a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA".
- [ ] "JUGAR DE NUEVO" reinicia puntaje, vidas y nivel.
- [ ] Entrar en `/auth` con cualquier usuario guarda `av_user`, redirige a `/` y el Nav muestra el nombre en mayúsculas (máx. 10 caracteres).
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin sesión.
- [ ] Recargar la página mantiene la sesión. Cerrar sesión borra `av_user`.
- [ ] El Salón muestra el podio con los 3 primeros y la fila "TU MEJOR MARCA" solo con sesión.
- [ ] A 375 px de ancho no hay scroll horizontal y el menú hamburguesa abre el panel lateral.
- [ ] No hay errores de hidratación en consola al cargar con y sin sesión guardada.

## Decisions

- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`). Dan URLs compartibles y aprovechan el framework.
- **No:** una sola ruta con estado y hash como el template. Es un patrón de prototipo y no encaja en Next.js.
- **Sí:** datos ficticios en `app/data/` con tipos explícitos. Más adelante se sustituyen por consultas a una base de datos sin tocar las pantallas. El usuario pidió esa carpeta; la separación en `games.ts` y `scores.ts` es una elección de este spec.
- **No:** datos incrustados dentro de cada componente. Dificultan el reemplazo.
- **Sí:** sesión simulada en `localStorage` (`av_user`), igual que el template. Permite probar el estado "con sesión" sin backend.
- **No:** autenticación real. Va en otro spec.
- **Sí:** reproductor copiado tal cual del template, incluido el guardado en `av_scores`. Es un placeholder hasta que existan los juegos reales.
- **No:** leer `av_scores` en el Salón o el detalle. Se deja para cuando exista backend.
- **Sí:** CSS plano con las clases del template (`av-*`, `card`, `btn`, `podium`, etc.) en `app/globals.css`. Es lo más fiel al diseño y lo más rápido de portar. Tailwind v4 sigue disponible, pero solo para ajustes puntuales de layout, espaciado o utilidades generales.
- **No:** reescribir los estilos con utilidades de Tailwind. Implica traducir cada clase del template y arriesga cambiar el diseño.
- **Sí:** Server Components por defecto. Solo son Client Components lo que usa estado, efectos o `localStorage` (Nav, filtros, tarjetas, reproductor, auth, pestañas del Salón, proveedor de sesión).
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js, como indica `AGENTS.md`, sobre todo por `cacheComponents` y los `params` asíncronos.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Error de hidratación al leer `localStorage` en el primer render | El proveedor lee `av_user` en un `useEffect` tras el montaje. El primer render equivale a "sin sesión". |
| `cacheComponents` obliga a tratar las APIs dinámicas de otra forma (`params`, acceso a datos) | Leer la documentación local antes del paso 6. Los datos son estáticos, así que no debería haber acceso dinámico. |
| `localStorage` bloqueado (modo privado) | Todo acceso en `try/catch`. La app funciona, solo que sin persistencia. |
| Faltan clases CSS respecto a `templates/styles.css` | El paso 2 compara ambos archivos antes de construir las pantallas. |

## What is **not** in this spec

- Ningún juego real (ni lógica, ni canvas, ni controles).
- Backend, base de datos o API de puntuaciones.
- Autenticación real o OAuth.
- Salón de la Fama y detalle alimentados por `av_scores`.
- Tests automatizados.
- Internacionalización.

Cada uno de estos puntos, si se aborda, va en su propio spec.
