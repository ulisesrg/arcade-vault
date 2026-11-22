"use client";

import { useMemo, useState } from "react";
import { CATEGORY_ORDER, type Game, type GameCategory } from "../data/games";
import { GameCard } from "./game-card";

export function LibraryBrowser({ games }: { games: Game[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"TODOS" | GameCategory>("TODOS");

  // Solo las categorías que tienen al menos un juego.
  const categories = useMemo(
    () => [
      "TODOS" as const,
      ...CATEGORY_ORDER.filter((c) => games.some((g) => g.cat === c)),
    ],
    [games],
  );

  const filtered = useMemo(
    () =>
      games.filter(
        (g) =>
          (cat === "TODOS" || g.cat === cat) &&
          g.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [games, q, cat],
  );

  return (
    <>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
            aria-label="Buscar un juego por nombre"
          />
        </div>
        <div className="av-chips">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 14,
                color: "var(--magenta)",
                marginBottom: 12,
              }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </>
  );
}
