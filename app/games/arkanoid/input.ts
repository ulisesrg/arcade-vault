// Entrada de teclado del motor (← →). Escucha en `window` solo entre attach() y detach().

export interface Input {
  /** Teclas actualmente pulsadas, por `KeyboardEvent.code`. */
  keys: Record<string, boolean>;
  attach: () => void;
  detach: () => void;
  /** Suelta todas las teclas. */
  clear: () => void;
}

const BLOCKED_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

function isTextTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function createInput(): Input {
  const keys: Record<string, boolean> = {
    ArrowLeft: false,
    ArrowRight: false,
  };
  let attached = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (!BLOCKED_KEYS.has(e.code)) return;
    e.preventDefault();
    keys[e.code] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (BLOCKED_KEYS.has(e.code)) keys[e.code] = false;
  };

  const clear = () => {
    for (const code of Object.keys(keys)) keys[code] = false;
  };

  // Al perder el foco no llega el keyup: sin esto la paleta se queda moviéndose.
  const onBlur = () => clear();

  return {
    keys,
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
