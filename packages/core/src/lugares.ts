/**
 * Ciudades y aeropuertos frecuentes. Sirven de respaldo al autocompletado,
 * para nombrar los destinos de las ofertas y para saber qué rutas son
 * nacionales. Cualquier otro código IATA también se acepta en la búsqueda.
 */
export interface Lugar {
  iata: string;
  ciudad: string;
  pais: string;
  /** Nombre que se busca en las páginas de hoteles. */
  alojamiento: string;
}

const CO = 'Colombia';

export const LUGARES: readonly Lugar[] = [
  { iata: 'BOG', ciudad: 'Bogotá', pais: CO, alojamiento: 'Bogotá, Colombia' },
  { iata: 'MDE', ciudad: 'Medellín', pais: CO, alojamiento: 'Medellín, Colombia' },
  { iata: 'CLO', ciudad: 'Cali', pais: CO, alojamiento: 'Cali, Colombia' },
  { iata: 'CTG', ciudad: 'Cartagena', pais: CO, alojamiento: 'Cartagena de Indias, Colombia' },
  { iata: 'BAQ', ciudad: 'Barranquilla', pais: CO, alojamiento: 'Barranquilla, Colombia' },
  { iata: 'SMR', ciudad: 'Santa Marta', pais: CO, alojamiento: 'Santa Marta, Colombia' },
  { iata: 'ADZ', ciudad: 'San Andrés', pais: CO, alojamiento: 'San Andrés, Colombia' },
  { iata: 'BGA', ciudad: 'Bucaramanga', pais: CO, alojamiento: 'Bucaramanga, Colombia' },
  { iata: 'PEI', ciudad: 'Pereira', pais: CO, alojamiento: 'Pereira, Colombia' },
  { iata: 'AXM', ciudad: 'Armenia', pais: CO, alojamiento: 'Salento, Quindío, Colombia' },
  { iata: 'CUC', ciudad: 'Cúcuta', pais: CO, alojamiento: 'Cúcuta, Colombia' },
  { iata: 'LET', ciudad: 'Leticia', pais: CO, alojamiento: 'Leticia, Colombia' },
  { iata: 'MTR', ciudad: 'Montería', pais: CO, alojamiento: 'Montería, Colombia' },
  { iata: 'PSO', ciudad: 'Pasto', pais: CO, alojamiento: 'Pasto, Colombia' },
  { iata: 'VVC', ciudad: 'Villavicencio', pais: CO, alojamiento: 'Villavicencio, Colombia' },
  { iata: 'MIA', ciudad: 'Miami', pais: 'Estados Unidos', alojamiento: 'Miami, Florida' },
  { iata: 'FLL', ciudad: 'Fort Lauderdale', pais: 'Estados Unidos', alojamiento: 'Fort Lauderdale, Florida' },
  { iata: 'MCO', ciudad: 'Orlando', pais: 'Estados Unidos', alojamiento: 'Orlando, Florida' },
  { iata: 'JFK', ciudad: 'Nueva York', pais: 'Estados Unidos', alojamiento: 'Nueva York' },
  { iata: 'MAD', ciudad: 'Madrid', pais: 'España', alojamiento: 'Madrid, España' },
  { iata: 'BCN', ciudad: 'Barcelona', pais: 'España', alojamiento: 'Barcelona, España' },
  { iata: 'MEX', ciudad: 'Ciudad de México', pais: 'México', alojamiento: 'Ciudad de México' },
  { iata: 'CUN', ciudad: 'Cancún', pais: 'México', alojamiento: 'Cancún, México' },
  { iata: 'PTY', ciudad: 'Ciudad de Panamá', pais: 'Panamá', alojamiento: 'Ciudad de Panamá' },
  { iata: 'LIM', ciudad: 'Lima', pais: 'Perú', alojamiento: 'Lima, Perú' },
  { iata: 'CUZ', ciudad: 'Cusco', pais: 'Perú', alojamiento: 'Cusco, Perú' },
  { iata: 'UIO', ciudad: 'Quito', pais: 'Ecuador', alojamiento: 'Quito, Ecuador' },
  { iata: 'SCL', ciudad: 'Santiago de Chile', pais: 'Chile', alojamiento: 'Santiago, Chile' },
  { iata: 'EZE', ciudad: 'Buenos Aires', pais: 'Argentina', alojamiento: 'Buenos Aires, Argentina' },
  { iata: 'GRU', ciudad: 'São Paulo', pais: 'Brasil', alojamiento: 'São Paulo, Brasil' },
  { iata: 'GIG', ciudad: 'Río de Janeiro', pais: 'Brasil', alojamiento: 'Río de Janeiro, Brasil' },
  { iata: 'PUJ', ciudad: 'Punta Cana', pais: 'República Dominicana', alojamiento: 'Punta Cana' },
  { iata: 'AUA', ciudad: 'Aruba', pais: 'Aruba', alojamiento: 'Aruba' },
  { iata: 'CUR', ciudad: 'Curazao', pais: 'Curazao', alojamiento: 'Curazao' },
  { iata: 'SJO', ciudad: 'San José', pais: 'Costa Rica', alojamiento: 'San José, Costa Rica' },
];

const POR_IATA = new Map(LUGARES.map((l) => [l.iata, l]));

/** Códigos de ciudad que usa Travelpayouts y su aeropuerto principal. */
const ALIAS: Record<string, string> = { NYC: 'JFK', BUE: 'EZE', SAO: 'GRU', RIO: 'GIG' };

export function buscarLugar(iata: string): Lugar | undefined {
  const codigo = iata.toUpperCase();
  return POR_IATA.get(codigo) ?? POR_IATA.get(ALIAS[codigo] ?? '');
}

/** Aeropuertos de Colombia más allá de la lista: cualquier código conocido como nacional. */
const NACIONALES_EXTRA = new Set(['EJA', 'IBE', 'NVA', 'PPN', 'RCH', 'VUP', 'EYP', 'APO', 'UIB', 'PVA', 'LMC', 'MZL', 'TCO']);

export function esNacional(iata: string): boolean {
  const lugar = buscarLugar(iata);
  return lugar ? lugar.pais === CO : NACIONALES_EXTRA.has(iata.toUpperCase());
}

export function nombreCiudad(iata: string): string {
  return buscarLugar(iata)?.ciudad ?? iata.toUpperCase();
}

/** Búsqueda local para el autocompletado sin red: por código, ciudad o país, sin tildes. */
export function filtrarLugares(texto: string, limite = 8): Lugar[] {
  const q = sinTildes(texto.trim().toLowerCase());
  if (!q) return [];
  const puntaje = (l: Lugar): number => {
    const ciudad = sinTildes(l.ciudad.toLowerCase());
    if (l.iata.toLowerCase() === q) return 0;
    if (ciudad.startsWith(q)) return 1;
    if (ciudad.includes(q)) return 2;
    if (sinTildes(l.pais.toLowerCase()).startsWith(q)) return 3;
    return 9;
  };
  return LUGARES.map((l) => ({ l, p: puntaje(l) }))
    .filter((x) => x.p < 9)
    .sort((a, b) => a.p - b.p)
    .slice(0, limite)
    .map((x) => x.l);
}

export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
