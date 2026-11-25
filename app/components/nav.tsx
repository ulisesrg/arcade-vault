"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SKIN_IDS, SKIN_LABELS } from "../games/skins";
import { useSession } from "./session-provider";
import { useSkin } from "./skin-provider";

function isActive(pathname: string, href: string): boolean {
  // Inicio solo es activo en la raíz.
  if (href === "/") return pathname === "/";
  // La Biblioteca también está activa en el detalle y el reproductor.
  if (href === "/biblioteca") {
    return pathname.startsWith("/biblioteca") || pathname.startsWith("/juegos");
  }
  return pathname.startsWith(href);
}

function SkinPicker({ className }: { className: string }) {
  const { skin, setSkin } = useSkin();
  return (
    <div
      className={"skin-picker " + className}
      role="radiogroup"
      aria-label="Skin de los juegos"
    >
      <span className="skin-label">SKIN</span>
      {SKIN_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={skin === id}
          className={"skin-opt" + (skin === id ? " active" : "")}
          onClick={() => setSkin(id)}
        >
          {SKIN_LABELS[id]}
        </button>
      ))}
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const cls = (href: string) => (isActive(pathname, href) ? "active" : undefined);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("/")}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={cls("/biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("/salon")}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={cls("/acerca-de")}>
            Acerca de
          </Link>
        </div>
        <div className="spacer" />
        <SkinPicker className="nav-skin" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button type="button" className="btn ghost auth-btn" onClick={logout}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside
        className={"av-mobile-panel" + (open ? " open" : "")}
        aria-hidden={!open}
      >
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={cls("/")} onClick={close}>
          Inicio
        </Link>
        <Link href="/biblioteca" className={cls("/biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("/salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/acerca-de" className={cls("/acerca-de")} onClick={close}>
          Acerca de
        </Link>
        <Link href="/auth" className={cls("/auth")} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <SkinPicker className="panel-skin" />
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
