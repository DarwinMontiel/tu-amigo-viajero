/**
 * Funciones puras del asistente de activación (`npm run activar`), separadas
 * para probarlas sin tocar Cloudflare ni GitHub.
 */

/** Extrae el id de un namespace KV de la salida de `wrangler kv namespace create`. */
export function idDeKv(salida: string): string | null {
  // TOML (id = "…") o JSON ("id": "…"), según la versión de wrangler.
  const m = /(?:^|[^a-z_])"?id"?\s*[=:]\s*"([0-9a-f]{32})"/im.exec(salida);
  return m ? m[1]!.toLowerCase() : null;
}

/** Activa el bloque de KV de wrangler.toml con el id dado (idempotente). */
export function activarKvEnToml(toml: string, id: string): string {
  if (/^\[\[kv_namespaces\]\]/m.test(toml)) {
    return toml.replace(/^(id\s*=\s*)"[^"]*"/m, `$1"${id}"`);
  }
  return toml.replace(
    /^# \[\[kv_namespaces\]\]\r?\n# binding = "CACHE"\r?\n# id = "[^"]*"/m,
    `[[kv_namespaces]]\nbinding = "CACHE"\nid = "${id}"`,
  );
}

/** ¿El wrangler.toml ya tiene un KV real configurado? */
export function tieneKv(toml: string): boolean {
  return /^\[\[kv_namespaces\]\][\s\S]*?^id\s*=\s*"[0-9a-f]{32}"/m.test(toml);
}

/** La URL pública del Worker en la salida de `wrangler deploy`. */
export function urlDelDespliegue(salida: string): string | null {
  const m = /https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.workers\.dev/i.exec(salida);
  return m ? m[0] : null;
}

/** Revisa la forma de cada clave antes de guardarla, para atrapar errores al pegar. */
export function validarClave(nombre: 'SERPAPI_KEY' | 'TRAVELPAYOUTS_TOKEN' | 'TRAVELPAYOUTS_MARKER', valor: string): string | null {
  const v = valor.trim();
  if (nombre === 'TRAVELPAYOUTS_MARKER') return v === '' || /^\d{3,10}$/.test(v) ? null : 'El marcador (Partner ID) son solo números.';
  // Travelpayouts es opcional: sin token, los vuelos salen solo de Google Flights.
  if (nombre === 'TRAVELPAYOUTS_TOKEN' && v === '') return null;
  if (v.length === 0) return 'Pega la clave: no puede quedar vacía.';
  if (/\s/.test(v)) return 'La clave no puede tener espacios: revisa que la copiaste completa.';
  if (nombre === 'SERPAPI_KEY' && !/^[a-f0-9]{64}$/i.test(v)) return 'La clave de SerpApi tiene 64 caracteres hexadecimales (0-9, a-f).';
  if (nombre === 'TRAVELPAYOUTS_TOKEN' && !/^[a-f0-9]{32}$/i.test(v)) return 'El token de Travelpayouts tiene 32 caracteres hexadecimales (0-9, a-f).';
  return null;
}
