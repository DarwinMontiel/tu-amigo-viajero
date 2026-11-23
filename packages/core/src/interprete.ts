import { LUGARES, sinTildes, type Lugar } from './lugares.ts';
import { aISO, diasEntre, hoyISO, parsearISO, sumarDias } from './fechas.ts';
import type { Modulo, Moneda } from './tipos.ts';

/**
 * Lo que el asistente entendió de un pedido en lenguaje natural. La IA
 * (Workers AI) y el intérprete por reglas devuelven la misma forma, así la
 * interfaz no sabe ni le importa cuál respondió.
 */
export interface Intencion {
  modulo: Modulo;
  origen?: string;
  destino?: string;
  /** Si el pedido es temático ("playa", "montaña"), destinos que encajan. */
  sugeridos: string[];
  ida?: string;
  regreso?: string;
  adultos: number;
  presupuesto?: { valor: number; moneda: Moneda };
  /** Datos que faltan para poder buscar. */
  faltantes: Array<'origen' | 'destino' | 'ida'>;
  /** Una o dos frases en español: qué se entendió. */
  explicacion: string;
  motor: 'ia' | 'reglas';
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUMEROS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, catorce: 14, quince: 15, veinte: 20, treinta: 30,
};

/** Sinónimos y apodos de ciudades frecuentes. */
const APODOS: Record<string, string> = {
  cartagena: 'CTG', 'la heroica': 'CTG', 'san andres': 'ADZ', 'santa marta': 'SMR', medellin: 'MDE', bogota: 'BOG',
  cali: 'CLO', barranquilla: 'BAQ', 'eje cafetero': 'AXM', salento: 'AXM', armenia: 'AXM', pereira: 'PEI',
  'nueva york': 'JFK', 'new york': 'JFK', miami: 'MIA', orlando: 'MCO', madrid: 'MAD', barcelona: 'BCN',
  mexico: 'MEX', 'ciudad de mexico': 'MEX', cancun: 'CUN', panama: 'PTY', lima: 'LIM', cusco: 'CUZ', cuzco: 'CUZ',
  quito: 'UIO', santiago: 'SCL', 'buenos aires': 'EZE', 'sao paulo': 'GRU', 'rio de janeiro': 'GIG', rio: 'GIG',
  'punta cana': 'PUJ', aruba: 'AUA', curazao: 'CUR', 'costa rica': 'SJO', leticia: 'LET', amazonas: 'LET',
  bucaramanga: 'BGA', cucuta: 'CUC', pasto: 'PSO', monteria: 'MTR', villavicencio: 'VVC', 'fort lauderdale': 'FLL',
};

const TEMAS: Array<{ palabras: RegExp; nacionales: string[]; internacionales: string[]; nombre: string }> = [
  { nombre: 'playa', palabras: /\b(playa|playas|mar|caribe|costa|isla|islas|sol|bucear|buceo)\b/, nacionales: ['CTG', 'SMR', 'ADZ'], internacionales: ['CUN', 'PUJ', 'AUA'] },
  { nombre: 'montaña y naturaleza', palabras: /\b(montana|montanas|naturaleza|cafe|cafetero|frio|senderismo|paisaje|paisajes|selva)\b/, nacionales: ['AXM', 'PEI', 'LET'], internacionales: ['CUZ', 'SJO', 'UIO'] },
  { nombre: 'ciudad, compras y cultura', palabras: /\b(compras|museos|cultura|rumba|fiesta|ciudad|gastronomia|comida)\b/, nacionales: ['MDE', 'BOG', 'CTG'], internacionales: ['MIA', 'MAD', 'MEX'] },
];

interface Mencion { iata: string; inicio: number; fin: number }

