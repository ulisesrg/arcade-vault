import type { LeaderboardEntry } from "../lib/games";

// dd/mm/aaaa en UTC: el servidor y el navegador muestran siempre la misma fecha.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

const emptyStyle = {
  padding: "32px 12px",
  textAlign: "center",
  fontFamily: "var(--pixel)",
  fontSize: 11,
  lineHeight: 1.9,
  letterSpacing: "0.12em",
  color: "var(--ink-faint)",
} as const;

// Tabla de mejores puntuaciones de un juego. `entries` es `null` si la lectura
// falló (se muestra un aviso sin detalles del error).
export function Leaderboard({
  entries,
}: {
  entries: LeaderboardEntry[] | null;
}) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {entries === null ? (
        <div role="alert" style={emptyStyle}>
          NO SE PUDO CARGAR LA TABLA. INTÉNTALO DE NUEVO EN UNOS MINUTOS.
        </div>
      ) : entries.length === 0 ? (
        <div style={emptyStyle}>
          AÚN NO HAY PUNTUACIONES.
          <br />
          <span className="neon-yellow">¡SÉ EL PRIMERO!</span>
        </div>
      ) : (
        entries.map((r) => (
          <div
            key={r.rank}
            className={
              "lb-row" +
              (r.rank === 1
                ? " top1"
                : r.rank === 2
                  ? " top2"
                  : r.rank === 3
                    ? " top3"
                    : "")
            }
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {formatDate(r.createdAt)}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
