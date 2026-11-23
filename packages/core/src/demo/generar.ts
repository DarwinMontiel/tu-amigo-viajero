import { noches, type Consulta } from '../consulta.ts';
import { enlacesHoteles, enlacesVuelos } from '../enlaces.ts';
import { sumarDias } from '../fechas.ts';
import { gruposSoloEnlaceVuelos } from '../fijos.ts';
import { buscarLugar, esNacional, nombreCiudad } from '../lugares.ts';
import { convertirDesdeCOP } from '../moneda.ts';
import { armarPaquetes, grupo, ordenarGrupos } from '../ranking.ts';
import type { GrupoPlataforma, Moneda, Oferta, OfertaDestacada, RespuestaBusqueda, RespuestaOfertas, RespuestaOpciones } from '../tipos.ts';
import { HOTELES, OFERTAS, RUTAS, VENDEDORES, type HotelEjemplo, type VueloEjemplo } from './datos.ts';

/** Fecha fija en que se "grabaron" los datos de ejemplo. */
export const GRABADO_EN = '2026-11-23T12:00:00.000Z';

export const AVISO_DEMO =
  'Modo demo: los precios son datos de ejemplo grabados para mostrar el comparador. Los enlaces sí abren la búsqueda real en cada página.';

export const RUTAS_DEMO = Object.keys(RUTAS).map((r) => {
  const [origen, destino] = r.split('-') as [string, string];
  return { origen, destino };
});

function rutaDemo(c: Consulta): { datos: (typeof RUTAS)[string]; invertida: boolean } | undefined {
  const directa = RUTAS[`${c.origen}-${c.destino}`];
  if (directa) return { datos: directa, invertida: false };
  const inversa = RUTAS[`${c.destino}-${c.origen}`];
  return inversa ? { datos: inversa, invertida: true } : undefined;
}

