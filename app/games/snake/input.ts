// Entrada de teclado del motor (↑ ↓ ← →). Escucha en `window` solo entre attach() y detach().
// Las flechas se acumulan en una cola que el motor lee con drain().

import type { Dir } from "./constants";

export interface Input {
  attach: () => void;
  detach: () => void;
  /** Flechas pulsadas desde la última lectura (por `code`), en orden. Vacía la cola. */
  drain: () => Dir[];
  /** false descarta la cola y bloquea nuevas pulsaciones (pausa, fin de partida). */
  setActive: (active: boolean) => void;
}

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function isTextTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function createInput(): Input {
  let queue: Dir[] = [];
  let active = true;
  let attached = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    const dir = KEY_TO_DIR[e.code];
    if (!dir) return;
    e.preventDefault(); // evita el scroll de la página
    if (!active || e.repeat) return;
    queue.push(dir);
  };

  // Al perder el foco se descartan las pulsaciones pendientes.
  const onBlur = () => {
    queue = [];
  };

  return {
    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("blur", onBlur);
    },
    detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      queue = [];
    },
    drain() {
      const out = queue;
      queue = [];
      return out;
    },
    setActive(value) {
      active = value;
      if (!value) queue = [];
    },
  };
}
