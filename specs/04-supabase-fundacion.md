# SPEC 04 — Fundación de Supabase en la app Next.js

> **Status:** Aprobado
> **Depends on:** SPEC 03
> **Date:** 2026-11-18
> **Objective:** Dejar Supabase conectado a la app Next.js con los clientes de servidor y de navegador de `@supabase/ssr`, las variables de entorno documentadas y una conexión verificada, sin cambiar ninguna pantalla.

## Por qué existe este spec

Hasta ahora la sesión (`av_user`) y las puntuaciones (`av_scores`) son simuladas en `localStorage`, y el Salón y el detalle usan datos ficticios. Migrar todo a Supabase toca al menos tres áreas (Auth, puntuaciones, Salón), así que se parte en specs. Este es el primero: solo la base técnica que los demás reutilizan. El proyecto Supabase (`zrzpqeukvildppbqzugg`) existe y está vacío (sin tablas), y el MCP ya está configurado en `.mcp.json`.

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Cliente de servidor `app/lib/supabase/server.ts` (`createClient()` asíncrono, con cookies de `next/headers`).
- Cliente de navegador `app/lib/supabase/client.ts` (`createClient()` con `createBrowserClient`).
- Variables de entorno públicas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` y documentadas en `.env.example`.
- Corregir en `.env.example` la línea rota `SUPABASE_DB_PASSWORD` (hoy sin valor ni comentario, pegada a la anterior) y documentarla como no usada por la app.
- Ruta temporal `app/api/supabase-health/route.ts` para verificar la conexión, eliminada en el último paso.
- Actualizar `CLAUDE.md` con los clientes, las variables y la regla de uso de cada cliente.

**Out of scope (para futuros specs):**

- Supabase Auth: reemplazar `av_user` y la pantalla `/auth`. El Nav y el proveedor de sesión no cambian.
- `proxy.ts` (antes middleware) para refrescar la sesión. Se añade con el spec de Auth, que es el primero que lo necesita.
- Tablas, migraciones, RLS y carpeta `supabase/migrations`. Este spec no crea esquema.
- Guardar puntuaciones en Supabase y leerlas en el Salón o el detalle. `av_scores` sigue como está.
- Tipos generados (`generate_typescript_types`): sin tablas no hay nada que tipar.
- Clave secreta (`service_role`) y cualquier cliente administrativo.
- Realtime, Storage y Edge Functions.
- Tests automatizados (no hay runner configurado).

## Data model

La feature no introduce datos ni tablas. Define los módulos de cliente y las variables de entorno.

```ts
// app/lib/supabase/server.ts  (solo Server Components, Server Actions y Route Handlers)
import type { SupabaseClient } from "@supabase/supabase-js";
export async function createClient(): Promise<SupabaseClient>;

// app/lib/supabase/client.ts  (solo Client Components)
export function createClient(): SupabaseClient;
```

Variables de entorno:

| Variable                               | Uso                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Obligatoria. URL del proyecto (`https://zrzpqeukvildppbqzugg.supabase.co`, obtenida con el MCP `get_project_url`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Obligatoria. Clave publicable, obtenida con el MCP `get_publishable_keys`. Es pública por diseño.                  |
| `SUPABASE_DB_PASSWORD`                 | No la lee la app. Solo la usa la CLI de Supabase. Se mantiene documentada y vacía.                                 |

Respuesta de la ruta temporal de verificación:

```ts
// GET /api/supabase-health
{
  ok: true;
} // 200: la URL y la clave publicable responden
{
  ok: false;
  error: string;
} // 500: texto genérico, sin la clave ni la URL
```

Convenciones:

