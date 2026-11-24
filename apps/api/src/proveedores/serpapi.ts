import {
  AVISO_BAJO_COSTO,
  esBajoCosto,
  enlacesHoteles,
  enlacesVuelos,
  fechaSalidaHotel,
  grupo,
  idPlataforma,
  noches,
  precioValido,
  type Consulta,
  type Enlace,
  type GrupoPlataforma,
  type Oferta,
  type OpcionCompra,
  type PerspectivaPrecio,
} from '@tav/core';
import { obtenerJSON } from '../http.ts';

/**
 * SerpApi: API legal y documentada que devuelve los resultados públicos de
 * Google Flights, Google Hotels, Booking.com y Airbnb en JSON.
 * Documentación: https://serpapi.com/google-flights-api, /google-hotels-api,
 * /booking-api y /airbnb-search-api. Plan gratuito: 250 búsquedas al mes.
 */
const BASE = 'https://serpapi.com/search.json';

export type LlamarSerpApi = <T>(parametros: Record<string, string>) => Promise<T>;

export function crearCliente(clave: string): LlamarSerpApi {
  return <T>(parametros: Record<string, string>) =>
    obtenerJSON<T>('SerpApi', `${BASE}?${new URLSearchParams({ ...parametros, api_key: clave })}`, { ms: 20_000 });
}

// ---------- Google Flights ----------

interface TramoGF {
  departure_airport?: { id?: string; time?: string };
  arrival_airport?: { id?: string; time?: string };
  airline?: string;
}
interface VueloGF {
  flights?: TramoGF[];
  layovers?: unknown[];
  total_duration?: number;
  price?: number;
  booking_token?: string;
  departure_token?: string;
}
export interface RespuestaGoogleFlights {
  best_flights?: VueloGF[];
  other_flights?: VueloGF[];
  price_insights?: { lowest_price?: number; price_level?: string; typical_price_range?: number[] };
  error?: string;
}

/** «price_insights» de Google Flights: si el precio de hoy está bajo, normal o alto para la ruta. */
export function perspectivaGoogle(r: RespuestaGoogleFlights): PerspectivaPrecio | undefined {
  const nivel = r.price_insights?.price_level?.toLowerCase();
  if (nivel !== 'low' && nivel !== 'typical' && nivel !== 'high') return undefined;
  const [min, max] = r.price_insights?.typical_price_range ?? [];
  const a = precioValido(min);
  const b = precioValido(max);
  return {
    nivel: nivel === 'low' ? 'bajo' : nivel === 'high' ? 'alto' : 'normal',
    ...(a && b ? { rangoTipico: [a, b] as [number, number] } : {}),
    fuente: 'historial de Google Flights',
  };
}

const hora = (t?: string): string => (t ? t.slice(-5) : '--:--');

function duracionTexto(min?: number): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function parametrosGoogleFlights(c: Consulta): Record<string, string> {
  return {
    engine: 'google_flights',
    departure_id: c.origen,
    arrival_id: c.destino,
    outbound_date: c.ida,
    ...(c.regreso ? { return_date: c.regreso, type: '1' } : { type: '2' }),
    adults: String(c.adultos),
    currency: c.moneda,
    hl: 'es',
    gl: 'co',
    sort_by: '2',
  };
}

export function mapearGoogleFlights(r: RespuestaGoogleFlights, c: Consulta): GrupoPlataforma {
  const enlace = enlacesVuelos.googleFlights(c);
  const vuelos = [...(r.best_flights ?? []), ...(r.other_flights ?? [])];
  const ofertas: Oferta[] = [];
  vuelos.forEach((v, i) => {
    const precio = precioValido(v.price);
    const tramos = v.flights ?? [];
    if (!precio || tramos.length === 0) return;
    const aerolineas = [...new Set(tramos.map((t) => t.airline).filter(Boolean))].join(' + ');
    const escalas = v.layovers?.length ?? tramos.length - 1;
    const token = v.booking_token ? `book:${v.booking_token}` : v.departure_token ? `dep:${v.departure_token}` : undefined;
    ofertas.push({
      id: `google-flights-${i}`,
      titulo: `${aerolineas || 'Aerolínea'} · ${hora(tramos[0]?.departure_airport?.time)} → ${hora(tramos.at(-1)?.arrival_airport?.time)}`,
      detalle: [escalas === 0 ? 'Directo' : `${escalas} escala${escalas > 1 ? 's' : ''}`, duracionTexto(v.total_duration), c.regreso ? 'ida y vuelta' : 'solo ida']
        .filter(Boolean)
        .join(' · '),
      precio,
      enlace: { metodo: 'GET', url: enlace },
      // Google Flights muestra el total con impuestos y tasas.
      incluyeImpuestos: true,
      ...(esBajoCosto(aerolineas) ? { avisoEquipaje: AVISO_BAJO_COSTO } : {}),
      ...(token ? { tokenOpciones: token } : {}),
    });
  });
  return grupo('google-flights', ofertas, { enlaceBusqueda: enlace, fuente: 'Google Flights vía SerpApi' });
}

