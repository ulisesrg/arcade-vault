import { Suspense } from "react";
import Link from "next/link";
import { HallBoard } from "../components/hall-board";
import type { LeaderboardEntry } from "../lib/games";
import { getGames, getLeaderboard } from "../lib/games";

const TOP = 12;

export default function SalonPage() {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <Suspense
        fallback={
          <div style={{ textAlign: "center", padding: 80 }} aria-busy="true">
            <span className="spinner" />
          </div>
        }
      >
        <Hall />
      </Suspense>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

// Carga los juegos y el top de cada uno (en paralelo) con una sola pasada.
async function loadHall() {
  const games = await getGames();
  const tops = await Promise.all(games.map((g) => getLeaderboard(g.id, TOP)));
  const boards: Record<string, LeaderboardEntry[]> = {};
  games.forEach((g, i) => {
    boards[g.id] = tops[i];
  });
  return { games, boards };
}

async function Hall() {
  const data = await loadHall().catch(() => null);

  if (!data) {
    return (
      <div
        role="alert"
        style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}
      >
        <div
          className="pixel"
          style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
        >
          NO SE PUDO CARGAR EL SALÓN
        </div>
        <div>Inténtalo de nuevo en unos minutos.</div>
      </div>
    );
  }

  return <HallBoard games={data.games} boards={data.boards} />;
}
