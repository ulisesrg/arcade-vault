# Memoria de skin-designer

- Aquí se registra una línea por juego: paletas decididas (`clasico`, `neon`, `retro`) y contrastes principales, para no rediseñarlas ni repetir decisiones.
- Formato: `AAAA-MM-DD · <id> · skins: clasico/neon/retro · fondo <hex> · contraste mínimo <n>:1 · notas`.
- 2026-11-24 · asteroids · skins: clasico/neon/retro · fondo #000 / #05050a / #000 · contraste mínimo 5,3:1 (neon, asteroide grande magenta #ff006e) · neon: nave cian, asteroides por tamaño (amarillo/verde/magenta), glow 10; retro: CGA negro/cian/magenta/blanco, miter, sin glow.
- Infra común creada (2026-11-24): `app/games/skins.ts`, `skin-provider.tsx`, selector en nav (`.skin-picker`), prop `skin` en `RealCanvasProps`. Pendientes: tetris, arkanoid, snake. Patrón: paleta se pasa a `draw(ctx, pal)`; helpers `glow/noGlow` en entities.
