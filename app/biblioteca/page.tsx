import { Suspense } from "react";
import { LibraryBrowser } from "../components/library-browser";
import { getGames } from "../lib/games";

export default function BibliotecaPage() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Suspense
        fallback={
          <div style={{ textAlign: "center", padding: 80 }} aria-busy="true">
            <span className="spinner" />
          </div>
        }
      >
        <Library />
      </Suspense>
    </div>
  );
}

async function Library() {
  const games = await getGames().catch(() => null);

  if (!games) {
    return (
      <div
        role="alert"
        style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}
      >
        <div
          className="pixel"
          style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
        >
          NO SE PUDO CARGAR EL CATÁLOGO
        </div>
        <div>Inténtalo de nuevo en unos minutos.</div>
      </div>
    );
  }

  return <LibraryBrowser games={games} />;
}
