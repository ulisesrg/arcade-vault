import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Usa solo la clave publicable. Con cacheComponents, `cookies()` es una API de
// petición: quien llame a esta función debe estar en un contexto dinámico
// (Route Handler, Server Action o dentro de <Suspense>).
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Falta la variable NEXT_PUBLIC_SUPABASE_URL");
  if (!key) {
    throw new Error("Falta la variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Se llamó desde un Server Component, donde no se pueden escribir
          // cookies. Es seguro ignorarlo: el refresco de sesión lo hará
          // proxy.ts cuando exista (spec de Auth).
        }
      },
    },
  });
}
