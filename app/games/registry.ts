// Registro de juegos con motor real. `GamePlayer` lo consulta por `game.id`:
// si el id no está aquí, `/juegos/[id]/jugar` responde con `notFound()`.
// Cada juego real nuevo se añade aquí, a `REAL_GAME_IDS` (app/actions/scores.ts)
// y a la política RLS de `scores` (nueva migración).

import type { ComponentType } from "react";
import { ArkanoidCanvas } from "../components/arkanoid-canvas";
import { AsteroidsCanvas } from "../components/asteroids-canvas";
import { SnakeCanvas } from "../components/snake-canvas";
import { TetrisCanvas } from "../components/tetris-canvas";
import type { SkinId } from "./skins";

export interface RealCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  skin: SkinId; // skin global; cambiarla no recrea el motor
  onScore: (n: number) => void;
  onLives: (n: number) => void; // los juegos sin vidas lo reciben y nunca lo invocan
  onLevel: (n: number) => void;
  onGameOver: () => void;
}

export interface RealGameEntry {
  Canvas: ComponentType<RealCanvasProps>;
  hud: { lives: boolean; level: boolean }; // casillas que muestra la barra
}

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { Canvas: AsteroidsCanvas, hud: { lives: true, level: true } },
  tetris: { Canvas: TetrisCanvas, hud: { lives: false, level: true } },
  arkanoid: { Canvas: ArkanoidCanvas, hud: { lives: true, level: true } },
  snake: { Canvas: SnakeCanvas, hud: { lives: false, level: true } },
};
