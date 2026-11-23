import type { Moneda } from './tipos.ts';

const FORMATOS = new Map<Moneda, Intl.NumberFormat>();

/** 1290000 → "$ 1.290.000"; 412 USD → "US$ 412". Sin decimales: son precios de viaje. */
export function formatearPrecio(valor: number, moneda: Moneda): string {
  let formato = FORMATOS.get(moneda);
  if (!formato) {
    formato = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    FORMATOS.set(moneda, formato);
  }
  return formato.format(Math.round(valor));
}

/** Redondea a unidades enteras y descarta lo que no es un precio. */
export function precioValido(valor: unknown): number | null {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Tasas de referencia SOLO para los datos de ejemplo (modo demo), que están
 * grabados en pesos. En vivo cada fuente devuelve la moneda pedida.
 */
export const TASAS_DEMO: Record<Moneda, number> = { COP: 1, USD: 1 / 3950, EUR: 1 / 4300 };

export function convertirDesdeCOP(valor: number, moneda: Moneda): number {
  return Math.round(valor * TASAS_DEMO[moneda]);
}
