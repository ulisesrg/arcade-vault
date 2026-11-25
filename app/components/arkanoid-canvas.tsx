"use client";

import { useEffect, useRef } from "react";
import {
  createArkanoid,
  type ArkanoidCallbacks,
  type ArkanoidHandle,
} from "../games/arkanoid/engine";
import { DEFAULT_SKIN, type SkinId } from "../games/skins";

interface ArkanoidCanvasProps {
  runId: number; // al cambiar, se destruye el motor y se crea una partida nueva
  paused: boolean; // true = motor en pausa (PAUSA o modal de fin)
  skin?: SkinId; // cambiarla no recrea el motor
  onScore: (n: number) => void;
  onLives: (n: number) => void;
  onLevel: (n: number) => void;
  onGameOver: () => void;
}

export function ArkanoidCanvas({
  runId,
  paused,
  skin = DEFAULT_SKIN,
  onScore,
  onLives,
  onLevel,
  onGameOver,
}: ArkanoidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ArkanoidHandle | null>(null);

  // Los callbacks viven en una ref: así el motor no se recrea cuando cambia
  // su identidad en cada render. Siempre se llama a la versión más reciente.
  const callbacksRef = useRef<ArkanoidCallbacks>({
    onScore,
    onLives,
    onLevel,
    onGameOver,
  });
  useEffect(() => {
    callbacksRef.current = { onScore, onLives, onLevel, onGameOver };
  });

  // Skin vigente para el motor recién creado, sin hacerla dependencia del efecto.
  const skinRef = useRef<SkinId>(skin);
  useEffect(() => {
    skinRef.current = skin;
  });

  // Motor: se crea al montar y cada vez que cambia runId; la limpieza lo destruye.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = createArkanoid(
      canvas,
      {
        onScore: (n) => callbacksRef.current.onScore(n),
        onLives: (n) => callbacksRef.current.onLives(n),
        onLevel: (n) => callbacksRef.current.onLevel(n),
        onGameOver: () => callbacksRef.current.onGameOver(),
      },
      { skin: skinRef.current },
    );
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
    <canvas
      ref={canvasRef}
      className="arkanoid-canvas"
      width={800}
      height={600}
      aria-label="Juego Rompebloques"
    />
  );
}
