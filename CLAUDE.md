# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: an online games platform where players compete for the highest score. The project follows a spec-driven workflow (`/spec` and `/spec-impl`, from the skills at https://github.com/Klerith/fernando-skills, installed with `npx skills@latest add Klerith/fernando-skills`). The README is written in Spanish. The codebase is still the bare `create-next-app` scaffold (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`).

No test runner is configured yet.

## Next.js version warning

This uses Next.js 16.4.5 with React 19.3, and its APIs differ from older versions. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next.js code, and heed deprecation notices.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Architecture notes

- App Router only (`app/`). The root layout uses the global `LayoutProps<"/">` type instead of an explicit props interface.
- `next.config.ts` turns on `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`. `cacheComponents` changes the caching and rendering model, so check the docs before using data fetching or dynamic APIs.
- Tailwind v4 is wired through Turbopack: a `*.css` rule using `@tailwindcss/turbopack` in `next.config.ts`. Theme tokens live in `app/globals.css` under `@theme inline`, with light and dark values set through `prefers-color-scheme`.
- Contact form (`/acerca-de`): the Server Action `app/actions/contact.ts` (`sendContact`) validates on the server (required fields, email format, max lengths, `website` honeypot) and sends a plain-text email with the `resend` SDK. The client form is `app/components/about/contact-form.tsx` (`useActionState`). Errors shown to the user are generic Spanish messages; the real cause is only logged on the server.
- Environment variables (set in `.env.local`, documented in `.env.example`; never commit real values): `RESEND_API_KEY` (required), `CONTACT_TO_EMAIL` (required) and `CONTACT_FROM_EMAIL` (optional, defaults to `Arcade Vault <onboarding@resend.dev>`). With Resend's test sender (`onboarding@resend.dev`), mail is only delivered to the Resend account's own address, so `CONTACT_TO_EMAIL` must be that address until a sending domain is verified. Only read these in server code (`"use server"`), never in Client Components.
- Supabase (foundation only, spec 04): two clients in `app/lib/supabase/`. `server.ts` exports `async createClient()` (`createServerClient` + `next/headers` cookies) for Server Components, Server Actions and Route Handlers; with `cacheComponents`, `cookies()` is a request-time API, so call it inside `<Suspense>` or a dynamic context. `client.ts` exports `createClient()` (`createBrowserClient`) for Client Components only. Both throw an error naming the missing variable (never its value). Variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both required, public by design); `SUPABASE_DB_PASSWORD` is only used by the Supabase CLI, the app never reads it. Use only the publishable key: never `service_role` or the secret key, with or without the `NEXT_PUBLIC_` prefix. There are no tables, no `proxy.ts` and no Supabase Auth yet: the session (`av_user`) and scores (`av_scores`) are still simulated in `localStorage`. In server code never trust `auth.getSession()`; use `auth.getClaims()`.
- Path alias: `@/*` maps to the project root.
- Fonts: Geist and Geist Mono are loaded in `app/layout.tsx` as the CSS variables `--font-geist-sans` and `--font-geist-mono`.