- Solo se usa la clave publicable. Nunca `service_role` ni la clave secreta, ni con prefijo `NEXT_PUBLIC_` ni sin él.
- Si falta una variable, el módulo lanza un `Error` con el nombre de la variable (no con su valor) al crear el cliente.
- Una ubicación por cliente: `app/lib/supabase/`, junto a `app/data` y `app/actions`. Alias `@/app/lib/supabase/...`.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` las notas de `cacheComponents` sobre `cookies()` y Route Handlers, y en la documentación de Supabase (`mcp__supabase__search_docs`) la guía actual de `@supabase/ssr` para Next.js. Prueba manual: ninguna; el resultado es decidir la firma final de `createClient` del servidor.
2. Instalar dependencias con `npm install @supabase/supabase-js @supabase/ssr`. Prueba manual: `npx tsc --noEmit` y `npm run build` sin errores.
3. Obtener la URL y la clave publicable con el MCP (`get_project_url`, `get_publishable_keys`), añadirlas a `.env.local` y documentar las tres variables en `.env.example` (sección "Supabase", con `SUPABASE_DB_PASSWORD=` en su propia línea y comentario). Prueba manual: `.env.example` está versionado y sin valores reales; `.env.local` sigue ignorado por git (`git status` no lo lista).
4. Crear `app/lib/supabase/client.ts` con `createBrowserClient`. Prueba manual: `npx tsc --noEmit` sin errores.
5. Crear `app/lib/supabase/server.ts` con `createServerClient` y el adaptador de cookies de `next/headers`, con `setAll` tolerante a los Server Components (`try/catch`, como indica la guía de Supabase). Prueba manual: `npx tsc --noEmit` sin errores.
6. Crear la ruta temporal `app/api/supabase-health/route.ts` que usa el cliente de servidor y comprueba la conexión (`supabase.auth.getSession()` sin sesión debe responder sin error de red). Prueba manual: `npm run dev` y `curl localhost:3000/api/supabase-health` devuelve `{"ok":true}`.
7. Probar el caso de error: con `NEXT_PUBLIC_SUPABASE_URL` vacía la ruta responde 500 con texto genérico, y con la clave alterada la respuesta no la expone. Restaurar `.env.local`. Prueba manual: ver criterios de aceptación.
8. Verificar el bundle: `npm run build` y buscar la clave en `.next/static`. Es esperable que la clave publicable aparezca si el cliente de navegador está importado en algún Client Component; como aquí ninguno lo importa, no debe aparecer. Prueba manual: ver criterios de aceptación.
9. Eliminar `app/api/supabase-health/route.ts` y la carpeta `app/api/` si queda vacía. Actualizar `CLAUDE.md`: clientes, variables de entorno y la regla "servidor con `server.ts`, cliente con `client.ts`, nunca la clave secreta". Prueba manual: `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores, y `/`, `/biblioteca`, `/salon`, `/auth`, `/acerca-de` cargan igual que antes.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `app/lib/supabase/server.ts` y `app/lib/supabase/client.ts` existen y exportan `createClient`.
- [ ] `.env.example` está versionado, documenta `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_DB_PASSWORD` en líneas separadas y no contiene valores reales.
- [ ] `.env.local` contiene las dos variables públicas y no aparece en `git status`.
- [ ] Antes de borrarla, `GET /api/supabase-health` devuelve 200 con `{"ok":true}` en `npm run dev`.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` vacía, la ruta de verificación devuelve 500 y el cuerpo no contiene la URL ni la clave.
- [ ] El módulo de cliente lanza un error que nombra la variable faltante y no incluye su valor.
- [ ] `grep -r "service_role\|sb_secret" app .env.example CLAUDE.md` no devuelve ninguna coincidencia.
- [ ] La clave publicable no aparece en `.next/static` tras `npm run build` (ningún Client Component usa aún el cliente de navegador).
- [ ] `app/api/supabase-health` ya no existe en el estado final.
- [ ] No se crean tablas: `mcp__supabase__list_tables` sigue devolviendo una lista vacía.
- [ ] `/`, `/biblioteca`, `/salon`, `/auth`, `/acerca-de` cargan sin errores en la consola ni cambios visuales, y la sesión simulada `av_user` sigue funcionando.
- [ ] `CLAUDE.md` documenta los clientes, las variables y la regla de la clave secreta.

## Decisions

- **Sí:** dividir "implementar Supabase" en specs y empezar solo por la fundación. Auth, puntuaciones y Salón son tres áreas con decisiones propias (método de login, esquema, RLS) y mezclarlas hace un spec imposible de verificar.
- **No:** incluir Auth en este spec. Se evaluó "Fundación + Auth" y se descartó; Auth tiene su propio spec con el método de inicio de sesión por decidir.
- **Sí:** `@supabase/ssr` con cliente de servidor y de navegador. Es lo que Auth y las puntuaciones necesitarán con cookies, y evita migrar de `supabase-js` a `ssr` después.
- **No:** `supabase-js` solo, sin `ssr`. Sin manejo de cookies habría que reescribir los clientes al hacer Auth.
- **No:** `proxy.ts` ahora. Sin sesión real no tiene nada que refrescar y correría en cada petición sin aportar nada. Llega con el spec de Auth.
- **Sí:** clave publicable (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Es la clave pensada para el navegador y la protección real vendrá de RLS en los specs con tablas.
- **No:** clave secreta ni `service_role`. No hay caso de uso y filtrarla da acceso total saltándose RLS.
- **Sí:** clientes en `app/lib/supabase/`. Sigue la convención del repo (`app/data`, `app/actions`, `app/components`) en lugar de crear una carpeta `lib/` en la raíz.
- **Sí:** ruta temporal `/api/supabase-health` borrada al final. Prueba la conexión real desde Next.js sin dejar un endpoint público permanente.
- **No:** script con `tsx` ni verificar solo con el MCP. El script añade una dependencia de desarrollo y el MCP no demuestra que la app conecte.
- **Sí:** migraciones y tipos generados quedan para el primer spec que cree tablas. Sin tablas no hay esquema que versionar.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js (`cacheComponents` afecta a `cookies()`) y respetar `CLAUDE.md`.

## Risks

| Riesgo                                                                                                             | Mitigación                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookies()` bajo `cacheComponents` exige contexto dinámico y falla en el build si se usa en un componente estático | El paso 1 lee la documentación local. Este spec solo usa el cliente de servidor en una Route Handler, que es dinámica; la integración con páginas llega con Auth. |
| Se confunde la clave publicable con la secreta y se filtra esta última                                             | Solo se obtiene la publicable con `get_publishable_keys`. El criterio de aceptación con `grep` busca `service_role` y `sb_secret` en el repo.                     |
| `.env.local` o `.env.example` con valores reales versionados                                                       | El paso 3 comprueba con `git status` y `.env.example` queda sin valores.                                                                                          |
| La API de `@supabase/ssr` cambia entre versiones (`getAll`/`setAll`, nombres de clave)                             | El paso 1 consulta la guía vigente con `search_docs` antes de escribir los clientes.                                                                              |
| La ruta de verificación queda en producción                                                                        | El paso 9 la elimina y un criterio de aceptación comprueba que no existe.                                                                                         |
| El proyecto Supabase está pausado o inaccesible y la prueba falla sin ser culpa del código                         | El paso 6 distingue error de red de error de configuración; se revisa el estado del proyecto con el MCP antes de depurar código.                                  |

## What is **not** in this spec

- Supabase Auth ni cambios en `/auth`, el Nav o `session-provider.tsx`.
- `proxy.ts` ni refresco de sesión.
- Tablas, migraciones, RLS o tipos generados.
- Puntuaciones reales, Salón de la Fama o detalle con datos de Supabase.
- Clave secreta, Realtime, Storage o Edge Functions.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
