"use server";

import { Resend } from "resend";

export type ContactField = "name" | "email" | "msg";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fields?: ContactField[] };

const MAX_NAME = 60;
const MAX_EMAIL = 120;
const MAX_MSG = 2000;
const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

// Sin espacios ni saltos de línea: evita inyección de cabeceras vía replyTo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR =
  "NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS.";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim();
  const msg = field(formData, "msg").trim();
  const honeypot = field(formData, "website");

  // Honeypot: a los bots se les responde éxito sin enviar nada.
  if (honeypot.trim() !== "") {
    return { status: "success", name };
  }

  const empty: ContactField[] = [];
  if (!name) empty.push("name");
  if (!email) empty.push("email");
  if (!msg) empty.push("msg");
  if (empty.length > 0) {
    return {
      status: "error",
      message: "FALTAN CAMPOS POR COMPLETAR.",
      fields: empty,
    };
  }

  const tooLong: ContactField[] = [];
  if (name.length > MAX_NAME) tooLong.push("name");
  if (email.length > MAX_EMAIL) tooLong.push("email");
  if (msg.length > MAX_MSG) tooLong.push("msg");
  if (tooLong.length > 0) {
    return {
      status: "error",
      message: "UNO O MÁS CAMPOS SUPERAN LA LONGITUD MÁXIMA PERMITIDA.",
      fields: tooLong,
    };
  }

  if (!EMAIL_RE.test(email)) {
    return {
      status: "error",
      message: "EL CORREO ELECTRÓNICO NO TIENE UN FORMATO VÁLIDO.",
      fields: ["email"],
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error(
      "[contact] Falta configuración: RESEND_API_KEY o CONTACT_TO_EMAIL no definidas.",
    );
    return { status: "error", message: GENERIC_ERROR };
  }

  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;
  const safeName = name.replace(/[\r\n]+/g, " ");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${safeName}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });

    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return { status: "error", message: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[contact] Fallo al enviar con Resend:", err);
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "success", name };
}