// ---------- Opciones de compra (dónde comprar un vuelo) ----------

interface OpcionGF {
  together?: {
    book_with?: string;
    airline?: boolean;
    price?: number;
    booking_request?: { url?: string; post_data?: string };
  };
}
export interface RespuestaOpcionesGF {
  booking_options?: OpcionGF[];
  other_flights?: VueloGF[];
  best_flights?: VueloGF[];
}

export function mapearOpciones(r: RespuestaOpcionesGF, respaldo: string): OpcionCompra[] {
  const opciones: OpcionCompra[] = [];
  for (const o of r.booking_options ?? []) {
    const t = o.together;
    const precio = precioValido(t?.price);
    if (!t?.book_with || !precio) continue;
    const url = t.booking_request?.url;
    let enlace: Enlace = { metodo: 'GET', url: respaldo };
    if (url && t.booking_request?.post_data) {
      enlace = { metodo: 'POST', url, campos: Object.fromEntries(new URLSearchParams(t.booking_request.post_data)) };
    } else if (url) {
      enlace = { metodo: 'GET', url };
    }
    opciones.push({ vendedor: t.book_with, esAerolinea: Boolean(t.airline), precio, enlace });
  }
  return opciones.sort((a, b) => a.precio - b.precio).slice(0, 8);
}

/** Ida y vuelta: el token de salida trae los regresos; se elige el más barato y se piden sus vendedores (2 búsquedas). */
export async function opcionesCompra(llamar: LlamarSerpApi, token: string, c: Consulta): Promise<OpcionCompra[]> {
  const base = parametrosGoogleFlights(c);
  let reserva: string | undefined;
  if (token.startsWith('book:')) {
    reserva = token.slice(5);
  } else if (token.startsWith('dep:')) {
    const regresos = await llamar<RespuestaGoogleFlights>({ ...base, departure_token: token.slice(4) });
    const masBarato = [...(regresos.best_flights ?? []), ...(regresos.other_flights ?? [])]
      .filter((v) => v.booking_token && precioValido(v.price))
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
    reserva = masBarato?.booking_token;
  }
  if (!reserva) return [];
  const r = await llamar<RespuestaOpcionesGF>({ ...base, booking_token: reserva });
  return mapearOpciones(r, enlacesVuelos.googleFlights(c));
}

// ---------- Google Hotels ----------

interface PrecioFuenteGH {
  source?: string;
  rate_per_night?: { extracted_lowest?: number };
}
interface PropiedadGH {
  name?: string;
  type?: string;
  hotel_class?: string;
  overall_rating?: number;
  property_token?: string;
  rate_per_night?: { extracted_lowest?: number };
  total_rate?: { extracted_lowest?: number };
  prices?: PrecioFuenteGH[];
  images?: Array<{ thumbnail?: string }>;
  /** Sitio del hotel (cuando Google lo conoce). */
  link?: string;
}
export interface RespuestaGoogleHotels {
  properties?: PropiedadGH[];
}

export function parametrosGoogleHotels(c: Consulta): Record<string, string> {
  return {
    engine: 'google_hotels',
    q: c.lugar,
    check_in_date: c.ida,
    check_out_date: fechaSalidaHotel(c),
    adults: String(c.adultos),
    currency: c.moneda,
    gl: 'co',
    hl: 'es',
    sort_by: '3',
  };
}

/**
 * Reagrupa por agencia: cada hotel trae los precios de varias fuentes
 * (Booking.com, Expedia, Agoda…); aquí cada fuente se vuelve una plataforma
 * con sus 3 hoteles más baratos. El enlace pasa por /api/hoteles/ir, que pide
 * el enlace exacto de esa agencia solo si el usuario hace clic.
 */
