import { createClient } from "@/app/lib/supabase/server";

// RUTA TEMPORAL (spec 04): verifica la conexión con Supabase. Se elimina en el
// último paso del plan.
//
// Sin tablas, la consulta falla con PGRST205 (tabla inexistente). Ese error lo
// devuelve PostgREST, así que prueba que URL, clave, red y cliente funcionan.
// Cualquier otro error se trata como fallo.
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("_health").select().limit(1);

    if (error && error.code !== "PGRST205") {
      console.error("[supabase-health]", error.code, error.message);
      return Response.json(
        { ok: false, error: "No se pudo conectar con Supabase." },
        { status: 500 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[supabase-health]", err);
    return Response.json(
      { ok: false, error: "No se pudo conectar con Supabase." },
      { status: 500 },
    );
  }
}
