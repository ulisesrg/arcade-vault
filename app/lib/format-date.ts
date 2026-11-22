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

// Tiempo transcurrido en español: "hace un momento", "hace 5 min", "hace 3 h",
// "hace 2 d". Con `cacheComponents`, `Date.now()` solo puede llamarse en un
// componente suspendido tras leer datos de la petición; no usar en el módulo ni
// en Client Components (desajuste de hidratación).
export function formatAgo(iso: string, now: number = Date.now()): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
