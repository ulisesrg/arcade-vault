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
- Path alias: `@/*` maps to the project root.
- Fonts: Geist and Geist Mono are loaded in `app/layout.tsx` as the CSS variables `--font-geist-sans` and `--font-geist-mono`.
