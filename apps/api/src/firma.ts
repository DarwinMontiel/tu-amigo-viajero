import type { Consulta } from '@tav/core';

/**
 * Firmas HMAC-SHA256 para los tokens que la API entrega al navegador
 * («¿Dónde lo compro?» y enlaces exactos de hoteles). Cada consulta con esos
 * tokens gasta cuota de SerpApi; firmarlos y atarlos a la búsqueda que los
 * produjo impide que alguien invente tokens para agotar la cuota de todos.
 */
const codificador = new TextEncoder();
const claves = new Map<string, Promise<CryptoKey>>();

function claveHmac(secreto: string): Promise<CryptoKey> {
  let clave = claves.get(secreto);
  if (!clave) {
    clave = crypto.subtle.importKey('raw', codificador.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    claves.set(secreto, clave);
  }
  return clave;
}

function aBase64Url(bytes: ArrayBuffer): string {
  let binario = '';
  for (const b of new Uint8Array(bytes)) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desdeBase64Url(texto: string): Uint8Array | null {
  try {
    const base = texto.replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base + '='.repeat((4 - (base.length % 4)) % 4));
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function firmar(datos: string, secreto: string): Promise<string> {
  return aBase64Url(await crypto.subtle.sign('HMAC', await claveHmac(secreto), codificador.encode(datos)));
}

/** Comparación en tiempo constante (la hace crypto.subtle.verify). */
export async function verificar(datos: string, firma: string, secreto: string): Promise<boolean> {
  const bytes = desdeBase64Url(firma);
  if (!bytes || bytes.length !== 32) return false;
  return crypto.subtle.verify('HMAC', await claveHmac(secreto), bytes, codificador.encode(datos));
}

/** La ruta de una búsqueda: lo que debe coincidir para reutilizar un token. */
export function huellaRuta(c: Consulta): string {
  return [c.origen || '-', c.destino, c.ida, c.regreso || '-', c.adultos, c.moneda].join(':');
}

const SEPARADOR = '~';

/** "book:ABC" → "book:ABC~firma". */
export async function firmarToken(token: string, c: Consulta, secreto: string): Promise<string> {
  return `${token}${SEPARADOR}${await firmar(`${token}|${huellaRuta(c)}`, secreto)}`;
}

/** Devuelve el token original si la firma es válida para esa búsqueda; si no, null. */
export async function abrirToken(firmado: string, c: Consulta, secreto: string): Promise<string | null> {
  const i = firmado.lastIndexOf(SEPARADOR);
  if (i <= 0) return null;
  const token = firmado.slice(0, i);
  return (await verificar(`${token}|${huellaRuta(c)}`, firmado.slice(i + 1), secreto)) ? token : null;
}
