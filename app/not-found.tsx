import Link from "next/link";

export default function NotFound() {
  return (
    <div className="av-hero fade-in" style={{ padding: "96px 24px" }}>
      <div
        className="pixel neon-magenta flicker"
        style={{ fontSize: "clamp(40px, 12vw, 96px)" }}
      >
        404
      </div>
      <h1
        className="pixel neon-cyan"
        style={{
          fontSize: "clamp(14px, 3vw, 24px)",
          margin: "24px 0 12px",
          background: "none",
          filter: "none",
          color: "var(--cyan)",
        }}
      >
        GAME OVER · PÁGINA NO ENCONTRADA
      </h1>
      <p style={{ color: "var(--ink-dim)", margin: "0 0 32px" }}>
        Esta pantalla no existe en el Vault. Inserta otra moneda e inténtalo de
        nuevo.
      </p>
      <Link href="/" className="btn lg">
        VOLVER AL VAULT
      </Link>
    </div>
  );
}
