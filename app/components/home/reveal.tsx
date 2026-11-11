"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Sección que aparece con animación al entrar en el viewport.
export function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
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
    <section ref={ref} className={`${className} reveal${shown ? " in" : ""}`}>
      {children}
    </section>
  );
}
