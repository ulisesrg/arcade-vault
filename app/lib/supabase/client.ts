import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para Client Components. Usa solo la clave publicable.
// Las variables NEXT_PUBLIC_* se sustituyen en el build, por eso se leen
// con acceso directo (no con process.env[nombre]).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Falta la variable NEXT_PUBLIC_SUPABASE_URL");
  if (!key) {
    throw new Error("Falta la variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createBrowserClient(url, key);
}
