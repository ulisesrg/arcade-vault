export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string; // slug de la URL, p. ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS, p. ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: number; // COUNT(*) de partidas; la UI lo formatea
}

export const CATEGORIES: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
