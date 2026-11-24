import {
  AVISO_BAJO_COSTO,
  esBajoCosto,
  buscarLugar,
  enlacesVuelos,
  esNacional,
  grupo,
  hoyEnColombia,
  nombreAerolinea,
  nombreCiudad,
  precioValido,
  diasEntre,
  type Consulta,
  type GrupoPlataforma,
  type Moneda,
  type Oferta,
  type OfertaDestacada,
} from '@tav/core';
import { obtenerJSON } from '../http.ts';

/**
 * Travelpayouts Data API (Aviasales): precios en caché que vieron otros
 * viajeros en las últimas 48 horas. Gratis para afiliados registrados.
 * Documentación: https://support.travelpayouts.com/hc/en-us/articles/203956163
 */
const BASE = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';

export interface BoletoTP {
  origin?: string;
  destination?: string;
  price?: number;
  airline?: string;
  departure_at?: string;
  return_at?: string;
  transfers?: number;
  return_transfers?: number;
  duration_to?: number;
  link?: string;
}
export interface RespuestaTP {
  success?: boolean;
  data?: BoletoTP[];
  error?: string | null;
}

export interface ConfigTP {
  token: string;
  marcador?: string;
}

function hhmm(iso?: string, sumarMin = 0): string {
  if (!iso) return '--:--';
  // "2026-12-10T05:10:00-05:00": la hora local de salida está en el texto.
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return '--:--';
  const total = (Number(m[1]) * 60 + Number(m[2]) + sumarMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function duracion(min?: number): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Enlace de Aviasales: el `link` relativo de la API (con fechas y tarifa) más el marcador de afiliado. */
export function enlaceAviasales(link: string | undefined, c: Consulta, marcador?: string): string {
  if (!link) return enlacesVuelos.aviasales(c, marcador);
  const url = new URL(link, 'https://www.aviasales.com');
  if (marcador) url.searchParams.set('marker', marcador);
  return url.toString();
}

export function parametrosTP(c: Consulta, cfg: ConfigTP): Record<string, string> {
  return {
    origin: c.origen,
    destination: c.destino,
    departure_at: c.ida,
    ...(c.regreso ? { return_at: c.regreso, one_way: 'false' } : { one_way: 'true' }),
    sorting: 'price',
    direct: 'false',
    currency: c.moneda.toLowerCase(),
    market: 'co',
    limit: '10',
    token: cfg.token,
  };
}

export function mapearTP(r: RespuestaTP, c: Consulta, cfg: Pick<ConfigTP, 'marcador'>): GrupoPlataforma {
  const ofertas: Oferta[] = [];
  (r.data ?? []).forEach((b, i) => {
    const porPersona = precioValido(b.price);
    if (!porPersona) return;
    const escalas = b.transfers ?? 0;
    ofertas.push({
      id: `aviasales-${i}`,
      // La API da la hora local de salida y la duración; la llegada en hora local del destino no viene, así que no se inventa.
      titulo: `${nombreAerolinea(b.airline ?? '')} · sale ${hhmm(b.departure_at)}`,
      detalle: [escalas === 0 ? 'Directo' : `${escalas} escala${escalas > 1 ? 's' : ''}`, duracion(b.duration_to), c.regreso ? 'ida y vuelta' : 'solo ida']
        .filter(Boolean)
        .join(' · '),
      // La API da el precio por adulto.
      precio: porPersona * c.adultos,
      enlace: { metodo: 'GET', url: enlaceAviasales(b.link, c, cfg.marcador) },
      ...(esBajoCosto(nombreAerolinea(b.airline ?? '')) ? { avisoEquipaje: AVISO_BAJO_COSTO } : {}),
    });
  });
  return grupo('aviasales', ofertas, {
    enlaceBusqueda: enlacesVuelos.aviasales(c, cfg.marcador),
    fuente: 'Aviasales vía Travelpayouts Data API',
    nota: 'Precios vistos por otros viajeros en las últimas 48 horas: confirma el valor al abrir.',
    ...(cfg.marcador ? { afiliado: true } : {}),
  });
}

export async function vuelosAviasales(c: Consulta, cfg: ConfigTP): Promise<GrupoPlataforma> {
  const r = await obtenerJSON<RespuestaTP>('Travelpayouts', `${BASE}?${new URLSearchParams(parametrosTP(c, cfg))}`);
  if (r.success === false) throw new Error(r.error ?? 'Travelpayouts respondió con error');
  return mapearTP(r, c, cfg);
}

/** Ofertas para la portada: el boleto más barato por destino desde una ciudad. */
export function mapearOfertas(r: RespuestaTP, origen: string, moneda: Moneda, cfg: Pick<ConfigTP, 'marcador'>, hoy = hoyEnColombia()): OfertaDestacada[] {
  const vistos = new Set<string>();
  const ofertas: OfertaDestacada[] = [];
  for (const b of r.data ?? []) {
    const precio = precioValido(b.price);
    const destino = b.destination?.toUpperCase();
    const ida = b.departure_at?.slice(0, 10);
    if (!precio || !destino || !ida || vistos.has(destino) || diasEntre(hoy, ida) < 1) continue;
    vistos.add(destino);
    const regreso = b.return_at?.slice(0, 10);
    const lugar = buscarLugar(destino);
    const consulta: Consulta = { modulo: 'vuelos', origen, destino, lugar: lugar?.alojamiento ?? destino, ida, regreso: regreso ?? '', adultos: 1, moneda };
    ofertas.push({
      origen,
      destino,
      ciudadDestino: nombreCiudad(destino),
      pais: lugar?.pais ?? '',
      nacional: esNacional(destino),
      precio,
      ida,
      ...(regreso ? { regreso } : {}),
      escalas: b.transfers ?? 0,
      plataforma: 'Aviasales',
      enlace: { metodo: 'GET', url: enlaceAviasales(b.link, consulta, cfg.marcador) },
    });
  }
  return ofertas.sort((a, b) => a.precio - b.precio);
}

export async function ofertasDesde(origen: string, moneda: Moneda, cfg: ConfigTP): Promise<OfertaDestacada[]> {
  const parametros = new URLSearchParams({
    origin: origen,
    unique: 'true',
    sorting: 'price',
    one_way: 'false',
    direct: 'false',
    currency: moneda.toLowerCase(),
    market: 'co',
    limit: '100',
    token: cfg.token,
  });
  const r = await obtenerJSON<RespuestaTP>('Travelpayouts', `${BASE}?${parametros}`);
  if (r.success === false) throw new Error(r.error ?? 'Travelpayouts respondió con error');
  return mapearOfertas(r, origen, moneda, cfg);
}
