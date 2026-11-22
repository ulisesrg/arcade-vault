// Capa de acceso a datos de juegos y puntuaciones. Solo servidor: usa el
// cliente de `supabase/server.ts` (que lee `cookies()`), así que debe llamarse
// desde Server Components dentro de <Suspense> o desde Server Actions.
import "server-only";
import type { Game, GameCategory, GameColor } from "@/app/data/games";
import type { Database } from "@/app/lib/supabase/database.types";
import { createClient } from "@/app/lib/supabase/server";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  createdAt: string; // ISO; la UI lo formatea "dd/mm/aaaa"
}

type GameStatsRow = Database["public"]["Views"]["games_with_stats"]["Row"];

// Las columnas de una vista llegan como `| null` en los tipos generados, aunque
// en la práctica nunca lo son. Si faltara alguna, la fila se descarta.
function toGame(row: GameStatsRow): Game | null {
  if (
    row.id === null ||
    row.title === null ||
    row.short === null ||
    row.long === null ||
    row.cat === null ||
    row.cover === null ||
    row.color === null
  ) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
    best: row.best ?? 0,
    plays: row.plays ?? 0,
  };
}

// Catálogo completo en el orden original (`sort_order`).
export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getGames falló:", error.message);
    throw new Error("No se pudo cargar el catálogo de juegos");
  }

  return (data ?? []).flatMap((row) => {
    const game = toGame(row);
    return game ? [game] : [];
  });
}

// Un juego por id, o `null` si no existe.
export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getGame falló:", error.message);
    throw new Error("No se pudo cargar el juego");
  }

  return data ? toGame(data) : null;
}

// Top `limit` de un juego: mayor puntaje primero y, a igualdad, quien llegó
// antes. `rank` (1..N) se calcula aquí, no se guarda.
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getLeaderboard falló:", error.message);
    throw new Error("No se pudo cargar la tabla de puntuaciones");
  }

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    createdAt: row.created_at,
  }));
}

export interface RecentScore {
  name: string;
  gameTitle: string;
  gameColor: GameColor; // games.color; la home lo usa como clase neon-*
  score: number;
  createdAt: string; // ISO; la UI lo muestra con formatAgo
}

export interface TopScore {
  rank: number;
  name: string;
  score: number;
}

// Últimas `limit` partidas guardadas de cualquier juego, la más reciente primero.
export async function getRecentScores(limit: number): Promise<RecentScore[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at, games(title, color)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentScores falló:", error.message);
    throw new Error("No se pudieron cargar las últimas puntuaciones");
  }

  return (data ?? []).flatMap((row) =>
    row.games
      ? [
          {
            name: row.name,
            gameTitle: row.games.title,
            gameColor: row.games.color as GameColor,
            score: row.score,
            createdAt: row.created_at,
          },
        ]
      : [],
  );
}

// Mejores `limit` puntajes entre todos los juegos: mayor puntaje primero y, a
// igualdad, quien llegó antes. `rank` (1..N) se calcula aquí, no se guarda.
export async function getTopScores(limit: number): Promise<TopScore[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getTopScores falló:", error.message);
    throw new Error("No se pudo cargar el top de jugadores");
  }

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
  }));
}
