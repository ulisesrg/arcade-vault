"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Elemento que aparece con animación al entrar en el viewport.
// Por defecto es una <section>; `as` permite usar otro elemento (p. ej. un div).
export function Reveal({
  as: Tag = "section",
  className = "",
  children,
}: {
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
}) {
  // Tipado como div para que TS acepte la ref en ambos elementos; solo se
  // usa para IntersectionObserver, que no depende del tipo concreto.
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag ref={ref} className={`${className} reveal${shown ? " in" : ""}`}>
      {children}
    </Tag>
  );
}