function duracion(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function ofertaVuelo(v: VueloEjemplo, i: number, plataforma: string, c: Consulta, enlace: string): Oferta {
  const [aerolinea, sale, llega, escalas, minutos, porPersona] = v;
  const factorTramo = c.regreso ? 1 : 0.55;
  return {
    id: `${plataforma}-${i}`,
    titulo: `${aerolinea} · ${sale} → ${llega}`,
    detalle: `${escalas === 0 ? 'Directo' : `${escalas} escala${escalas > 1 ? 's' : ''}`} · ${duracion(minutos)}${c.regreso ? ' · ida y vuelta' : ' · solo ida'}`,
    precio: convertirDesdeCOP(porPersona * factorTramo * c.adultos, c.moneda),
    enlace: { metodo: 'GET', url: enlace },
    ...(plataforma === 'google-flights' ? { tokenOpciones: `demo:${c.origen}-${c.destino}:${i}` } : {}),
  };
}

function habitaciones(adultos: number): number {
  return Math.ceil(adultos / 2);
}

function ofertaHotel(h: HotelEjemplo, i: number, plataforma: string, c: Consulta): Oferta {
  const [nombre, detalle, porNoche, calificacion] = h;
  const n = Math.max(1, noches(c));
  const ciudad = nombreCiudad(c.destino);
  const noche = porNoche * habitaciones(c.adultos);
  const enlace =
    plataforma === 'booking'
      ? enlacesHoteles.booking(c, `${nombre}, ${ciudad}`)
      : plataforma === 'airbnb'
        ? enlacesHoteles.airbnb(c)
        : enlacesHoteles.googleHotels(c, `${nombre} ${ciudad}`);
  return {
    id: `${plataforma}-${i}`,
    titulo: nombre,
    detalle: `${detalle} · ${n} ${n === 1 ? 'noche' : 'noches'}`,
    precio: convertirDesdeCOP(noche * n, c.moneda),
    precioPorNoche: convertirDesdeCOP(noche, c.moneda),
    calificacion,
    enlace: { metodo: 'GET', url: enlace },
  };
}

const FUENTE_DEMO = 'Datos de ejemplo';

function vuelosDemo(c: Consulta): GrupoPlataforma[] {
  const ruta = rutaDemo(c);
  const fijos = gruposSoloEnlaceVuelos(c);
  if (!ruta) return fijos;
  const gf = enlacesVuelos.googleFlights(c);
  const av = enlacesVuelos.aviasales(c);
  return [
    grupo('google-flights', ruta.datos.googleFlights.map((v, i) => ofertaVuelo(v, i, 'google-flights', c, gf)), {
      enlaceBusqueda: gf,
      fuente: `${FUENTE_DEMO} · en vivo: Google Flights vía SerpApi`,
    }),
    grupo('aviasales', ruta.datos.aviasales.map((v, i) => ofertaVuelo(v, i, 'aviasales', c, av)), {
      enlaceBusqueda: av,
      fuente: `${FUENTE_DEMO} · en vivo: Travelpayouts Data API`,
      nota: 'Precios vistos por otros viajeros en las últimas 48 horas: confirma el valor al abrir.',
    }),
    ...fijos,
  ];
}

function hotelesDemo(c: Consulta): GrupoPlataforma[] {
  const datos = HOTELES[c.destino];
  if (!datos) return [];
  return Object.entries(datos).map(([plataforma, hoteles]) =>
    grupo(plataforma, hoteles.map((h, i) => ofertaHotel(h, i, plataforma, c)), {
      enlaceBusqueda:
        plataforma === 'booking' ? enlacesHoteles.booking(c) : plataforma === 'airbnb' ? enlacesHoteles.airbnb(c) : enlacesHoteles.googleHotels(c),
      fuente:
        plataforma === 'booking'
          ? `${FUENTE_DEMO} · en vivo: Booking.com vía SerpApi`
          : plataforma === 'airbnb'
            ? `${FUENTE_DEMO} · en vivo: Airbnb vía SerpApi`
            : `${FUENTE_DEMO} · en vivo: Google Hotels vía SerpApi`,
    }),
  );
}

function sinDatosDemo(c: Consulta): string | undefined {
  const rutas = RUTAS_DEMO.map((r) => `${nombreCiudad(r.origen)} → ${nombreCiudad(r.destino)}`).join(', ');
  const destinos = Object.keys(HOTELES).map(nombreCiudad).join(', ');
  if (c.modulo === 'hoteles' && !HOTELES[c.destino]) return `En el modo demo hay hoteles de ejemplo solo para ${destinos}. Los enlaces de abajo sí buscan tu destino real.`;
  if (c.modulo !== 'hoteles' && !rutaDemo(c)) return `En el modo demo hay vuelos de ejemplo solo para ${rutas} (y sus regresos). Los enlaces sí buscan tu ruta real.`;
  return undefined;
}

/** Respuesta completa del modo demo, con la misma forma que la API en vivo. */
export function buscarDemo(c: Consulta): RespuestaBusqueda {
  const avisos = [AVISO_DEMO];
  const falta = sinDatosDemo(c);
  if (falta) avisos.push(falta);

  let grupos: GrupoPlataforma[];
  if (c.modulo === 'vuelos') {
    grupos = vuelosDemo(c);
  } else if (c.modulo === 'hoteles') {
    grupos = hotelesDemo(c);
    if (grupos.length === 0) {
      grupos = [
        { plataforma: { id: 'booking', nombre: 'Booking.com' }, estado: 'solo-enlace', ofertas: [], enlaceBusqueda: enlacesHoteles.booking(c), nota: 'Abre la búsqueda de tu destino ordenada por precio.' },
        { plataforma: { id: 'airbnb', nombre: 'Airbnb' }, estado: 'solo-enlace', ofertas: [], enlaceBusqueda: enlacesHoteles.airbnb(c), nota: 'Casas y apartamentos para esas fechas.' },
        { plataforma: { id: 'google-hotels', nombre: 'Google Hotels' }, estado: 'solo-enlace', ofertas: [], enlaceBusqueda: enlacesHoteles.googleHotels(c), nota: 'Compara tarifas de varias agencias por hotel.' },
      ];
    }
  } else {
    const paquetes = armarPaquetes(c, { grupos: vuelosDemo(c) }, { grupos: hotelesDemo(c) });
    grupos = paquetes.grupos;
    avisos.push(...paquetes.avisos);
  }
  return { modulo: c.modulo, modo: 'demo', moneda: c.moneda, consultadoEn: GRABADO_EN, grupos: ordenarGrupos(grupos), avisos };
}

export function ofertasDemo(origen: string, moneda: Moneda, hoy: string): RespuestaOfertas {
  const lista = OFERTAS[origen] ?? [];
  const destacadas: OfertaDestacada[] = lista.map(([destino, enDias, n, escalas, precio]) => {
    const ida = sumarDias(hoy, enDias);
    const regreso = sumarDias(ida, n);
    const lugar = buscarLugar(destino);
    const consulta: Consulta = { modulo: 'vuelos', origen, destino, lugar: lugar?.alojamiento ?? destino, ida, regreso, adultos: 1, moneda };
    return {
      origen,
      destino,
      ciudadDestino: nombreCiudad(destino),
      pais: lugar?.pais ?? '',
      nacional: esNacional(destino),
      precio: convertirDesdeCOP(precio, moneda),
      ida,
      regreso,
      escalas,
      plataforma: 'Aviasales',
      enlace: { metodo: 'GET', url: enlacesVuelos.aviasales(consulta) },
    };
  });
  destacadas.sort((a, b) => a.precio - b.precio);
  const avisos = [AVISO_DEMO];
  if (lista.length === 0) avisos.push(`En el modo demo hay ofertas de ejemplo solo desde ${Object.keys(OFERTAS).map(nombreCiudad).join(', ')}.`);
  return {
    modo: 'demo',
    moneda,
    origen,
    consultadoEn: GRABADO_EN,
    nacionales: destacadas.filter((o) => o.nacional),
    internacionales: destacadas.filter((o) => !o.nacional),
    avisos,
  };
}

/** «¿Dónde lo compro?» en modo demo: el mismo vuelo con precio por vendedor. */
export function opcionesDemo(token: string, c: Consulta): RespuestaOpciones {
  const m = /^demo:([A-Z]{3})-([A-Z]{3}):(\d+)$/.exec(token);
  const ruta = m ? RUTAS[`${m[1]}-${m[2]}`] ?? RUTAS[`${m[2]}-${m[1]}`] : undefined;
  const vuelo = ruta?.googleFlights[Number(m?.[3])];
  if (!vuelo) return { modo: 'demo', moneda: c.moneda, opciones: [] };
  const base = vuelo[5] * (c.regreso ? 1 : 0.55) * c.adultos;
  const opciones = VENDEDORES.map(([vendedor, esAerolinea, recargo]) => {
    const nombre = esAerolinea ? `${vuelo[0]} (sitio oficial)` : vendedor;
    const url = esAerolinea ? enlacesVuelos.googleFlights(c) : vendedor === 'Despegar' ? enlacesVuelos.despegar(c) : enlacesVuelos.googleFlights(c);
    return { vendedor: nombre, esAerolinea, precio: convertirDesdeCOP(base + recargo * c.adultos, c.moneda), enlace: { metodo: 'GET' as const, url } };
  }).sort((a, b) => a.precio - b.precio);
  return { modo: 'demo', moneda: c.moneda, opciones };
}
