// Bloques de la home que leen Supabase (estadísticas y actividad). Son Server
// Components async: el llamador los envuelve en <Suspense> porque el cliente de
// servidor lee `cookies()` (ver CLAUDE.md, `cacheComponents`).
import type { ReactNode } from "react";
import { connection } from "next/server";
import { HOME_STATS } from "../../data/home";
import { formatAgo } from "../../lib/format-date";
import { getGames, getRecentScores, getTopScores } from "../../lib/games";

const num = (n: number) => n.toLocaleString("es-ES");

function Empty({ children }: { children: ReactNode }) {
  return <div className="activity-empty">{children}</div>;
}

const EMPTY = (
  <Empty>
    AÚN NO HAY PUNTUACIONES.
    <br />
    <span className="neon-yellow">¡SÉ EL PRIMERO!</span>
  </Empty>
);

const FAILED = (
  <div role="alert" className="activity-empty">
    NO SE PUDO CARGAR. INTÉNTALO DE NUEVO EN UNOS MINUTOS.
  </div>
);

// Bloques de estadísticas. Con `counts` en `null` (cargando o con error) los
// números reales se muestran como "—".
function StatBlocks({
  counts,
}: {
  counts: { games: number; plays: number } | null;
}) {
  return HOME_STATS.map((st, i) => {
    const n = st.key === "fixed" ? st.n : counts ? num(counts[st.key]) : "—";
    return (
      <div
        key={st.u}
        className="stat-block"
        style={{ transitionDelay: i * 90 + "ms" }}
      >
        <div className="stat-n neon-yellow">{n}</div>
        <div className="stat-u pixel">{st.u}</div>
        <div className="stat-s">{st.s}</div>
      </div>
    );
  });
}

export function StatsFallback() {
  return <StatBlocks counts={null} />;
}

// JUEGOS = juegos del catálogo; PARTIDAS = suma de `plays` (COUNT de scores).
export async function Stats() {
  const games = await getGames().catch(() => null);
  const counts = games
    ? {
        games: games.length,
        plays: games.reduce((sum, g) => sum + g.plays, 0),
      }
    : null;
  return <StatBlocks counts={counts} />;
}

export function ActivityFallback({ className }: { className: string }) {
  return (
    <div className={className} aria-busy="true">
      <span className="spinner" />
    </div>
  );
}

// Últimas partidas guardadas de cualquier juego, la más reciente primero.
export async function RecentScores() {
  // `formatAgo` usa Date.now(): se pide la petición antes para no prerenderizarlo.
  await connection();
  const rows = await getRecentScores(7).catch(() => null);
  if (rows === null) return FAILED;
  if (rows.length === 0) return EMPTY;

  return (
    <div className="ticker">
      {rows.map((r, i) => (
        <div
          key={r.createdAt + r.name + i}
          className="tick-row"
          style={{ animationDelay: i * 60 + "ms" }}
        >
          <span className={"tk-p neon-" + r.gameColor}>{r.name}</span>
          <span className="tk-mid">▸ {r.gameTitle}</span>
          <span className="tk-s">+{num(r.score)}</span>
          <span className="tk-t">{formatAgo(r.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

// Los 5 mejores puntajes de todos los juegos.
export async function TopPlayers() {
  const rows = await getTopScores(5).catch(() => null);
  if (rows === null) return FAILED;
  if (rows.length === 0) return EMPTY;

  return (
    <div className="top-list">
      {rows.map((r, i) => (
        <div
          key={r.rank}
          className={"top-row" + (i < 3 ? " top" + (i + 1) : "")}
        >
          <span className="tp-rk">#{String(r.rank).padStart(2, "0")}</span>
          <span className="tp-bar">
            <span className="tp-fill" style={{ width: 100 - i * 16 + "%" }} />
          </span>
          <span className="tp-p">{r.name}</span>
          <span className="tp-s">{num(r.score)}</span>
        </div>
      ))}
    </div>
  );
}