function mencionesDeLugares(texto: string): Mencion[] {
  const candidatos: Array<[string, string]> = Object.entries(APODOS);
  for (const l of LUGARES) candidatos.push([sinTildes(l.ciudad.toLowerCase()), l.iata]);
  // Más largos primero para que "santa marta" gane a "santa" y "ciudad de mexico" a "mexico".
  candidatos.sort((a, b) => b[0].length - a[0].length);
  const ocupado: boolean[] = [];
  const menciones: Mencion[] = [];
  for (const [nombre, iata] of candidatos) {
    const patron = new RegExp(`\\b${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    for (const m of texto.matchAll(patron)) {
      const inicio = m.index;
      const fin = inicio + nombre.length;
      if (ocupado.slice(inicio, fin).some(Boolean)) continue;
      for (let i = inicio; i < fin; i++) ocupado[i] = true;
      menciones.push({ iata, inicio, fin });
    }
  }
  // Códigos IATA escritos tal cual: "BOG", "MDE".
  for (const m of texto.matchAll(/\b([a-z]{3})\b/g)) {
    const codigo = m[1]!.toUpperCase();
    if (LUGARES.some((l) => l.iata === codigo) && !ocupado[m.index]) menciones.push({ iata: codigo, inicio: m.index, fin: m.index + 3 });
  }
  return menciones.sort((a, b) => a.inicio - b.inicio);
}

// "de" solo cuenta como origen tras palabras de viaje ("vuelo de Bogotá a…"), no en "playas de Cartagena".
const MARCA_ORIGEN = /(desde|saliendo de|salgo de|salimos de|sale de|partiendo de|vivo en|estoy en|(?:^|viaje|vuelo|vuelos|tiquete|tiquetes|pasaje|pasajes|ida)\s*de)\s+(la\s+|el\s+)?$/;
const MARCA_DESTINO = /(a|al|para|hacia|hasta|conocer|visitar|en|ir a|viajar a|volar a)\s+(la\s+|el\s+)?$/;

function leerNumero(token: string): number | null {
  const limpio = token.replace(/\./g, '').replace(',', '.');
  const n = Number(limpio);
  if (Number.isFinite(n)) return n;
  return NUMEROS[token] ?? null;
}

function proximaFechaDelMes(mes: number, dia: number, hoy: string): string | null {
  const base = parsearISO(hoy);
  if (!base) return null;
  for (const anio of [base.getUTCFullYear(), base.getUTCFullYear() + 1]) {
    const fecha = new Date(Date.UTC(anio, mes, dia));
    if (fecha.getUTCMonth() !== mes) return null;
    const iso = aISO(fecha);
    if (diasEntre(hoy, iso) >= 0) return iso;
  }
  return null;
}

/** Primer sábado del mes que esté al menos 3 días adelante. */
function inicioSugeridoDelMes(mes: number, hoy: string): string | null {
  for (let dia = 1; dia <= 28; dia++) {
    const iso = proximaFechaDelMes(mes, dia, hoy);
    if (!iso) continue;
    const f = parsearISO(iso)!;
    if (f.getUTCDay() === 6 && diasEntre(hoy, iso) >= 3) return iso;
  }
  return proximaFechaDelMes(mes, 15, hoy);
}

function leerFechas(t: string, hoy: string): { ida?: string; regreso?: string; duracion?: number } {
  const mesRe = MESES.join('|');
  // "del 10 al 17 de diciembre" / "10 al 17 de diciembre"
  const rango = new RegExp(`(?:del\\s+)?(\\d{1,2})\\s+(?:al|a|hasta el)\\s+(\\d{1,2})\\s+de\\s+(${mesRe})`).exec(t);
  if (rango) {
    const mes = MESES.indexOf(rango[3]!);
    const ida = proximaFechaDelMes(mes, Number(rango[1]), hoy);
    const regreso = ida ? sumarDias(ida, Number(rango[2]) - Number(rango[1])) : undefined;
    if (ida && regreso && diasEntre(ida, regreso) > 0) return { ida, regreso };
  }
  // "10 de diciembre" (con o sin "al 15 de enero")
  const dias = [...t.matchAll(new RegExp(`(\\d{1,2})\\s+de\\s+(${mesRe})`, 'g'))];
  if (dias.length > 0) {
    const fechas = dias
      .map((m) => proximaFechaDelMes(MESES.indexOf(m[2]!), Number(m[1]), hoy))
      .filter((x): x is string => Boolean(x));
    if (fechas[0]) return { ida: fechas[0], ...(fechas[1] && diasEntre(fechas[0], fechas[1]) > 0 ? { regreso: fechas[1] } : {}) };
  }
  // "15/12" o "15/12/2026"
  const numerica = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/.exec(t);
  if (numerica) {
    const ida = proximaFechaDelMes(Number(numerica[2]) - 1, Number(numerica[1]), hoy);
    if (ida) return { ida };
  }
  // "en diciembre", "para enero"
  const mesSolo = new RegExp(`\\b(${mesRe})\\b`).exec(t);
  if (mesSolo) {
    const ida = inicioSugeridoDelMes(MESES.indexOf(mesSolo[1]!), hoy);
    if (ida) return { ida };
  }
  if (/\b(este|el proximo|proximo|el otro)\s+fin de semana\b/.test(t)) {
    for (let i = 1; i <= 8; i++) {
      const iso = sumarDias(hoy, i);
      if (parsearISO(iso)!.getUTCDay() === 5) return { ida: iso, duracion: 2 };
    }
  }
  if (/\bmanana\b/.test(t)) return { ida: sumarDias(hoy, 1) };
  return {};
}

function leerDuracion(t: string): number | undefined {
  const m = /(\d{1,2}|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|catorce|quince|veinte)\s+(dias|noches|semanas|semana)\b/.exec(t);
  if (m) {
    const n = leerNumero(m[1]!) ?? 0;
    return m[2]!.startsWith('semana') ? n * 7 : m[2] === 'dias' ? Math.max(1, n - 1) : n;
  }
  if (/\buna semana\b/.test(t)) return 7;
  if (/\b(fin de semana|puente)\b/.test(t)) return 2;
  return undefined;
}

function leerAdultos(t: string): number | undefined {
  const m = /(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\s+(personas|adultos|viajeros|pasajeros|amigos|amigas)\b/.exec(t)
    ?? /\bsomos\s+(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/.exec(t);
  if (m) return Math.min(9, Math.max(1, leerNumero(m[1]!) ?? 1));
  if (/\b(pareja|mi esposa|mi esposo|mi novia|mi novio|los dos|las dos|luna de miel|mi pareja)\b/.test(t)) return 2;
  if (/\b(familia|con mis hijos|con los ninos)\b/.test(t)) return 4;
  if (/\b(solo|sola|yo solo|yo sola|mochilero|mochilera)\b/.test(t)) return 1;
  return undefined;
}

function leerPresupuesto(t: string): Intencion['presupuesto'] {
  const m = /(?:maximo|max|hasta|presupuesto(?: de)?|menos de|tengo|no mas de|por)\s*(?:de\s*)?(?:us)?\$?\s*(\d+(?:[.,]\d+)*)\s*(millones|millon|mil|k|usd|dolares|euros|eur)?/.exec(t)
    ?? /(\d+(?:[.,]\d+)*)\s*(millones|millon|usd|dolares|euros)\b/.exec(t);
  if (!m) return undefined;
  const unidad = m[2] ?? '';
  const crudo = m[1]!;
  // "2,5 millones" → 2.5; "800.000" → 800000
  const conDecimal = /millon|mil|k/.test(unidad) ? Number(crudo.replace(',', '.')) : Number(crudo.replace(/[.,]/g, ''));
  if (!Number.isFinite(conDecimal) || conDecimal <= 0) return undefined;
  const multiplicador = unidad.startsWith('millon') ? 1_000_000 : unidad === 'mil' || unidad === 'k' ? 1_000 : 1;
  const moneda: Moneda = /usd|dolares/.test(unidad) || /\bus\$|\bdolares\b|\busd\b/.test(t) ? 'USD' : /euro|eur/.test(unidad) ? 'EUR' : 'COP';
  const valor = Math.round(conDecimal * multiplicador);
  // Un "hasta 3" sin unidad no es un presupuesto.
  if (moneda === 'COP' && valor < 50_000) return undefined;
  return { valor, moneda };
}

function leerModulo(t: string, esPlanDeViaje: boolean): Modulo {
  const hotel = /\b(hotel|hoteles|hospedaje|alojamiento|hostal|airbnb|donde dormir|donde quedarme|apartamento)\b/.test(t);
  const vuelo = /\b(vuelo|vuelos|tiquete|tiquetes|volar|pasaje|pasajes|avion)\b/.test(t);
  if (/\b(paquete|paquetes|todo incluido|vuelo y hotel|vuelo mas hotel|vuelo \+ hotel)\b/.test(t) || (hotel && vuelo)) return 'paquetes';
  if (hotel) return 'hoteles';
  if (vuelo) return 'vuelos';
  return esPlanDeViaje ? 'paquetes' : 'vuelos';
}

/** Noches que pide el texto ("una semana" → 7, "5 días" → 4), si las dice. */
export function duracionPedida(texto: string): number | undefined {
  return leerDuracion(sinTildes(texto.toLowerCase()).replace(/\s+/g, ' '));
}

/** Intérprete por reglas: no usa red ni IA. Respaldo del asistente y motor del modo demo. */
export function interpretarConReglas(texto: string, hoy: string = hoyISO()): Intencion {
  const t = sinTildes(texto.toLowerCase()).replace(/\s+/g, ' ');
  const menciones = mencionesDeLugares(t);

  let origen: string | undefined;
  let destino: string | undefined;
  for (const m of menciones) {
    const antes = t.slice(Math.max(0, m.inicio - 20), m.inicio);
    if (!origen && MARCA_ORIGEN.test(antes) && !/\b(a|al|para|hacia)\s+$/.test(antes)) origen = m.iata;
    else if (!destino && MARCA_DESTINO.test(antes)) destino = m.iata;
  }
  for (const m of menciones) {
    if (origen && destino) break;
    if (m.iata === origen || m.iata === destino) continue;
    if (!destino) destino = m.iata;
    else if (!origen) origen = m.iata;
  }

  const internacional = /\b(internacional|exterior|fuera del pais|otro pais|extranjero)\b/.test(t);
  const tema = TEMAS.find((x) => x.palabras.test(t));
  const sugeridos = !destino && tema ? (internacional ? tema.internacionales : tema.nacionales).filter((c) => c !== origen) : [];
  if (!destino && sugeridos[0]) destino = sugeridos[0];

  const duracion = leerDuracion(t);
  const fechas = leerFechas(t, hoy);
  const presupuesto = leerPresupuesto(t);
  // Un plan ("playa", con presupuesto o con estadía) se compara como vuelo + hotel salvo que pida solo vuelos.
  const modulo = leerModulo(t, duracion !== undefined || Boolean(fechas.regreso) || Boolean(tema) || Boolean(presupuesto));
  const ida = fechas.ida;
  let regreso = fechas.regreso;
  const nochesDeseadas = duracion ?? fechas.duracion ?? (modulo === 'vuelos' ? undefined : 5);
  if (ida && !regreso && nochesDeseadas) regreso = sumarDias(ida, nochesDeseadas);

  const adultos = leerAdultos(t) ?? 1;

  const faltantes: Intencion['faltantes'] = [];
  if (modulo !== 'hoteles' && !origen) faltantes.push('origen');
  if (!destino) faltantes.push('destino');
  if (!ida) faltantes.push('ida');

  const nombre = (c?: string): string => (c ? LUGARES.find((l: Lugar) => l.iata === c)?.ciudad ?? c : '');
  const partes: string[] = [];
  const queBusca = { vuelos: 'vuelos', hoteles: 'alojamiento', paquetes: 'vuelo + hotel' }[modulo];
  partes.push(`Busco ${queBusca}`);
  if (origen) partes.push(`desde ${nombre(origen)}`);
  if (destino) partes.push(tema && sugeridos[0] === destino ? `a ${nombre(destino)} (plan de ${tema.nombre})` : `a ${nombre(destino)}`);
  partes.push(`para ${adultos} ${adultos === 1 ? 'adulto' : 'adultos'}`);
  let explicacion = `${partes.join(' ')}.`;
  if (presupuesto) explicacion += ` Presupuesto máximo: ${presupuesto.valor.toLocaleString('es-CO')} ${presupuesto.moneda}.`;
  if (sugeridos.length > 1) explicacion += ` También encajan: ${sugeridos.slice(1).map(nombre).join(' y ')}.`;

  return {
    modulo,
    ...(origen ? { origen } : {}),
    ...(destino ? { destino } : {}),
    sugeridos,
    ...(ida ? { ida } : {}),
    ...(regreso ? { regreso } : {}),
    adultos,
    ...(presupuesto ? { presupuesto } : {}),
    faltantes,
    explicacion,
    motor: 'reglas',
  };
}
