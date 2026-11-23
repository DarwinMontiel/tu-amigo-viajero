import {
  diasEntre,
  duracionPedida,
  sumarDias,
  formatearPrecio,
  hoyISO,
  interpretarConReglas,
  LUGARES,
  MAX_ADULTOS,
  MONEDAS,
  parsearISO,
  recomendarConReglas,
  resultadosParaIA,
  resumir,
  type ContextoRecomendacion,
  type Intencion,
  type Modulo,
  type Moneda,
  type Recomendacion,
  type RespuestaBusqueda,
} from '@tav/core';
import type { Entorno } from './entorno.ts';

/**
 * Asistente con IA gratuita: Workers AI (Llama 3.3 70B) en modo JSON.
 * Cloudflare da 10.000 neuronas al día en el plan Free; si se agotan o el
 * modelo falla, responde el intérprete por reglas. Nunca hay costo.
 */
const MODELO_POR_DEFECTO = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const TIEMPO_MAXIMO_MS = 15_000;

type EjecutarIA = (modelo: string, entrada: Record<string, unknown>) => Promise<unknown>;

function ejecutor(env: Entorno): EjecutarIA | undefined {
  const ai = env.AI;
  if (!ai) return undefined;
  return (modelo, entrada) => (ai.run as (m: string, e: Record<string, unknown>) => Promise<unknown>)(modelo, entrada);
}

async function conTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error('La IA tardó demasiado')), ms);
  });
  try {
    return await Promise.race([promesa, limite]);
  } finally {
    if (temporizador !== undefined) clearTimeout(temporizador);
  }
}

