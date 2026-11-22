// Contenido de la landing. Las partidas, los jugadores y los conteos salen de
// Supabase (app/lib/games.ts); aquí solo queda texto fijo.

export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: NeonColor;
}

// Bloque de estadísticas. `key` indica de dónde sale el número: "games" y
// "plays" se calculan en app/page.tsx con los datos reales; "fixed" usa `n`.
export interface HomeStat {
  key: "games" | "plays" | "fixed";
  n?: string; // solo con key "fixed"
  u: string;
  s: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "GAMEPAD",
    title: "JUEGOS CLÁSICOS",
    desc: "Asteroids y Apilador ya se juegan en tu navegador. Los grandes arcades clásicos van llegando uno a uno.",
    color: "cyan",
  },
  {
    icon: "FREE",
    title: "100% GRATIS",
    desc: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    color: "yellow",
  },
  {
    icon: "TROPHY",
    title: "LADDER BOARDS",
    desc: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
    color: "magenta",
  },
  {
    icon: "ROCKET",
    title: "SIEMPRE CRECIENDO",
    desc: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    color: "green",
  },
];

export const HOME_STATS: HomeStat[] = [
  { key: "games", u: "JUEGOS", s: "Y CONTANDO" },
  { key: "plays", u: "PARTIDAS", s: "GUARDADAS EN EL RANKING" },
  { key: "fixed", n: "GLOBAL", u: "RANKING", s: "COMPITE CON EL MUNDO" },
];

export const PRICING_PERKS: string[] = [
  "Acceso a todos los juegos",
  "Ranking global y salón de la fama",
  "Sin anuncios entre partidas",
  "Guarda tus puntuaciones",
  "Nuevos juegos cada mes",
  "Funciona en cualquier navegador",
];

export const FAQ: FaqItem[] = [
  {
    q: "¿REALMENTE ES GRATIS?",
    a: 'Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión "premium" escondida.',
  },
  {
    q: "¿NECESITO CREAR CUENTA?",
    a: "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
  },
  {
    q: "¿CÓMO SOBREVIVEN SIN COBRAR?",
    a: "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
  },
];
