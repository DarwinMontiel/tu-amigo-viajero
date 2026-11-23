import {
  armarPaquetes,
  buscarDemo,
  claveConsulta,
  consultaAParametros,
  enlacesHoteles,
  gruposSoloEnlaceVuelos,
  hoyISO,
  ofertasDemo,
  opcionesDemo,
  ordenarGrupos,
  type Consulta,
  type GrupoPlataforma,
  type Moneda,
  type OfertaDestacada,
  type PerspectivaPrecio,
  type RespuestaBusqueda,
  type RespuestaOfertas,
  type RespuestaOpciones,
} from '@tav/core';
import { conCache, type Cache } from './cache.ts';
import { fuentesDisponibles, type Entorno } from './entorno.ts';
import { CuotaAgotada, CuotaDiaria } from './limites.ts';
import * as serp from './proveedores/serpapi.ts';
import * as tp from './proveedores/travelpayouts.ts';

const HORA = 3600;
const TTL_VUELOS = 3 * HORA;
const TTL_HOTELES = 6 * HORA;
const TTL_OFERTAS = 6 * HORA;

export interface Contexto {
  env: Entorno;
  cache: Cache;
  /** Origen público de la API, para armar enlaces /api/hoteles/ir. */
  origenApi: string;
  /** Inyectable en pruebas. */
  llamarSerpApi?: serp.LlamarSerpApi;
}

interface Guardado<T> {
  valor: T;
  en: string;
}

function clienteSerp(ctx: Contexto): serp.LlamarSerpApi {
  if (ctx.llamarSerpApi) return ctx.llamarSerpApi;
  return serp.crearCliente(ctx.env.SERPAPI_KEY ?? '');
}

function cuota(ctx: Contexto): CuotaDiaria {
  const limite = Number(ctx.env.SERPAPI_LIMITE_DIARIO ?? '8');
  return new CuotaDiaria(ctx.cache, Number.isFinite(limite) && limite > 0 ? limite : 8);
}

/** Una consulta a una fuente: con caché, con cuota (SerpApi) y con fecha de consulta. */
async function consultar<T>(ctx: Contexto, clave: string, ttl: number, gastaCuota: boolean, producir: () => Promise<T>): Promise<Guardado<T>> {
  const { valor } = await conCache<Guardado<T>>(ctx.cache, clave, ttl, async () => {
    if (gastaCuota && !(await cuota(ctx).consumir())) throw new CuotaAgotada();
    return { valor: await producir(), en: new Date().toISOString() };
  });
  return valor;
}

function grupoConError(id: string, nombre: string, error: unknown, enlace?: string): GrupoPlataforma {
  const nota =
    error instanceof CuotaAgotada
      ? error.message
      : 'La fuente de precios no respondió a tiempo. Puedes abrir la búsqueda directamente en la página.';
  return { plataforma: { id, nombre }, estado: 'error', ofertas: [], ...(enlace ? { enlaceBusqueda: enlace } : {}), nota };
}

function masAntigua(fechas: string[]): string {
  return fechas.sort()[0] ?? new Date().toISOString();
}

interface Parcial {
  grupos: GrupoPlataforma[];
  fechas: string[];
  avisos: string[];
  perspectiva?: PerspectivaPrecio;
}