export function mapearGoogleHotels(
  r: RespuestaGoogleHotels,
  c: Consulta,
  enlaceIr: (token: string, fuente: string) => string,
  omitir: ReadonlySet<string> = new Set(),
): GrupoPlataforma[] {
  const n = Math.max(1, noches({ ida: c.ida, regreso: fechaSalidaHotel(c) }));
  const porFuente = new Map<string, { nombre: string; ofertas: Oferta[] }>();
  (r.properties ?? []).forEach((p, i) => {
    if (!p.name) return;
    const clase = p.hotel_class ?? p.type ?? 'Alojamiento';
    for (const precioFuente of p.prices ?? []) {
      const nombreFuente = precioFuente.source?.trim();
      const porNoche = precioValido(precioFuente.rate_per_night?.extracted_lowest);
      if (!nombreFuente || !porNoche) continue;
      const id = idPlataforma(nombreFuente);
      if (omitir.has(id)) continue;
      const entrada = porFuente.get(id) ?? { nombre: nombreFuente, ofertas: [] };
      entrada.ofertas.push({
        id: `${id}-${i}`,
        titulo: p.name,
        detalle: `${clase} · ${n} ${n === 1 ? 'noche' : 'noches'}`,
        precio: porNoche * n,
        precioPorNoche: porNoche,
        ...(p.overall_rating ? { calificacion: Math.round(p.overall_rating * 20) / 10 } : {}),
        ...(p.images?.[0]?.thumbnail ? { imagen: p.images[0].thumbnail } : {}),
        enlace: {
          metodo: 'GET',
          url: p.property_token ? enlaceIr(p.property_token, nombreFuente) : enlacesHoteles.googleHotels(c, `${p.name} ${c.lugar}`),
        },
      });
      porFuente.set(id, entrada);
    }
  });
  const porAgencia = [...porFuente.entries()].map(([id, { nombre, ofertas }]) =>
    grupo(id, ofertas, {
      enlaceBusqueda: id === 'booking' ? enlacesHoteles.booking(c) : enlacesHoteles.googleHotels(c),
      fuente: `${nombre} vía Google Hotels (SerpApi)`,
    }),
  );
  if (porAgencia.length > 0) return porAgencia;

  // La búsqueda de Google Hotels no siempre trae el precio de cada agencia (eso viene en el detalle
  // de cada hotel, que gasta cuota). Sin desglose, se muestra la mejor tarifa que Google encontró por hotel.
  const mejores: Oferta[] = [];
  (r.properties ?? []).forEach((p, i) => {
    const porNoche = precioValido(p.rate_per_night?.extracted_lowest);
    const total = precioValido(p.total_rate?.extracted_lowest) ?? (porNoche ? porNoche * n : null);
    if (!p.name || !total) return;
    mejores.push({
      id: `google-hotels-${i}`,
      titulo: p.name,
      detalle: `${p.hotel_class ?? p.type ?? 'Alojamiento'} · ${n} ${n === 1 ? 'noche' : 'noches'} · mejor tarifa entre agencias`,
      precio: total,
      precioPorNoche: porNoche ?? Math.round(total / n),
      ...(p.overall_rating ? { calificacion: Math.round(p.overall_rating * 20) / 10 } : {}),
      ...(p.images?.[0]?.thumbnail ? { imagen: p.images[0].thumbnail } : {}),
      // Google Hotels abre el hotel con las tarifas de todas las agencias para comparar.
      enlace: { metodo: 'GET', url: enlacesHoteles.googleHotels(c, `${p.name} ${c.lugar}`) },
    });
  });
  if (mejores.length === 0) return [];
  return [
    grupo('google-hotels', mejores, {
      enlaceBusqueda: enlacesHoteles.googleHotels(c),
      fuente: 'Mejor tarifa por hotel entre Booking.com, Expedia, Agoda y otras (Google Hotels vía SerpApi)',
    }),
  ];
}

interface DetalleGH {
  prices?: Array<{ source?: string; link?: string }>;
  featured_prices?: Array<{ source?: string; link?: string }>;
}

/** Enlace de una agencia para un hotel y fechas concretas (detalle de propiedad: 1 búsqueda). */
export async function enlaceDeAgencia(llamar: LlamarSerpApi, token: string, fuente: string, c: Consulta): Promise<string | undefined> {
  const r = await llamar<DetalleGH>({ ...parametrosGoogleHotels(c), property_token: token });
  const buscado = idPlataforma(fuente);
  const todas = [...(r.featured_prices ?? []), ...(r.prices ?? [])];
  return todas.find((p) => p.source && idPlataforma(p.source) === buscado && p.link)?.link;
}

