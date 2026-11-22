import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GamePlayer } from "../../../components/game-player";
import { REAL_GAMES } from "../../../games/registry";
import { getGame } from "../../../lib/games";

export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense
      fallback={
        <div className="av-player" aria-busy="true">
          <span className="spinner" />
        </div>
      }
    >
      <Player params={params} />
    </Suspense>
  );
}

async function Player({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = await getGame(id).catch(() => undefined);

  if (game === undefined) {
    return (
      <div className="av-player" role="alert">
        <div style={{ color: "var(--ink-faint)" }}>
          No se pudo cargar el juego. Inténtalo de nuevo en unos minutos.
        </div>
      </div>
    );
  }
  // Sin simulador: un juego sin motor en el registro no tiene qué renderizar.
  if (game === null || !Object.hasOwn(REAL_GAMES, game.id)) notFound();

  return <GamePlayer game={game} />;
}
