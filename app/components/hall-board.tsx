"use client";

import { useState } from "react";
import type { Game } from "../data/games";
import { formatDate } from "../lib/format-date";
import type { LeaderboardEntry } from "../lib/games";

const fmt = (n: number) => n.toLocaleString("es-ES");

// Hueco del podio cuando hay menos de 3 puntuaciones.
function PodiumSlot({
  entry,
  medal,
  num,
  champion = false,
}: {
  entry: LeaderboardEntry | undefined;
  medal: "gold" | "silver" | "bronze";
  num: string;
  champion?: boolean;
}) {
  return (
    <div className={"podium-slot " + medal}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {num}
      </div>
      <div className="name">{entry ? entry.name : "—"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {entry ? fmt(entry.score) : "—"}
      </div>
      <div className="date">{entry ? formatDate(entry.createdAt) : " "}</div>
    </div>
  );
}

export function HallBoard({
  games,
  boards,
}: {
  games: Game[];
  boards: Record<string, LeaderboardEntry[]>;
}) {
  const [tab, setTab] = useState(games[0]?.id ?? "");
  const rows = boards[tab] ?? [];

  return (
    <>
      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          className="hall-table"
          style={{
            padding: "56px 16px",
            textAlign: "center",
            fontFamily: "var(--pixel)",
            fontSize: 12,
            lineHeight: 2,
            letterSpacing: "0.12em",
            color: "var(--ink-faint)",
          }}
        >
          AÚN NO HAY PUNTUACIONES.
          <br />
          <span className="neon-yellow">¡SÉ EL PRIMERO!</span>
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot entry={rows[1]} medal="silver" num="02" />
            <PodiumSlot entry={rows[0]} medal="gold" num="01" champion />
            <PodiumSlot entry={rows[2]} medal="bronze" num="03" />
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${tab}-${r.rank}`}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{formatDate(r.createdAt)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
