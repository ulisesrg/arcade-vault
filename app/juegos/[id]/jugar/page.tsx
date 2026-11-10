import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "../../../data/games";
import { getGame } from "../../../data/scores";
import { GamePlayer } from "../../../components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

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
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