async function gruposVuelos(c: Consulta, ctx: Contexto): Promise<Parcial> {
  const f = fuentesDisponibles(ctx.env);
  const clave = claveConsulta({ ...c, modulo: 'vuelos' });
  type ConPerspectiva = { grupo: GrupoPlataforma; perspectiva?: PerspectivaPrecio };
  const tareas: Array<Promise<Guardado<ConPerspectiva>>> = [];
  const nombres: Array<[string, string]> = [];
  if (f.serpapi) {
    nombres.push(['google-flights', 'Google Flights']);
    tareas.push(
      consultar(ctx, `gf:${clave}`, TTL_VUELOS, true, async () => {
        const r = await clienteSerp(ctx)<serp.RespuestaGoogleFlights>(serp.parametrosGoogleFlights(c));
        const perspectiva = serp.perspectivaGoogle(r);
        return { grupo: serp.mapearGoogleFlights(r, c), ...(perspectiva ? { perspectiva } : {}) };
      }),
    );
  }
  if (f.travelpayouts) {
    nombres.push(['aviasales', 'Aviasales']);
    const cfg = { token: ctx.env.TRAVELPAYOUTS_TOKEN ?? '', ...(ctx.env.TRAVELPAYOUTS_MARKER ? { marcador: ctx.env.TRAVELPAYOUTS_MARKER } : {}) };
    tareas.push(consultar(ctx, `tp:${clave}`, TTL_VUELOS, false, async () => ({ grupo: await tp.vuelosAviasales(c, cfg) })));
  }
  const resultados = await Promise.allSettled(tareas);
  const grupos: GrupoPlataforma[] = [];
  const fechas: string[] = [];
  let perspectiva: PerspectivaPrecio | undefined;
  resultados.forEach((r, i) => {
    const [id, nombre] = nombres[i]!;
    if (r.status === 'fulfilled') {
      grupos.push(r.value.valor.grupo);
      perspectiva ??= r.value.valor.perspectiva;
      fechas.push(r.value.en);
    } else {
      grupos.push(grupoConError(id, nombre, r.reason));
    }
  });
  grupos.push(...gruposSoloEnlaceVuelos(c));
  return { grupos, fechas, avisos: [], ...(perspectiva ? { perspectiva } : {}) };
}

function motoresHoteles(env: Entorno): Set<string> {
  return new Set((env.SERPAPI_MOTORES_HOTELES ?? 'google_hotels,airbnb').split(',').map((m) => m.trim()).filter(Boolean));
}

async function gruposHoteles(c: Consulta, ctx: Contexto): Promise<Parcial> {
  const motores = motoresHoteles(ctx.env);
  const clave = claveConsulta({ ...c, modulo: 'hoteles', origen: '' });
  const llamar = clienteSerp(ctx);
  const omitir = new Set<string>([...(motores.has('booking') ? ['booking'] : []), ...(motores.has('airbnb') ? ['airbnb'] : [])]);
  const enlaceIr = (token: string, fuente: string): string => {
    const p = consultaAParametros({ ...c, modulo: 'hoteles' });
    p.set('token', token);
    p.set('fuente', fuente);
    p.set('lugar', c.lugar);
    return `${ctx.origenApi}/api/hoteles/ir?${p}`;
  };

  const tareas: Array<[string, string, Promise<Guardado<GrupoPlataforma[]>>]> = [];
  if (motores.has('google_hotels')) {
    tareas.push([
      'google-hotels',
      'Google Hotels',
      consultar(ctx, `gh:${clave}`, TTL_HOTELES, true, async () =>
        serp.mapearGoogleHotels(await llamar<serp.RespuestaGoogleHotels>(serp.parametrosGoogleHotels(c)), c, enlaceIr, omitir),
      ),
    ]);
  }
  if (motores.has('booking')) {
    tareas.push([
      'booking',
      'Booking.com',
      consultar(ctx, `bk:${clave}`, TTL_HOTELES, true, async () => [serp.mapearBooking(await llamar<serp.RespuestaBooking>(serp.parametrosBooking(c)), c)]),
    ]);
  }
  if (motores.has('airbnb')) {
    tareas.push([
      'airbnb',
      'Airbnb',
      consultar(ctx, `ab:${clave}`, TTL_HOTELES, true, async () => [serp.mapearAirbnb(await llamar<serp.RespuestaAirbnb>(serp.parametrosAirbnb(c)), c)]),
    ]);
  }

  const resultados = await Promise.allSettled(tareas.map((t) => t[2]));
  const grupos: GrupoPlataforma[] = [];
  const fechas: string[] = [];
  resultados.forEach((r, i) => {
    const [id, nombre] = tareas[i]!;
    if (r.status === 'fulfilled') {
      grupos.push(...r.value.valor);
      fechas.push(r.value.en);
    } else {
      const enlace = id === 'airbnb' ? enlacesHoteles.airbnb(c) : id === 'booking' ? enlacesHoteles.booking(c) : enlacesHoteles.googleHotels(c);
      grupos.push(grupoConError(id, nombre, r.reason, enlace));
    }
  });
  const avisos = grupos.some((g) => g.estado === 'ok')
    ? ['Los totales son por toda la estadía. Los impuestos y tasas pueden variar según la página.']
    : [];
  return { grupos, fechas, avisos };
}

