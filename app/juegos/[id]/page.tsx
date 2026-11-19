import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaderboard } from "../../components/leaderboard";
import { getGame, getLeaderboard } from "../../lib/games";

export default function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="av-detail" aria-busy="true">
          <span className="spinner" />
        </div>
      }
    >
      <GameDetail params={params} />
    </Suspense>
  );
}

async function GameDetail({
  params,
}: {
  params: PageProps<"/juegos/[id]">["params"];
}) {
  const { id } = await params;
  // En paralelo: la tabla de un id inexistente simplemente viene vacía y la
  // página termina en notFound().
  const [game, entries] = await Promise.all([
    getGame(id).catch(() => undefined),
    getLeaderboard(id, 10).catch(() => null),
  ]);

  if (game === undefined) {
    return (
      <div className="av-detail" role="alert">
        <div style={{ color: "var(--ink-faint)" }}>
          No se pudo cargar el juego. Inténtalo de nuevo en unos minutos.
        </div>
      </div>
    );
  }
  if (game === null) notFound();

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays.toLocaleString("es-ES")}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/biblioteca" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard entries={entries} />
      </aside>
    </div>
  );
}
