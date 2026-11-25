// Skins globales de Arcade Vault. Cada juego define su paleta por skin en
// app/games/<id>/skins.ts. Solo son visuales: no afectan a reglas ni puntuación.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && SKIN_IDS.includes(value as SkinId);
}