// ---------- Booking.com ----------

interface PropiedadBooking {
  name?: string;
  link?: string;
  type?: string;
  location?: string;
  rating?: number;
  extracted_price?: number;
  extracted_price_per_night?: number;
  extracted_taxes_and_fees?: number;
  thumbnail?: string;
}
export interface RespuestaBooking {
  properties?: PropiedadBooking[];
}

export function parametrosBooking(c: Consulta): Record<string, string> {
  return {
    engine: 'booking',
    q: c.lugar,
    check_in_date: c.ida,
    check_out_date: fechaSalidaHotel(c),
    adults: String(c.adultos),
    rooms: '1',
    currency: c.moneda,
    hl: 'es',
  };
}

export function mapearBooking(r: RespuestaBooking, c: Consulta): GrupoPlataforma {
  const n = Math.max(1, noches({ ida: c.ida, regreso: fechaSalidaHotel(c) }));
  const ofertas: Oferta[] = [];
  (r.properties ?? []).forEach((p, i) => {
    const base = precioValido(p.extracted_price) ?? (precioValido(p.extracted_price_per_night) ?? 0) * n;
    if (!p.name || !base) return;
    // Booking separa impuestos y tasas: se suman para mostrar el total real.
    const impuestos = precioValido(p.extracted_taxes_and_fees) ?? 0;
    const total = base + impuestos;
    ofertas.push({
      id: `booking-${i}`,
      titulo: p.name,
      detalle: [p.type ?? 'Alojamiento', p.location, `${n} ${n === 1 ? 'noche' : 'noches'}`].filter(Boolean).join(' · '),
      precio: total,
      precioPorNoche: Math.round(total / n),
      ...(impuestos > 0 ? { incluyeImpuestos: true } : {}),
      ...(p.rating ? { calificacion: p.rating } : {}),
      ...(p.thumbnail ? { imagen: p.thumbnail } : {}),
      enlace: { metodo: 'GET', url: p.link ?? enlacesHoteles.booking(c, `${p.name}, ${c.lugar}`) },
    });
  });
  return grupo('booking', ofertas, { enlaceBusqueda: enlacesHoteles.booking(c), fuente: 'Booking.com vía SerpApi' });
}

// ---------- Airbnb ----------

interface AnuncioAirbnb {
  title?: string;
  name?: string;
  link?: string;
  rating?: number;
  extracted_price?: number;
  thumbnail?: string;
}
export interface RespuestaAirbnb {
  organic_results?: AnuncioAirbnb[];
}

export function parametrosAirbnb(c: Consulta): Record<string, string> {
  return {
    engine: 'airbnb',
    q: c.lugar,
    check_in_date: c.ida,
    check_out_date: fechaSalidaHotel(c),
    adults: String(c.adultos),
    currency: c.moneda,
  };
}

export function mapearAirbnb(r: RespuestaAirbnb, c: Consulta): GrupoPlataforma {
  const n = Math.max(1, noches({ ida: c.ida, regreso: fechaSalidaHotel(c) }));
  const ofertas: Oferta[] = [];
  (r.organic_results ?? []).forEach((a, i) => {
    const total = precioValido(a.extracted_price);
    if (!total || !(a.name || a.title)) return;
    ofertas.push({
      id: `airbnb-${i}`,
      titulo: a.name ?? a.title ?? 'Alojamiento',
      detalle: `${a.title && a.name ? `${a.title} · ` : ''}${n} ${n === 1 ? 'noche' : 'noches'}`,
      precio: total,
      precioPorNoche: Math.round(total / n),
      // Airbnb devuelve el total de la estadía con tarifas incluidas.
      incluyeImpuestos: true,
      ...(a.rating ? { calificacion: Math.round(a.rating * 20) / 10 } : {}),
      ...(a.thumbnail ? { imagen: a.thumbnail } : {}),
      enlace: { metodo: 'GET', url: a.link ?? enlacesHoteles.airbnb(c) },
    });
  });
  return grupo('airbnb', ofertas, { enlaceBusqueda: enlacesHoteles.airbnb(c), fuente: 'Airbnb vía SerpApi' });
}
