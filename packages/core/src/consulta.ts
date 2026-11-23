import { MONEDAS, type Moneda, type Modulo } from './tipos.ts';
import { diasEntre, hoyISO, parsearISO } from './fechas.ts';
import { buscarLugar } from './lugares.ts';

/**
 * Una búsqueda normalizada. Vuelos usa origen → destino; hoteles usa el
 * destino y las fechas como entrada y salida; paquetes usa todo.
 */
export interface Consulta {
  modulo: Modulo;
  /** IATA de la ciudad de salida (no aplica a hoteles). */
  origen: string;
  /** IATA del destino. */
  destino: string;
  /** Texto con que se buscan hoteles: "Cartagena de Indias, Colombia". */
  lugar: string;
  ida: string;
  /** Opcional solo en vuelos (solo ida). */
  regreso: string;
  adultos: number;
  moneda: Moneda;
}

export type Errores = Partial<Record<'origen' | 'destino' | 'ida' | 'regreso' | 'adultos' | 'moneda', string>>;

export type ResultadoValidacion = { ok: true; consulta: Consulta } | { ok: false; errores: Errores };

const PATRON_IATA = /^[A-Z]{3}$/;
/** Las aerolíneas venden con unos 11 meses de anticipación. */
export const MAX_DIAS_ANTICIPACION = 330;
export const MAX_NOCHES = 30;
export const MAX_ADULTOS = 9;

type Entrada = Record<string, string | number | undefined | null> | URLSearchParams;

function leer(entrada: Entrada, clave: string): string {
  const valor = entrada instanceof URLSearchParams ? entrada.get(clave) : entrada[clave];
  return valor === undefined || valor === null ? '' : String(valor).trim();
}

/** Valida y normaliza una búsqueda. `hoy` (ISO) se inyecta en las pruebas. */
export function validarConsulta(modulo: Modulo, entrada: Entrada, hoy: string = hoyISO()): ResultadoValidacion {
  const errores: Errores = {};
  const origen = leer(entrada, 'origen').toUpperCase();
  const destino = leer(entrada, 'destino').toUpperCase();
  const ida = leer(entrada, 'ida');
  const regreso = leer(entrada, 'regreso');
  const adultosTexto = leer(entrada, 'adultos') || '1';
  const adultos = Number(adultosTexto);
  const monedaTexto = (leer(entrada, 'moneda') || 'COP').toUpperCase();
  const usaOrigen = modulo !== 'hoteles';

  if (usaOrigen && !PATRON_IATA.test(origen)) errores.origen = 'Elige la ciudad de salida de la lista.';
  if (!PATRON_IATA.test(destino)) {
    errores.destino = 'Elige el destino de la lista.';
  } else if (usaOrigen && destino === origen) {
    errores.destino = 'El destino debe ser distinto de la ciudad de salida.';
  }

  const fechaIda = parsearISO(ida);
  if (!fechaIda) {
    errores.ida = modulo === 'hoteles' ? 'Elige la fecha de llegada.' : 'Elige la fecha de ida.';
  } else if (diasEntre(hoy, ida) < 0) {
    errores.ida = 'La fecha no puede estar en el pasado.';
  } else if (diasEntre(hoy, ida) > MAX_DIAS_ANTICIPACION) {
    errores.ida = 'Elige una fecha dentro de los próximos 11 meses.';
  }

  const regresoObligatorio = modulo !== 'vuelos';
  if (!regreso) {
    if (regresoObligatorio) errores.regreso = modulo === 'hoteles' ? 'Elige la fecha de salida.' : 'Elige la fecha de regreso.';
  } else if (!parsearISO(regreso)) {
    errores.regreso = 'La fecha de regreso no es válida.';
  } else if (fechaIda) {
    const noches = diasEntre(ida, regreso);
    if (noches < 0) errores.regreso = 'El regreso debe ser el mismo día de la ida o después.';
    else if (regresoObligatorio && noches === 0) errores.regreso = 'Debe haber al menos una noche de hotel.';
    else if (regresoObligatorio && noches > MAX_NOCHES) errores.regreso = `Busca estadías de hasta ${MAX_NOCHES} noches.`;
  }

  if (!Number.isInteger(adultos) || adultos < 1 || adultos > MAX_ADULTOS) {
    errores.adultos = `Pueden viajar entre 1 y ${MAX_ADULTOS} adultos por búsqueda.`;
  }
  if (!MONEDAS.includes(monedaTexto as Moneda)) errores.moneda = 'Moneda no soportada.';

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const lugar = leer(entrada, 'lugar') || buscarLugar(destino)?.alojamiento || destino;
  return {
    ok: true,
    consulta: {
      modulo,
      origen: usaOrigen ? origen : '',
      destino,
      lugar,
      ida,
      regreso,
      adultos,
      moneda: monedaTexto as Moneda,
    },
  };
}

export function noches(c: Pick<Consulta, 'ida' | 'regreso'>): number {
  return c.regreso ? Math.max(0, diasEntre(c.ida, c.regreso)) : 0;
}

/** Parámetros de URL de una consulta (para compartirla y para llamar a la API). */
export function consultaAParametros(c: Consulta): URLSearchParams {
  const p = new URLSearchParams();
  if (c.origen) p.set('origen', c.origen);
  p.set('destino', c.destino);
  p.set('ida', c.ida);
  if (c.regreso) p.set('regreso', c.regreso);
  p.set('adultos', String(c.adultos));
  p.set('moneda', c.moneda);
  return p;
}

/** Clave estable para la caché: mismo orden de campos siempre. */
export function claveConsulta(c: Consulta): string {
  return [c.modulo, c.origen || '-', c.destino, c.ida, c.regreso || '-', c.adultos, c.moneda].join(':');
}
