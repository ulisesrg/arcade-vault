# Game jam — DUELO DE PALETAS (`paletas`)

- **Tema recibido:** DUELO DE PALETAS (sugerencia de `game-planner`, encaje 4.4/5): primer juego VERSUS, uno contra la CPU con dificultad creciente por nivel, puntos por tanto más bonus por rally, fin cuando la CPU marca N tantos.
- **Fecha:** 2026-11-23

## Ficha del juego

| Campo                  | Valor                     |
| ---------------------- | ------------------------- |
| `id`                   | `paletas`                 |
| Título                 | DUELO DE PALETAS          |
| Categoría              | `VERSUS`                  |
| Color                  | `yellow`                  |
| `sort_order` propuesto | 4 (tras `snake` = 3)      |
| Cover / canvas         | `cover-paletas` / 800×600 |

## Variantes

|                   | A — `variante-a-marcador.md`                                                                  | B — `variante-b-remate.md`                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Mecánica          | Partida por tantos: 10 niveles de 3 tantos; la CPU sube de nivel y "perdona" 1 tanto al subir | Contrarreloj de 4 min con remate (`Espacio`), rachas y niveles por tiempo                  |
| Modelo de tiempo  | `dt` continuo con subpasos de ≤ 8 px                                                          | Paso fijo de 1/120 s con acumulador                                                        |
| Controles         | W/S o ↑/↓                                                                                     | W/S o ↑/↓ + `Espacio` (remate)                                                             |
| IA de la CPU      | Sigue la bola con retraso y error                                                             | Predice rebotes, con retraso y error                                                       |
| HUD de la barra   | Jugador, Puntuación, Nivel (sin vidas)                                                        | Jugador, Puntuación, Vidas, Nivel                                                          |
| Fin de partida    | CPU llega a 5 tantos, o victoria al marcar 30                                                 | 0 vidas (3) o reloj a cero                                                                 |
| Puntos            | `100 × nivel` por tanto + `10 × min(devoluciones, 30)` de rally + 1 000 de victoria           | `100 × min(racha, 5)` por tanto + 50 por remate no tocado + 200 por vida si acaba el reloj |
| Duración          | 1 a 6 min                                                                                     | 1 a 4 min de reloj                                                                         |
| Puntuación máxima | 26 500                                                                                        | 80 900 (cota teórica)                                                                      |
| Riesgo técnico    | Bajo: colisión con subpasos y IA simple                                                       | Medio: paso fijo, ventana de remate, predicción de rebotes y `Espacio` con foco en botones |

## Recomendación

**Variante A (marcador).** Cumple al pie de la letra la sugerencia (puntos por tanto más bonus por rally, fin por N tantos de la CPU, dificultad por nivel), usa el modelo de tiempo y el patrón de callbacks que ya conoce el repo (`dt` como Asteroids y Arkanoid) y tiene el menor riesgo. B es más rica y rejugable (remate, rachas), pero añade piezas nuevas (paso fijo, tecla extra, IA con predicción) que conviene dejar para una segunda iteración.

## Siguiente paso

1. Copiar la variante elegida a `specs/11-paletas-juego-real.md` (11 = mayor número de `specs/` + 1; comprobarlo antes de copiar).
2. Cambiar su cabecera a `# SPEC 11 — Duelo de paletas: quinto juego real con leaderboard`, el `Status` a `Borrador` y la lista `Depends on` si hace falta.
3. Lanzar `/spec-impl 11-paletas-juego-real`.

Todos los valores de reglas y los textos de la migración están marcados como propuestas a revisar.
