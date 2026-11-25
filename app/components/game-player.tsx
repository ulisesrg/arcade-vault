"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { saveScore as saveScoreRemote } from "../actions/scores";
import type { Game } from "../data/games";
import { REAL_GAMES } from "../games/registry";
import { useSession } from "./session-provider";
import { useSkin } from "./skin-provider";

// Si la Server Action ni siquiera responde (p. ej. sin red) no hay mensaje del
// servidor: se usa este texto genérico, sin detalles del error.
const SAVE_ERROR = "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.";

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const { skin } = useSkin();
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
  // Motor del juego (registro en app/games/registry.ts). La página de jugar ya
  // responde 404 si el id no está en el registro; aquí solo se estrecha el tipo.
  const real = Object.hasOwn(REAL_GAMES, game.id)
    ? REAL_GAMES[game.id]
    : undefined;
  // Nombre editado en el modal; mientras sea null se usa la sesión (o INVITADO).
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? user?.name ?? "INVITADO";

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

  if (!real) return null;

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
          {real.hud.lives && (
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
          <real.Canvas
            runId={runId}
            paused={paused || over}
            skin={skin}
            onScore={setScore}
            onLives={setLives}
            onLevel={setLevel}
            onGameOver={() => setOver(true)}
          />
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
              <Link href={`/juegos/${game.id}`} className="btn green">
                VER PUNTUACIONES
              </Link>
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
