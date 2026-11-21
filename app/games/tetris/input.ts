// Entrada de teclado del motor. Escucha en `window` solo entre attach() y detach().
// Cada `keydown` (incluidas las repeticiones del sistema) se encola y el motor
// los aplica en el siguiente update con drain().

export interface Input {
  /** Devuelve y vacía los `code` de los keydown desde la última llamada. */
  drain: () => string[];
  attach: () => void;
  detach: () => void;
  /** Con false (pausa o game over) no se encola nada y se descarta la cola. */
  setActive: (active: boolean) => void;
  /** Descarta las pulsaciones pendientes. */
  clear: () => void;
}

const BLOCKED_KEYS = new Set([
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

function isTextTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function createInput(): Input {
  let queue: string[] = [];
  let attached = false;
  let active = true;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (!active) return;
    queue.push(e.code);
  };

  const clear = () => {
    queue = [];
  };

  // Al perder el foco se descartan las pulsaciones pendientes.
  const onBlur = () => clear();

  return {
    drain() {
      const codes = queue;
      queue = [];
      return codes;
    },
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
      clear();
    },
    setActive(value) {
      active = value;
      if (!value) clear();
    },
    clear,
  };
}
