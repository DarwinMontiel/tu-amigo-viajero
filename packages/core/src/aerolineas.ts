/** Códigos IATA de aerolíneas frecuentes en rutas desde Colombia. */
const AEROLINEAS: Record<string, string> = {
  AV: 'Avianca', LA: 'LATAM', '4C': 'LATAM', P5: 'Wingo', JA: 'JetSMART', '9R': 'Satena', VH: 'Viva', CM: 'Copa',
  AA: 'American Airlines', DL: 'Delta', UA: 'United', NK: 'Spirit', B6: 'JetBlue', F9: 'Frontier',
  IB: 'Iberia', UX: 'Air Europa', PU: 'Plus Ultra', AF: 'Air France', KL: 'KLM', LH: 'Lufthansa', TK: 'Turkish Airlines',
  AM: 'Aeroméxico', Y4: 'Volaris', AR: 'Aerolíneas Argentinas', H2: 'SKY', G3: 'Gol', AD: 'Azul', '2K': 'Avianca Ecuador',
};

export function nombreAerolinea(codigo: string): string {
  return AEROLINEAS[codigo.toUpperCase()] ?? codigo.toUpperCase();
}
