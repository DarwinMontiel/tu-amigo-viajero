/**
 * Modelo de dominio compartido por la web y la API.
 *
 * Todas las cifras de dinero son números enteros en la moneda de la búsqueda
 * (`moneda`) y corresponden al TOTAL del viaje: todos los pasajeros y, en
 * hoteles, todas las noches. Así se pueden comparar y sumar sin ambigüedad.
 */

export type Moneda = 'COP' | 'USD' | 'EUR';
export const MONEDAS: readonly Moneda[] = ['COP', 'USD', 'EUR'];

export type Modulo = 'vuelos' | 'hoteles' | 'paquetes';

/** Cómo se abre la oferta en la plataforma: casi siempre un enlace normal. */
export type Enlace =
  | { metodo: 'GET'; url: string }
  /** Google Flights entrega algunos enlaces de compra como formularios POST. */
  | { metodo: 'POST'; url: string; campos: Record<string, string> };

export interface Oferta {
  id: string;
  /** Línea principal: aerolínea y horario, o nombre del hotel. */
  titulo: string;
  /** Línea secundaria: escalas y duración, o tipo de alojamiento y zona. */
  detalle: string;
  /** Total del viaje en la moneda de la búsqueda. */
  precio: number;
  /** Solo hoteles: precio por noche. */
  precioPorNoche?: number;
  enlace: Enlace;
  etiquetas?: string[];
  calificacion?: number;
  imagen?: string;
  /** Vuelos de Google Flights: token para consultar dónde comprarlo. */
  tokenOpciones?: string;
  /** Paquetes: las dos piezas que lo componen. */
  piezas?: { vuelo: PiezaPaquete; hotel: PiezaPaquete };
}

export interface PiezaPaquete {
  plataforma: string;
  titulo: string;
  precio: number;
  enlace: Enlace;
}

export type EstadoGrupo =
  /** Hay precios. */
  | 'ok'
  /** La fuente respondió, pero sin resultados para esa búsqueda. */
  | 'sin-resultados'
  /** La fuente falló o tardó demasiado. */
  | 'error'
  /** La plataforma no ofrece una API pública: solo se arma el enlace. */
  | 'solo-enlace';

export interface GrupoPlataforma {
  plataforma: { id: string; nombre: string };
  estado: EstadoGrupo;
  /** Como máximo 3, de menor a mayor precio. */
  ofertas: Oferta[];
  /** La misma búsqueda abierta en la plataforma, para ver todos sus resultados. */
  enlaceBusqueda?: string;
  /** De dónde salen los precios (por ejemplo «Google Hotels vía SerpApi»). */
  fuente?: string;
  nota?: string;
}

export type ModoDatos = 'demo' | 'vivo';

export interface RespuestaBusqueda {
  modulo: Modulo;
  modo: ModoDatos;
  moneda: Moneda;
  /** ISO 8601 de cuándo se consultaron las fuentes (o se grabaron los datos de ejemplo). */
  consultadoEn: string;
  /** Grupos con precio primero, ordenados por su oferta más barata. */
  grupos: GrupoPlataforma[];
  avisos: string[];
}

export interface OfertaDestacada {
  origen: string;
  destino: string;
  ciudadDestino: string;
  pais: string;
  nacional: boolean;
  precio: number;
  ida: string;
  regreso?: string;
  escalas: number;
  plataforma: string;
  enlace: Enlace;
}

export interface RespuestaOfertas {
  modo: ModoDatos;
  moneda: Moneda;
  origen: string;
  consultadoEn: string;
  nacionales: OfertaDestacada[];
  internacionales: OfertaDestacada[];
  avisos: string[];
}

export interface OpcionCompra {
  vendedor: string;
  precio: number;
  enlace: Enlace;
  esAerolinea: boolean;
}

export interface RespuestaOpciones {
  modo: ModoDatos;
  moneda: Moneda;
  opciones: OpcionCompra[];
}
