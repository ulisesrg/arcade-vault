"use client";

import { useEffect, useRef } from "react";
import {
  createSnake,
  type SnakeCallbacks,
  type SnakeHandle,
} from "../games/snake/engine";

interface SnakeCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  onScore: (n: number) => void;
  onLives: (n: number) => void; // se recibe por el registro y nunca se llama (no hay vidas)
  onLevel: (n: number) => void;
  onGameOver: () => void;
}

export function SnakeCanvas({
  runId,
  paused,
  onScore,
  onLevel,
  onGameOver,
}: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SnakeHandle | null>(null);

  // Los callbacks viven en una ref: así el motor no se recrea cuando cambia
  // su identidad en cada render. Siempre se llama a la versión más reciente.
  const callbacksRef = useRef<SnakeCallbacks>({
    onScore,
    onLevel,
    onGameOver,
  });
  useEffect(() => {
    callbacksRef.current = { onScore, onLevel, onGameOver };
  });

  // Motor: se crea al montar y cada vez que cambia runId; la limpieza lo destruye.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = createSnake(canvas, {
      onScore: (n) => callbacksRef.current.onScore(n),
      onLevel: (n) => callbacksRef.current.onLevel(n),
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
    <canvas
      ref={canvasRef}
      className="snake-canvas"
      width={800}
      height={600}
      aria-label="Juego Víbora"
    />
  );
}
