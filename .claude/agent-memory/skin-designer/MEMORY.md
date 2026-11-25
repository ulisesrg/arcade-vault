# Memoria de skin-designer

- Aquí se registra una línea por juego: paletas decididas (`clasico`, `neon`, `retro`) y contrastes principales, para no rediseñarlas ni repetir decisiones.
- Formato: `AAAA-MM-DD · <id> · skins: clasico/neon/retro · fondo <hex> · contraste mínimo <n>:1 · notas`.
- 2026-11-24 · asteroids · skins: clasico/neon/retro · fondo #000 / #05050a / #000 · contraste mínimo 5,3:1 (neon, asteroide grande magenta #ff006e) · neon: nave cian, asteroides por tamaño (amarillo/verde/magenta), glow 10; retro: CGA negro/cian/magenta/blanco, miter, sin glow.
- 2026-11-24 · tetris · skins: clasico/neon/retro · fondo #1a1a25 (CSS) / #05050a / #000 · contraste mínimo 4,84:1 (clasico, T) · neon: glow 8, piezas cian/amarillo/violeta/verde/magenta/azul/naranja; retro: CGA con relleno macizo, punteado y hueco, sin glow. Marco y panel HTML (globals.css) iguales en las tres skins.
- 2026-11-24 · snake · skins: clasico/neon/retro · fondo #05060f / #04040a / #000 · contraste mínimo 5,3:1 (neon, fruta magenta #ff006e) · neon: cuerpo #00ff88, cabeza #f5ff00, frutas por forma, glow 10; retro: CGA cian/magenta/blanco, miter, sin glow.
- 2026-11-24 · arkanoid · skins: clasico/neon/retro · fondo #000 / #05050a / #000 · contraste mínimo 5,3:1 (neon, bloque rosa #ff006e) · clasico con sprites; neon con primitivas y glow 8; retro CGA de 5 colores. Gris = bloque hueco y rojo = bloque con raya oscura.
- Infra común creada (2026-11-24): `app/games/skins.ts`, `skin-provider.tsx`, selector en nav (`.skin-picker`), prop `skin` en `RealCanvasProps`. Los 4 juegos reales ya tienen skins. Patrón: paleta se pasa a `draw(ctx, pal)`; helpers `glow/noGlow` en entities.
