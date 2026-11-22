"use server";

import { createClient } from "@/app/lib/supabase/server";

export type SaveScoreResult = { ok: true } | { ok: false; error: string };

// Juegos reales: Asteroids, Tetris, Arkanoid y Víbora (la política RLS `scores_insert_real_games`
// de `scores` también lo exige). Cada juego real nuevo se añade aquí y en la política.
const REAL_GAME_IDS = new Set(["asteroids", "tetris", "arkanoid", "snake"]);
const MAX_NAME = 10;
const MAX_SCORE = 10_000_000;

const GENERIC_ERROR = "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.";

// Una Server Action se puede invocar con un POST directo, así que los datos
// llegan sin tipar: se comprueba todo en el servidor, no solo en la interfaz.
export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SaveScoreResult> {
  const {
    gameId,
    name: rawName,
    score,
  } = (input ?? {}) as Partial<Record<"gameId" | "name" | "score", unknown>>;

  if (typeof gameId !== "string" || !REAL_GAME_IDS.has(gameId)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (typeof rawName !== "string") {
    return { ok: false, error: GENERIC_ERROR };
  }
  const name = rawName.trim().toUpperCase();
  // Array.from cuenta caracteres reales, igual que char_length en Postgres.
  const nameLength = Array.from(name).length;
  if (nameLength < 1 || nameLength > MAX_NAME) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, error: GENERIC_ERROR };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, name, score });

    if (error) {
      console.error("[scores] Supabase devolvió un error:", error.message);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[scores] Fallo al guardar la puntuación:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}