function respuesta(c: Consulta, p: Parcial): RespuestaBusqueda {
  return {
    modulo: c.modulo,
    modo: 'vivo',
    moneda: c.moneda,
    consultadoEn: masAntigua(p.fechas),
    grupos: ordenarGrupos(p.grupos),
    avisos: p.avisos,
    ...(p.perspectiva ? { perspectiva: p.perspectiva } : {}),
  };
}

export async function buscar(c: Consulta, ctx: Contexto): Promise<RespuestaBusqueda> {
  const f = fuentesDisponibles(ctx.env);
  if (c.modulo === 'vuelos') {
    if (!f.serpapi && !f.travelpayouts) return buscarDemo(c);
    return respuesta(c, await gruposVuelos(c, ctx));
  }
  // Hoteles y paquetes necesitan SerpApi: sin esa clave se sirven en modo demo completo.
  if (!f.serpapi) return buscarDemo(c);
  if (c.modulo === 'hoteles') return respuesta(c, await gruposHoteles(c, ctx));

  const [vuelos, hoteles] = await Promise.all([gruposVuelos(c, ctx), gruposHoteles(c, ctx)]);
  const paquetes = armarPaquetes(c, vuelos, hoteles);
  return respuesta(c, {
    grupos: paquetes.grupos,
    fechas: [...vuelos.fechas, ...hoteles.fechas],
    avisos: paquetes.avisos,
    ...(vuelos.perspectiva ? { perspectiva: vuelos.perspectiva } : {}),
  });
}

export async function ofertas(origen: string, moneda: Moneda, ctx: Contexto): Promise<RespuestaOfertas> {
  const token = ctx.env.TRAVELPAYOUTS_TOKEN?.trim();
  if (!token) return ofertasDemo(origen, moneda, hoyISO());
  const cfg = { token, ...(ctx.env.TRAVELPAYOUTS_MARKER ? { marcador: ctx.env.TRAVELPAYOUTS_MARKER } : {}) };
  const guardado = await consultar<OfertaDestacada[]>(ctx, `of:${origen}:${moneda}`, TTL_OFERTAS, false, () => tp.ofertasDesde(origen, moneda, cfg));
  const lista = guardado.valor;
  return {
    modo: 'vivo',
    moneda,
    origen,
    consultadoEn: guardado.en,
    nacionales: lista.filter((o) => o.nacional).slice(0, 8),
    internacionales: lista.filter((o) => !o.nacional).slice(0, 8),
    avisos: lista.length === 0 ? ['Aviasales no tiene precios recientes desde esta ciudad. Prueba con otra.'] : [],
  };
}

export async function opciones(token: string, c: Consulta, ctx: Contexto): Promise<RespuestaOpciones> {
  if (token.startsWith('demo:') || !fuentesDisponibles(ctx.env).serpapi) return opcionesDemo(token, c);
  const guardado = await consultar(ctx, `op:${token.slice(0, 120)}:${claveConsulta(c)}`, TTL_VUELOS, true, () => serp.opcionesCompra(clienteSerp(ctx), token, c));
  return { modo: 'vivo', moneda: c.moneda, opciones: guardado.valor };
}

/** Enlace exacto de una agencia para un hotel; si falla, Google Hotels con el nombre del lugar. */
export async function enlaceHotel(token: string, fuente: string, c: Consulta, ctx: Contexto): Promise<string> {
  const respaldo = enlacesHoteles.googleHotels(c);
  if (!fuentesDisponibles(ctx.env).serpapi) return respaldo;
  try {
    const guardado = await consultar(ctx, `ir:${token.slice(0, 120)}:${fuente}:${claveConsulta(c)}`, TTL_HOTELES, true, async () =>
      (await serp.enlaceDeAgencia(clienteSerp(ctx), token, fuente, c)) ?? '',
    );
    return guardado.valor || respaldo;
  } catch {
    return respaldo;
  }
}
