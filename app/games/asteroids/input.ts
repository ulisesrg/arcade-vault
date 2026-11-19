// Entrada de teclado del motor. Escucha en `window` solo entre attach() y detach().

export interface Input {
  /** Teclas actualmente pulsadas, por `KeyboardEvent.code`. */
  keys: Record<string, boolean>;
  /** true una sola vez por pulsación (se consume al leerla). */
  pressed: (code: string) => boolean;
  attach: () => void;
  detach: () => void;
  /** Suelta todas las teclas y descarta las pulsaciones pendientes. */
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
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};
  let attached = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };

  const clear = () => {
    for (const code of Object.keys(keys)) keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
  };

  // Al perder el foco no llega el keyup: sin esto la nave se queda propulsando.
  const onBlur = () => clear();

  return {
    keys,
    pressed(code) {
      const value = justPressed[code] === true;
      justPressed[code] = false;
      return value;
    },
    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", onBlur);
    },
    detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      clear();
    },
    clear,
  };
}
