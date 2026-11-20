// dd/mm/aaaa en UTC: el servidor y el navegador muestran siempre la misma fecha
// (sin riesgo de errores de hidratación por zona horaria).
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
