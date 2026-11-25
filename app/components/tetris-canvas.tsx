"use client";

import { useEffect, useRef, useState } from "react";
import { createTetris, type TetrisHandle } from "../games/tetris/engine";
import { DEFAULT_SKIN, type SkinId } from "../games/skins";
import { BOARD_H, BOARD_W, NEXT_SIZE } from "../games/tetris/constants";

// Medidas del grupo a escala 1: tablero 302 (300 + borde) + 20 + panel 160 × 602.
const GROUP_W = 482;
const GROUP_H = 602;

interface TetrisCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  skin?: SkinId; // cambiarla no recrea el motor
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
  skin = DEFAULT_SKIN,
  onScore,
  onLevel,
  onGameOver,
}: TetrisCanvasProps) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<TetrisHandle | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Escala uniforme del grupo al marco CRT. Null hasta medir: el grupo no se
  // muestra antes, así no parpadea con un tamaño equivocado.
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // El callback del observer se ejecuta al empezar a observar (primera
    // medición) y en cada cambio de tamaño del marco.
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      setScale(Math.min(width / GROUP_W, height / GROUP_H));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Valores del panel: se reinician con runId y se alimentan de los callbacks.
  const [stats, setStats] = useState<Stats>(() => initialStats(runId));
  if (stats.runId !== runId) setStats(initialStats(runId));

  // Los callbacks viven en una ref: así el motor no se recrea cuando cambia
  // su identidad en cada render. Siempre se llama a la versión más reciente.
  const callbacksRef = useRef({ onScore, onLevel, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onScore, onLevel, onGameOver };
  });

  // Skin vigente para el motor recién creado, sin hacerla dependencia del efecto.
  const skinRef = useRef<SkinId>(skin);
  useEffect(() => {
    skinRef.current = skin;
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
    }, { skin: skinRef.current });
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [runId]);

  // Skin: cambia la paleta en caliente, sin reiniciar la partida.
  useEffect(() => {
    handleRef.current?.setSkin(skin);
  }, [skin, runId]);

  // Pausa: se declara después del motor para reaplicarse tras recrearlo.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (paused) handle.pause();
    else handle.resume();
  }, [paused, runId]);

  return (
    <div ref={stageRef} className="tetris-stage">
      <div
        className="tetris-group"
        style={{
          visibility: scale === null ? "hidden" : "visible",
          transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
        }}
      >
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
