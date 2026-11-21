"use client";

import { useEffect, useRef, useState } from "react";
import { createTetris, type TetrisHandle } from "../games/tetris/engine";
import { BOARD_H, BOARD_W, NEXT_SIZE } from "../games/tetris/constants";

interface TetrisCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  onScore: (n: number) => void;
  onLives: (n: number) => void; // el juego no tiene vidas: se acepta y se ignora
  onLevel: (n: number) => void;
  onGameOver: () => void;
}

interface Stats {
  runId: number;
  score: number;
  lines: number;
  level: number;
}

const initialStats = (runId: number): Stats => ({
  runId,
  score: 0,
  lines: 0,
  level: 1,
});

const fmt = (n: number) => n.toLocaleString("es-ES");

export function TetrisCanvas({
  runId,
  paused,
  onScore,
  onLevel,
  onGameOver,
}: TetrisCanvasProps) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<TetrisHandle | null>(null);

  // Valores del panel: se reinician con runId y se alimentan de los callbacks.
  const [stats, setStats] = useState<Stats>(() => initialStats(runId));
  if (stats.runId !== runId) setStats(initialStats(runId));

  // Los callbacks viven en una ref: así el motor no se recrea cuando cambia
  // su identidad en cada render. Siempre se llama a la versión más reciente.
  const callbacksRef = useRef({ onScore, onLevel, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onScore, onLevel, onGameOver };
  });

  // Motor: se crea al montar y cada vez que cambia runId; la limpieza lo destruye.
  useEffect(() => {
    const board = boardRef.current;
    const next = nextRef.current;
    if (!board || !next) return;
    const handle = createTetris(board, next, {
      onScore: (n) => {
        setStats((s) => ({ ...s, score: n }));
        callbacksRef.current.onScore(n);
      },
      onLines: (n) => setStats((s) => ({ ...s, lines: n })),
      onLevel: (n) => {
        setStats((s) => ({ ...s, level: n }));
        callbacksRef.current.onLevel(n);
      },
      onGameOver: () => callbacksRef.current.onGameOver(),
    });
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [runId]);

  // Pausa: se declara después del motor para reaplicarse tras recrearlo.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (paused) handle.pause();
    else handle.resume();
  }, [paused, runId]);

  return (
    <div className="tetris-stage">
      <div className="tetris-group">
        <canvas
          ref={boardRef}
          className="tetris-board"
          width={BOARD_W}
          height={BOARD_H}
          aria-label="Tablero de Tetris"
        />
        <aside className="tetris-panel">
          <div className="tetris-section">
            <span className="tetris-label">PUNTUACIÓN</span>
            <span className="tetris-value">{fmt(stats.score)}</span>
          </div>
          <div className="tetris-section">
            <span className="tetris-label">LÍNEAS</span>
            <span className="tetris-value">{fmt(stats.lines)}</span>
          </div>
          <div className="tetris-section">
            <span className="tetris-label">NIVEL</span>
            <span className="tetris-value">{fmt(stats.level)}</span>
          </div>
          <div className="tetris-section">
            <span className="tetris-label">SIGUIENTE</span>
            <canvas
              ref={nextRef}
              className="tetris-next"
              width={NEXT_SIZE}
              height={NEXT_SIZE}
              aria-label="Siguiente pieza"
            />
          </div>
          <div className="tetris-section tetris-controls">
            <span className="tetris-label">CONTROLES</span>
            <ul>
              <li>
                <kbd>←</kbd>
                <kbd>→</kbd> mover
              </li>
              <li>
                <kbd>↑</kbd> rotar
              </li>
              <li>
                <kbd>↓</kbd> bajar
              </li>
              <li>
                <kbd>Espacio</kbd> caída
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
