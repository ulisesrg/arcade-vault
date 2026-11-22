export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string; // slug de la URL, p. ej. "asteroids"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS, p. ej. "cover-asteroids"
  color: GameColor;
  best: number;
  plays: number; // COUNT(*) de partidas; la UI lo formatea
}

// Orden de los chips de categoría en /biblioteca. Solo se muestran las que
// tienen al menos un juego (ver library-browser.tsx).
export const CATEGORY_ORDER: GameCategory[] = [
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
