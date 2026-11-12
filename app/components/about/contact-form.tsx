"use client";

import { useActionState, useId, useRef, useState } from "react";
import { sendContact, type ContactState } from "@/app/actions/contact";

const INITIAL: ContactState = { status: "idle" };
const EMPTY_FORM = { name: "", email: "", msg: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContact, INITIAL);
  const [form, setForm] = useState(EMPTY_FORM);
  const [shake, setShake] = useState(false);
  // Resultado que el usuario ya cerró ("ENVIAR OTRO MENSAJE" / "REINTENTAR").
  // useActionState no se puede reiniciar a mano, así que se oculta el estado
  // descartado; el siguiente resultado es un objeto nuevo y vuelve a mostrarse.
  const [dismissed, setDismissed] = useState<ContactState | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uid = useId();
  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const msgId = `${uid}-msg`;

  const showResult = state.status !== "idle" && state !== dismissed;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const hasEmpty =
      !form.name.trim() || !form.email.trim() || !form.msg.trim();
    if (!hasEmpty) return;

    // Cancela la acción: no hay petición de red.
    e.preventDefault();
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 450);
  }

  function sendAnother() {
    setForm(EMPTY_FORM);
    setDismissed(state);
  }

  function retry() {
    setDismissed(state);
  }

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      {!showResult ? (
        <>
          <div className="field">
            <label htmlFor={nameId}>NOMBRE</label>
            <input
              id={nameId}
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor={emailId}>CORREO ELECTRÓNICO</label>
            <input
              id={emailId}
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor={msgId}>MENSAJE</label>
            <textarea
              id={msgId}
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            />
          </div>

          {/* Honeypot: invisible para personas, los bots suelen rellenarlo. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              width: 1,
              height: 1,
              overflow: "hidden",
            }}
          >
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : state.status === "success" ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {state.name.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={sendAnother}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : state.status === "error" ? (
        <div className="terminal-success error">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="alert">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[ERR] Transmisión fallida.</div>
            <div className="line success">
              &gt; {state.message}
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={retry}>
                REINTENTAR
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
