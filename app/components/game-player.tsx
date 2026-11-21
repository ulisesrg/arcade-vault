"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveScore as saveScoreRemote } from "../actions/scores";
import type { Game } from "../data/games";
import { REAL_GAMES } from "../games/registry";
import { useSession } from "./session-provider";

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

const SCORES_KEY = "av_scores";

// Si la Server Action ni siquiera responde (p. ej. sin red) no hay mensaje del
// servidor: se usa este texto genérico, sin detalles del error.
const SAVE_ERROR = "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.";

function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const all: SavedScore[] = Array.isArray(parsed) ? parsed : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Bloquea el doble clic antes de que React pinte `saving` (evita duplicados).
  const savingRef = useRef(false);
  // Cambia en cada "JUGAR DE NUEVO": el juego real se destruye y se crea de cero.
  const [runId, setRunId] = useState(0);
  // Juegos con motor real (registro en app/games/registry.ts); el resto usa el simulador.
  const real = Object.hasOwn(REAL_GAMES, game.id)
    ? REAL_GAMES[game.id]
    : undefined;
  const isReal = real !== undefined;
  // Nombre editado en el modal; mientras sea null se usa la sesión (o INVITADO).
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? user?.name ?? "INVITADO";

  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  useEffect(() => {
    if (isReal) return;
    if (score > 0 && score % 2500 < 100) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevel((l) => l + 1);
    }
  }, [isReal, score]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
    savingRef.current = false;
    setRunId((id) => id + 1);
  };

  const handleSave = async () => {
    // Los simuladores conservan su guardado local; solo los juegos reales van a la BD.
    if (!isReal) {
      saveScore({ game: game.id, score, name });
      setSaved(true);
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveScoreRemote({ gameId: game.id, name, score });
      if (result.ok) setSaved(true);
      else setSaveError(result.error);
    } catch {
      setSaveError(SAVE_ERROR);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {(real?.hud.lives ?? true) && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={() => setOver(true)}
          >
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {real ? (
            <real.Canvas
              runId={runId}
              paused={paused || over}
              onScore={setScore}
              onLives={setLives}
              onLevel={setLevel}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameOverride(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && !saved && (
              <div
                role="alert"
                className="mono"
                style={{
                  color: "var(--magenta)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  margin: "10px 0",
                }}
              >
                ▸ {saveError}
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
