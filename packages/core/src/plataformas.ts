import { sinTildes } from './lugares.ts';

export interface InfoPlataforma {
  id: string;
  nombre: string;
  /** Color de marca aproximado para el punto que la identifica (no es su logo). */
  color: string;
}

const CONOCIDAS: InfoPlataforma[] = [
  { id: 'google-flights', nombre: 'Google Flights', color: '#4285f4' },
  { id: 'aviasales', nombre: 'Aviasales', color: '#0c73fe' },
  { id: 'despegar', nombre: 'Despegar', color: '#6a1b9a' },
  { id: 'kayak', nombre: 'Kayak', color: '#ff690f' },
  { id: 'skyscanner', nombre: 'Skyscanner', color: '#0062e3' },
  { id: 'booking', nombre: 'Booking.com', color: '#003580' },
  { id: 'airbnb', nombre: 'Airbnb', color: '#ff385c' },
  { id: 'expedia', nombre: 'Expedia', color: '#fddb32' },
  { id: 'agoda', nombre: 'Agoda', color: '#5392f9' },
  { id: 'hotels-com', nombre: 'Hotels.com', color: '#d32f2f' },
  { id: 'trip-com', nombre: 'Trip.com', color: '#287dfa' },
  { id: 'priceline', nombre: 'Priceline', color: '#0068ef' },
  { id: 'vrbo', nombre: 'Vrbo', color: '#245abc' },
  { id: 'google-hotels', nombre: 'Google Hotels', color: '#34a853' },
];

const POR_ID = new Map(CONOCIDAS.map((p) => [p.id, p]));

const PREFIJOS: [string, string][] = [
  ['booking', 'booking'],
  ['expedia', 'expedia'],
  ['agoda', 'agoda'],
  ['hotels.com', 'hotels-com'],
  ['trip.com', 'trip-com'],
  ['despegar', 'despegar'],
  ['airbnb', 'airbnb'],
  ['vrbo', 'vrbo'],
  ['priceline', 'priceline'],
];

/** "Booking.com" → "booking"; "Hotels.com" → "hotels-com"; fuentes nuevas → slug. */
export function idPlataforma(nombre: string): string {
  const base = sinTildes(nombre.toLowerCase()).trim();
  for (const [prefijo, id] of PREFIJOS) if (base.startsWith(prefijo)) return id;
  return base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'otra';
}

export function infoPlataforma(idONombre: string): InfoPlataforma {
  const id = POR_ID.has(idONombre) ? idONombre : idPlataforma(idONombre);
  return POR_ID.get(id) ?? { id, nombre: idONombre, color: '#8a6f7f' };
}