/** Workers AI devuelve `{ response }` con objeto (modo JSON) o texto. */
export function extraerJSON(salida: unknown): Record<string, unknown> | undefined {
  const r = (salida as { response?: unknown } | undefined)?.response ?? salida;
  if (r && typeof r === 'object') return r as Record<string, unknown>;
  if (typeof r !== 'string') return undefined;
  const inicio = r.indexOf('{');
  const fin = r.lastIndexOf('}');
  if (inicio < 0 || fin <= inicio) return undefined;
  try {
    return JSON.parse(r.slice(inicio, fin + 1)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

const ESQUEMA_INTENCION = {
  type: 'object',
  properties: {
    modulo: { type: 'string', enum: ['vuelos', 'hoteles', 'paquetes'] },
    origen: { type: 'string', description: 'IATA de 3 letras o vacío' },
    destino: { type: 'string', description: 'IATA de 3 letras o vacío' },
    sugeridos: { type: 'array', items: { type: 'string' } },
    ida: { type: 'string', description: 'YYYY-MM-DD o vacío' },
    regreso: { type: 'string', description: 'YYYY-MM-DD o vacío' },
    adultos: { type: 'integer' },
    presupuesto: { type: 'number', description: '0 si no lo dice' },
    moneda: { type: 'string', enum: ['COP', 'USD', 'EUR'] },
    explicacion: { type: 'string' },
  },
  required: ['modulo', 'origen', 'destino', 'sugeridos', 'ida', 'regreso', 'adultos', 'presupuesto', 'moneda', 'explicacion'],
};

function promptIntencion(hoy: string): string {
  const catalogo = LUGARES.map((l) => `${l.iata}=${l.ciudad} (${l.pais})`).join('; ');
  return [
    'Eres el asistente de un comparador de viajes colombiano. Conviertes el pedido del usuario en una búsqueda estructurada.',
    `Hoy es ${hoy}. Las fechas deben ser futuras y en formato YYYY-MM-DD. Si dice solo un mes, elige un sábado de ese mes.`,
    'Si da una duración ("una semana", "5 noches") calcula el regreso. Para hoteles y paquetes sin duración usa 5 noches.',
    'modulo: "vuelos" si solo pide vuelos o tiquetes, "hoteles" si solo pide alojamiento, "paquetes" si pide ambos o un viaje con estadía.',
    'origen y destino: códigos IATA de aeropuerto de 3 letras. Prefiere este catálogo:',
    catalogo,
    'Si el destino es temático (playa, montaña, compras), pon el mejor en destino y hasta 2 alternativas en sugeridos.',
    'adultos entre 1 y 9 ("pareja" = 2, "familia" sin número = 4). presupuesto: número total sin separadores; 0 si no lo dice.',
    'Deja en "" lo que el usuario no dijo y no se pueda deducir. explicacion: una frase en español de lo que entendiste.',
  ].join('\n');
}

const IATA = /^[A-Z]{3}$/;

/** Limpia la salida del modelo y completa lo que falte con el intérprete por reglas. */
export function sanearIntencion(crudo: Record<string, unknown>, texto: string, hoy: string): Intencion {
  const reglas = interpretarConReglas(texto, hoy);
  const texto_ = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const iata = (v: unknown): string | undefined => {
    const t = texto_(v).toUpperCase();
    return IATA.test(t) ? t : undefined;
  };
  const fecha = (v: unknown): string | undefined => {
    const t = texto_(v);
    return parsearISO(t) && diasEntre(hoy, t) >= 0 && diasEntre(hoy, t) <= 330 ? t : undefined;
  };

  const modulo: Modulo = ['vuelos', 'hoteles', 'paquetes'].includes(texto_(crudo.modulo)) ? (texto_(crudo.modulo) as Modulo) : reglas.modulo;
  const origen = iata(crudo.origen) ?? reglas.origen;
  const destino = iata(crudo.destino) ?? reglas.destino;
  const ida = fecha(crudo.ida) ?? reglas.ida;
  let regreso = fecha(crudo.regreso) ?? reglas.regreso;
  if (ida && regreso && diasEntre(ida, regreso) <= 0) regreso = undefined;
  if (ida && !regreso) {
    const duracion = duracionPedida(texto) ?? (modulo === 'vuelos' ? undefined : 5);
    if (duracion) regreso = sumarDias(ida, duracion);
  }
  const adultosIA = Number(crudo.adultos);
  const adultos = Number.isInteger(adultosIA) && adultosIA >= 1 && adultosIA <= MAX_ADULTOS ? adultosIA : reglas.adultos;
  const valor = Number(crudo.presupuesto);
  const moneda = MONEDAS.includes(texto_(crudo.moneda) as Moneda) ? (texto_(crudo.moneda) as Moneda) : 'COP';
  const presupuesto = Number.isFinite(valor) && valor > 0 ? { valor: Math.round(valor), moneda } : reglas.presupuesto;
  const sugeridos = Array.isArray(crudo.sugeridos)
    ? crudo.sugeridos.map(iata).filter((x): x is string => Boolean(x) && x !== destino && x !== origen).slice(0, 3)
    : reglas.sugeridos;

  const faltantes: Intencion['faltantes'] = [];
  if (modulo !== 'hoteles' && !origen) faltantes.push('origen');
  if (!destino) faltantes.push('destino');
  if (!ida) faltantes.push('ida');
  const explicacion = texto_(crudo.explicacion).slice(0, 300) || reglas.explicacion;

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
    motor: 'ia',
  };
}

export async function interpretar(texto: string, env: Entorno, hoy = hoyISO()): Promise<Intencion> {
  const ia = ejecutor(env);
  if (!ia) return interpretarConReglas(texto, hoy);
  try {
    const salida = await conTiempo(
      ia(env.IA_MODELO || MODELO_POR_DEFECTO, {
        messages: [
          { role: 'system', content: promptIntencion(hoy) },
          { role: 'user', content: texto },
        ],
        response_format: { type: 'json_schema', json_schema: ESQUEMA_INTENCION },
        max_tokens: 400,
        temperature: 0.1,
      }),
      TIEMPO_MAXIMO_MS,
    );
    const crudo = extraerJSON(salida);
    return crudo ? sanearIntencion(crudo, texto, hoy) : interpretarConReglas(texto, hoy);
  } catch {
    return interpretarConReglas(texto, hoy);
  }
}

// ---------- Recomendación sobre los resultados ----------

const ESQUEMA_RECOMENDACION = {
  type: 'object',
  properties: {
    titular: { type: 'string' },
    puntos: { type: 'array', items: { type: 'string' } },
  },
  required: ['titular', 'puntos'],
};

/** Montos que el modelo puede citar: los de los resultados y los cálculos del resumen. */
function montosPermitidos(r: RespuestaBusqueda, ctx: ContextoRecomendacion): Set<number> {
  const permitidos = new Set<number>();
  for (const g of r.grupos) for (const o of g.ofertas) {
    permitidos.add(o.precio);
    if (o.precioPorNoche) permitidos.add(o.precioPorNoche);
    if (ctx.adultos > 1) permitidos.add(Math.round(o.precio / ctx.adultos));
  }
  const { masBarata, ahorro } = resumir(r);
  if (ahorro) permitidos.add(ahorro);
  if (masBarata && ctx.presupuesto) {
    permitidos.add(ctx.presupuesto.valor);
    permitidos.add(Math.abs(ctx.presupuesto.valor - masBarata.oferta.precio));
  }
  return permitidos;
}

/** "$ 1.290.000" o "1.290.000" → 1290000. Montos con al menos 4 dígitos. */
function montosCitados(texto: string): number[] {
  return [...texto.matchAll(/\d{1,3}(?:\.\d{3})+|\d{4,}/g)].map((m) => Number(m[0].replace(/\./g, '')));
}

/** Rechaza recomendaciones que citen precios que no están en los datos (tolerancia del 1 %). */
export function recomendacionFiel(rec: Pick<Recomendacion, 'titular' | 'puntos'>, r: RespuestaBusqueda, ctx: ContextoRecomendacion): boolean {
  const permitidos = [...montosPermitidos(r, ctx)];
  const citados = montosCitados([rec.titular, ...rec.puntos].join(' '));
  return citados.every((m) => permitidos.some((p) => Math.abs(p - m) <= Math.max(1, p * 0.01)));
}

export async function recomendar(r: RespuestaBusqueda, ctx: ContextoRecomendacion, env: Entorno): Promise<Recomendacion> {
  const respaldo = recomendarConReglas(r, ctx);
  const ia = ejecutor(env);
  if (!ia || !resumir(r).masBarata) return respaldo;
  const contexto = [
    `Moneda: ${r.moneda}. Viajeros: ${ctx.adultos} adultos. Noches: ${ctx.noches}.`,
    ctx.presupuesto ? `Presupuesto total del usuario: ${formatearPrecio(ctx.presupuesto.valor, ctx.presupuesto.moneda)}.` : 'Sin presupuesto definido.',
    'Resultados (3 más baratos por plataforma, total del viaje):',
    resultadosParaIA(r),
  ].join('\n');
  try {
    const salida = await conTiempo(
      ia(env.IA_MODELO || MODELO_POR_DEFECTO, {
        messages: [
          {
            role: 'system',
            content:
              'Eres un asesor de viajes colombiano, claro y honesto. Con SOLO los datos dados, recomienda la mejor opción ' +
              'en un titular corto y 2 a 4 puntos breves (precio, calidad, presupuesto, un consejo práctico). ' +
              'Escribe los precios exactamente como aparecen en los datos. No inventes precios, hoteles, horarios ni políticas. ' +
              'Español neutro, sin emojis, máximo 90 palabras en total.',
          },
          { role: 'user', content: contexto },
        ],
        response_format: { type: 'json_schema', json_schema: ESQUEMA_RECOMENDACION },
        max_tokens: 350,
        temperature: 0.3,
      }),
      TIEMPO_MAXIMO_MS,
    );
    const crudo = extraerJSON(salida);
    const titular = typeof crudo?.titular === 'string' ? crudo.titular.trim().slice(0, 220) : '';
    const puntos = Array.isArray(crudo?.puntos)
      ? crudo.puntos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim().slice(0, 260)).slice(0, 4)
      : [];
    const candidata = { titular, puntos, motor: 'ia' as const };
    if (!titular || puntos.length === 0 || !recomendacionFiel(candidata, r, ctx)) return respaldo;
    return candidata;
  } catch {
    return respaldo;
  }
}
