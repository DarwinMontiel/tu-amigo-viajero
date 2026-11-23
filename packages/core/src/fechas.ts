const PATRON_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIA_MS = 86_400_000;

/** "2026-12-10" → fecha UTC a medianoche; null si no existe (2026-02-31). */
export function parsearISO(valor: string): Date | null {
  const m = PATRON_ISO.exec(valor.trim());
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const fecha = new Date(Date.UTC(anio, mes, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes || fecha.getUTCDate() !== dia) return null;
  return fecha;
}

export function aISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Fecha de hoy (según la zona horaria local) como ISO, para comparar sin horas. */
export function hoyISO(ahora: Date = new Date()): string {
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = parsearISO(iso);
  if (!fecha) throw new RangeError(`Fecha inválida: ${iso}`);
  return aISO(new Date(fecha.getTime() + dias * DIA_MS));
}

/** Días entre dos fechas ISO válidas (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const a = parsearISO(desde);
  const b = parsearISO(hasta);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / DIA_MS);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-12-10" → "10 dic 2026" (o sin año). */
export function fechaCorta(iso: string, conAnio = false): string {
  const f = parsearISO(iso.slice(0, 10));
  if (!f) return iso;
  const base = `${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
  return conAnio ? `${base} ${f.getUTCFullYear()}` : base;
}
