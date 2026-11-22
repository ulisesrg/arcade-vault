# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: an online games platform where players compete for the highest score. All user-facing text is in Spanish (`<html lang="es">`), and so are the README and the specs.

Spec-driven workflow (skills from https://github.com/Klerith/fernando-skills): specs live in `specs/NN-slug.md`; `specs/.spec-config.yml` sets `AutoCreateBranch: true`, so `/spec-impl` creates and switches to `spec-NN-slug` without asking. Each spec is merged into `main` through a PR.

Routes: `/`, `/biblioteca` (catalog with category chips), `/juegos/[id]` (detail + top 10), `/juegos/[id]/jugar` (player), `/salon` (hall of fame), `/acerca-de` (about + contact form), `/auth` (simulated login).

`references/` holds course material, not app code: reference games (`started-games/`), source assets and the original HTML/JSX design (`resources/templates/`). Prettier ignores it. The list of real games is in `references/implemented-games.md`.

## Commands

- `npm run dev`, `npm run build`, `npm run start`, `npm run lint`; type check with `npx tsc --noEmit`.
- No test runner. Verify UI changes with the Playwright MCP and save screenshots in `.playwright-screenshots/`.

## Claude Code setup

- A `PostToolUse` hook on `Write|Edit` (`.claude/hooks/format-lint.sh`) runs Prettier and, on JS/TS files, `eslint --fix`; it exits 2 when either fails. Do not run Prettier by hand; fix what the hook reports.
- Supabase MCP (`.mcp.json`, scoped to this project) handles migrations, type generation, advisors and SQL.
- `spec`, `spec-impl` and `new-game` set `disable-model-invocation`: only the user can launch them.

## Subagents

Definitions live in `.claude/agents/<name>.md`; their `description` says when to delegate, so don't repeat their flow here. Agents with `memory: project` keep it versioned in `.claude/agent-memory/<name>/`. Unless its row says otherwise, an agent never touches `app/`, `specs/` or `supabase/`.

| Agent          | Use it to                                                     | Writes to                                                                    |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `game-planner` | Decide which game fits the platform; log people's suggestions | `references/game-suggestions-to-do.md`, `.claude/agent-memory/game-planner/` |

Workflow: `game-planner` decides → the user runs `/new-game` (spec) → `/spec-impl` (code).

## Next.js version warning

Next.js 16.4.5 with React 19.3: APIs differ from older versions. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

Para añadir un juego real, usa `/new-game <carpeta de references/started-games/ o descripción>`: genera la spec del juego a partir de las specs 05 y 06; luego se implementa con `/spec-impl`. Para cualquier otra funcionalidad grande, primero `/spec <descripción>` y, una vez aprobada, `/spec-impl <NN-slug>`.

## Architecture notes

- App Router only. `next.config.ts` turns on `cacheComponents` (it changes caching and rendering: check the docs before data fetching or dynamic APIs), `partialPrefetching` and `experimental.agentFeedback`.
- Styling: Tailwind v4 is wired (via `@tailwindcss/turbopack`) but barely used. The UI uses hand-written classes in `app/globals.css` (`.btn` with `.magenta`/`.yellow`/`.green`/`.ghost`, `.lg`/`.xl`, `.pulse`; `.crt-screen`, `.cover-<id>`…) and a single dark neon palette of CSS variables on `:root`. No light mode.
- Simulated session (no Supabase Auth yet): `useSession()` from `app/components/session-provider.tsx` persists `{ name }` (uppercase, max 10 chars) in `localStorage["av_user"]`. `/auth` checks nothing.
- Contact form: Server Action `app/actions/contact.ts` validates on the server (with a `website` honeypot) and sends mail with `resend`. Env vars `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and optional `CONTACT_FROM_EMAIL` (see `.env.example`); read them only in server code. With Resend's test sender, mail only reaches the Resend account's own address, so `CONTACT_TO_EMAIL` must be that address until a domain is verified.
- Errors shown to users are generic Spanish messages; the real cause is only logged on the server.

### Supabase

- Clients in `app/lib/supabase/`: `server.ts` (async, cookies; Server Components, Actions, Route Handlers) and `client.ts` (Client Components only). Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use only the publishable key, never `service_role` or the secret key. In server code use `auth.getClaims()`, never `auth.getSession()`.
- With `cacheComponents`, `cookies()` is request-time: the data functions in `app/lib/games.ts` (`getGames`, `getGame`, `getLeaderboard`, `getRecentScores`, `getTopScores`) must run inside `<Suspense>` or a Server Action, and callers catch their errors.
- Schema: `games` (slug PK, `sort_order` unique), `scores` and the view `games_with_stats` (`best`, `plays`; columns come back `| null`, hence the mapping in `app/lib/games.ts`). RLS: public `select`; `insert` on `scores` only through the policy `scores_insert_real_games` (`game_id in (...)`); no `update`/`delete`, no writes to `games`. Anyone can post a fake score (no auth or anti-cheat yet): accepted for now.
- Migrations go through the MCP `apply_migration`; the file name in `supabase/migrations/` must match the version in the remote `schema_migrations`. After each migration regenerate `app/lib/supabase/database.types.ts` (`generate_typescript_types`); never edit it by hand.
- `saveScore` (`app/actions/scores.ts`) validates `gameId` against `REAL_GAME_IDS`, the name (trimmed, uppercased, 1-10 chars) and the score (integer 0..10,000,000).
- `/juegos/[id]` has no `generateStaticParams`; `notFound()` inside `<Suspense>` renders the 404 with status 200.
- `formatAgo` (`app/lib/format-date.ts`) calls `Date.now()`: use it only in a suspended Server Component after `await connection()`.

### Real games

The list of games (id, title, category, colour, spec) is in `references/implemented-games.md`; each game's details live in its spec. Every game follows the same contract (Asteroids is the reference):

- Engine in `app/games/<id>/`: plain TypeScript, no React, no `document`, no globals. `engine.ts` exports `create<Name>(canvas, callbacks)` returning `{ pause, resume, destroy }`. Callbacks (`onScore`, `onLives`, `onLevel`, `onGameOver`) fire only when the value changes; `onGameOver` fires once and the engine stops its loop. `destroy` cancels the `requestAnimationFrame` and detaches the listeners; `resume` resets the timestamp to avoid a `dt` jump. Cap `dt`. Assets go in `public/games/<id>/`, load by URL, and the loop starts only once they load (`destroy` before that prevents it).
- Canvas wrapper `app/components/<id>-canvas.tsx` (Client Component) takes `runId` (changing it recreates the engine: "JUGAR DE NUEVO") and `paused`, and keeps the callbacks in a `ref`. Canvases are a fixed size scaled by CSS (no `devicePixelRatio`).
- `app/games/registry.ts` maps id → `{ Canvas, hud: { lives, level } }`. `GamePlayer` renders the game from it, shows the HUD, pauses, opens the end modal and saves with `saveScore`. `/juegos/[id]/jugar` calls `notFound()` if the id is not in `games` or in the registry. Games without lives receive `onLives` and never call it.
- Adding a game touches: a migration (insert into `games` with the next `sort_order`, plus dropping and recreating `scores_insert_real_games` with the new id), `REAL_GAME_IDS`, `REAL_GAMES`, `.cover-<id>` in `app/globals.css` and a new row in `references/implemented-games.md`.
