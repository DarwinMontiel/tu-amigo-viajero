/**
 * DATOS DE EJEMPLO del modo demo. Los precios están en pesos colombianos y
 * se armaron a mano a partir de rangos típicos de noviembre de 2026 para
 * mostrar cómo funciona el comparador sin claves de API. NO son precios
 * reales y la interfaz siempre lo dice. Los nombres de aerolíneas y hoteles
 * son reales para que los enlaces de la demo lleven a búsquedas útiles.
 */

/** [aerolínea, salida, llegada, escalas, duración en minutos, precio ida y vuelta por persona en COP] */
export type VueloEjemplo = [string, string, string, number, number, number];

/** [nombre, tipo y zona, precio por noche en COP para una habitación doble, calificación de 10] */
export type HotelEjemplo = [string, string, number, number];

export interface RutaEjemplo {
  googleFlights: VueloEjemplo[];
  aviasales: VueloEjemplo[];
}

export const RUTAS: Record<string, RutaEjemplo> = {
  'BOG-CTG': {
    googleFlights: [
      ['Wingo', '05:10', '06:38', 0, 88, 389_900],
      ['JetSMART', '13:45', '15:12', 0, 87, 402_300],
      ['LATAM', '07:25', '08:55', 0, 90, 468_500],
      ['Avianca', '09:30', '11:01', 0, 91, 512_800],
      ['Avianca', '18:20', '21:45', 1, 205, 498_000],
    ],
    aviasales: [
      ['JetSMART', '13:45', '15:12', 0, 87, 395_400],
      ['Wingo', '05:10', '06:38', 0, 88, 401_200],
      ['LATAM', '16:40', '18:09', 0, 89, 455_900],
      ['Avianca', '09:30', '11:01', 0, 91, 520_100],
    ],
  },
  'MDE-ADZ': {
    googleFlights: [
      ['Avianca', '06:05', '07:52', 0, 107, 612_400],
      ['LATAM', '11:15', '14:40', 1, 205, 659_900],
      ['Wingo', '08:30', '10:20', 0, 110, 588_300],
      ['Avianca', '15:50', '17:38', 0, 108, 701_000],
    ],
    aviasales: [
      ['Wingo', '08:30', '10:20', 0, 110, 579_800],
      ['Avianca', '06:05', '07:52', 0, 107, 624_000],
      ['LATAM', '11:15', '14:40', 1, 205, 671_500],
    ],
  },
  'BOG-MIA': {
    googleFlights: [
      ['Avianca', '07:05', '11:25', 0, 260, 1_689_000],
      ['American Airlines', '08:50', '13:15', 0, 265, 1_812_400],
      ['LATAM', '12:30', '19:40', 1, 430, 1_598_700],
      ['JetSMART', '23:10', '07:55', 1, 525, 1_455_300],
    ],
    aviasales: [
      ['JetSMART', '23:10', '07:55', 1, 525, 1_472_900],
      ['Spirit', '06:00', '13:58', 1, 478, 1_399_600],
      ['Avianca', '07:05', '11:25', 0, 260, 1_702_300],
    ],
  },
  'BOG-MAD': {
    googleFlights: [
      ['Iberia', '15:40', '08:05', 0, 625, 3_985_000],
      ['Avianca', '19:35', '12:10', 0, 635, 4_120_500],
      ['Air Europa', '16:10', '08:45', 0, 635, 3_870_200],
      ['Plus Ultra', '20:15', '13:30', 0, 655, 3_640_800],
    ],
    aviasales: [
      ['Plus Ultra', '20:15', '13:30', 0, 655, 3_598_000],
      ['Air Europa', '16:10', '08:45', 0, 635, 3_902_700],
      ['LATAM', '10:05', '09:20', 1, 1035, 3_455_100],
      ['Iberia', '15:40', '08:05', 0, 625, 4_010_300],
    ],
  },
  'MDE-CTG': {
    googleFlights: [
      ['JetSMART', '06:20', '07:35', 0, 75, 318_400],
      ['Avianca', '08:45', '10:02', 0, 77, 402_900],
      ['LATAM', '12:10', '13:28', 0, 78, 366_700],
      ['Wingo', '16:05', '17:20', 0, 75, 329_900],
    ],
    aviasales: [
      ['Wingo', '16:05', '17:20', 0, 75, 322_800],
      ['JetSMART', '06:20', '07:35', 0, 75, 325_100],
      ['Avianca', '08:45', '10:02', 0, 77, 409_500],
    ],
  },
  'CLO-CTG': {
    googleFlights: [
      ['Avianca', '07:40', '09:20', 0, 100, 455_200],
      ['LATAM', '10:15', '14:05', 1, 230, 412_700],
      ['JetSMART', '13:30', '15:12', 0, 102, 428_900],
    ],
    aviasales: [
      ['JetSMART', '13:30', '15:12', 0, 102, 421_300],
      ['LATAM', '10:15', '14:05', 1, 230, 418_000],
      ['Avianca', '07:40', '09:20', 0, 100, 461_700],
    ],
  },
  'BOG-SMR': {
    googleFlights: [
      ['Wingo', '06:00', '07:32', 0, 92, 342_500],
      ['LATAM', '09:50', '11:25', 0, 95, 398_100],
      ['Avianca', '14:15', '15:49', 0, 94, 445_600],
      ['JetSMART', '18:40', '20:10', 0, 90, 351_900],
    ],
    aviasales: [
      ['JetSMART', '18:40', '20:10', 0, 90, 339_800],
      ['Wingo', '06:00', '07:32', 0, 92, 348_400],
      ['LATAM', '09:50', '11:25', 0, 95, 405_000],
    ],
  },
  'BOG-ADZ': {
    googleFlights: [
      ['Avianca', '07:15', '09:20', 0, 125, 598_000],
      ['LATAM', '10:40', '12:48', 0, 128, 645_300],
      ['Wingo', '12:30', '14:35', 0, 125, 612_900],
    ],
    aviasales: [
      ['Wingo', '12:30', '14:35', 0, 125, 605_100],
      ['Avianca', '07:15', '09:20', 0, 125, 610_400],
    ],
  },
  'BOG-AXM': {
    googleFlights: [
      ['Avianca', '06:30', '07:25', 0, 55, 298_700],
      ['LATAM', '11:45', '12:42', 0, 57, 276_400],
      ['Avianca', '17:20', '18:15', 0, 55, 334_100],
    ],
    aviasales: [
      ['LATAM', '11:45', '12:42', 0, 57, 271_900],
      ['Avianca', '06:30', '07:25', 0, 55, 305_200],
    ],
  },
  'BOG-CUN': {
    googleFlights: [
      ['Viva', '05:45', '09:10', 0, 265, 1_689_200],
      ['Avianca', '09:20', '12:50', 0, 270, 1_845_600],
      ['Copa', '06:10', '12:35', 1, 445, 1_612_900],
    ],
    aviasales: [
      ['Copa', '06:10', '12:35', 1, 445, 1_598_300],
      ['Viva', '05:45', '09:10', 0, 265, 1_702_000],
    ],
  },
};

export const HOTELES: Record<string, Record<string, HotelEjemplo[]>> = {
  CTG: {
    booking: [
      ['Hotel Capilla del Mar', 'Hotel 4★ · Bocagrande', 389_000, 8.4],
      ['Hotel Caribe by Faranda Grand', 'Hotel 5★ · Bocagrande', 512_000, 8.7],
      ['Bastión Luxury Hotel', 'Hotel 5★ · Ciudad Amurallada', 845_000, 9.2],
      ['Hotel Regatta Cartagena', 'Hotel 4★ · Bocagrande', 342_000, 8.1],
    ],
    expedia: [
      ['Hotel Regatta Cartagena', 'Hotel 4★ · Bocagrande', 355_500, 8.1],
      ['Hotel Capilla del Mar', 'Hotel 4★ · Bocagrande', 398_200, 8.4],
      ['Sofitel Legend Santa Clara', 'Hotel 5★ · Ciudad Amurallada', 1_420_000, 9.4],
    ],
    agoda: [
      ['Hotel Regatta Cartagena', 'Hotel 4★ · Bocagrande', 338_900, 8.1],
      ['Hotel Caribe by Faranda Grand', 'Hotel 5★ · Bocagrande', 498_000, 8.7],
      ['Bastión Luxury Hotel', 'Hotel 5★ · Ciudad Amurallada', 861_000, 9.2],
    ],
    'hotels-com': [
      ['Hotel Capilla del Mar', 'Hotel 4★ · Bocagrande', 401_000, 8.4],
      ['Hotel Caribe by Faranda Grand', 'Hotel 5★ · Bocagrande', 520_300, 8.7],
    ],
    airbnb: [
      ['Apartamento frente al mar en Bocagrande', 'Apartamento entero · 2 habitaciones', 298_000, 9.6],
      ['Casa colonial en Getsemaní', 'Casa entera · 3 habitaciones', 690_000, 9.8],
      ['Loft en el Centro Histórico', 'Loft entero · 1 habitación', 315_000, 9.4],
    ],
  },
  ADZ: {
    booking: [
      ['Decameron Aquarium', 'Todo incluido 4★ · Centro', 780_000, 8.2],
      ['Hotel Sunrise Beach', 'Hotel 4★ · Spratt Bight', 455_000, 8.0],
      ['Casa Harb', 'Hotel boutique · San Luis', 1_150_000, 9.5],
    ],
    expedia: [
      ['Hotel Sunrise Beach', 'Hotel 4★ · Spratt Bight', 468_000, 8.0],
      ['Decameron Aquarium', 'Todo incluido 4★ · Centro', 765_000, 8.2],
    ],
    agoda: [
      ['Hotel Sunrise Beach', 'Hotel 4★ · Spratt Bight', 449_700, 8.0],
      ['Hotel Portobelo', 'Hotel 3★ · Centro', 285_000, 7.6],
      ['Decameron Aquarium', 'Todo incluido 4★ · Centro', 792_000, 8.2],
    ],
    airbnb: [
      ['Posada nativa en San Luis', 'Habitación privada · Posada', 210_000, 9.3],
      ['Apartamento con vista al mar', 'Apartamento entero · 1 habitación', 330_000, 9.1],
    ],
  },
  MIA: {
    booking: [
      ['Freehand Miami', 'Hostal y hotel · Miami Beach', 498_000, 8.3],
      ['Generator Miami', 'Hotel · Miami Beach', 612_000, 8.0],
      ['YVE Hotel Miami', 'Hotel 3★ · Downtown', 735_000, 8.6],
    ],
    expedia: [
      ['YVE Hotel Miami', 'Hotel 3★ · Downtown', 722_000, 8.6],
      ['Generator Miami', 'Hotel · Miami Beach', 640_000, 8.0],
      ['The Gates Hotel South Beach', 'Hotel 4★ · Miami Beach', 1_090_000, 8.8],
    ],
    agoda: [
      ['Freehand Miami', 'Hostal y hotel · Miami Beach', 485_500, 8.3],
      ['YVE Hotel Miami', 'Hotel 3★ · Downtown', 741_000, 8.6],
    ],
    airbnb: [
      ['Estudio en Brickell', 'Apartamento entero · Estudio', 560_000, 9.2],
      ['Apartamento en Little Havana', 'Apartamento entero · 1 habitación', 470_000, 9.0],
    ],
  },
  MAD: {
    booking: [
      ['Hostal Persal', 'Hostal 2★ · Sol', 365_000, 8.6],
      ['Hotel Regente', 'Hotel 3★ · Gran Vía', 520_000, 8.4],
      ['Only YOU Boutique Hotel', 'Hotel 4★ · Chueca', 980_000, 9.0],
    ],
    expedia: [
      ['Hotel Regente', 'Hotel 3★ · Gran Vía', 534_000, 8.4],
      ['Hotel Moderno', 'Hotel 3★ · Puerta del Sol', 590_000, 8.5],
    ],
    agoda: [
      ['Hostal Persal', 'Hostal 2★ · Sol', 358_000, 8.6],
      ['Hotel Moderno', 'Hotel 3★ · Puerta del Sol', 579_000, 8.5],
      ['Hotel Regente', 'Hotel 3★ · Gran Vía', 528_000, 8.4],
    ],
    airbnb: [
      ['Piso en La Latina', 'Apartamento entero · 1 habitación', 410_000, 9.3],
      ['Ático en Lavapiés', 'Apartamento entero · 2 habitaciones', 655_000, 9.5],
    ],
  },
  SMR: {
    booking: [
      ['Hotel Zuana Beach Resort', 'Resort 4★ · El Rodadero', 520_000, 8.3],
      ['Hotel Casa Verde', 'Hotel boutique · Centro Histórico', 410_000, 9.0],
      ['Hostal Bahía Taganga', 'Hostal · Taganga', 165_000, 8.5],
    ],
    expedia: [
      ['Hotel Zuana Beach Resort', 'Resort 4★ · El Rodadero', 535_000, 8.3],
      ['Hotel Santa Marta Irotama', 'Resort 4★ · Pozos Colorados', 640_000, 8.4],
    ],
    agoda: [
      ['Hostal Bahía Taganga', 'Hostal · Taganga', 158_000, 8.5],
      ['Hotel Casa Verde', 'Hotel boutique · Centro Histórico', 398_000, 9.0],
    ],
    airbnb: [
      ['Apartamento frente al mar en El Rodadero', 'Apartamento entero · 2 habitaciones', 280_000, 9.4],
      ['Cabaña en Minca', 'Cabaña entera · 1 habitación', 230_000, 9.7],
    ],
  },
  AXM: {
    booking: [
      ['Hotel Salento Real Eje Cafetero', 'Hotel 3★ · Salento', 260_000, 8.8],
      ['Finca Hotel La Floresta', 'Finca hotel · Montenegro', 345_000, 8.9],
      ['Hostal Ciudad de Segorbe', 'Hostal · Salento', 175_000, 9.1],
    ],
    agoda: [
      ['Hostal Ciudad de Segorbe', 'Hostal · Salento', 168_000, 9.1],
      ['Hotel Salento Real Eje Cafetero', 'Hotel 3★ · Salento', 255_000, 8.8],
    ],
    airbnb: [
      ['Casa cafetera con vista al valle', 'Casa entera · 3 habitaciones', 390_000, 9.6],
      ['Glamping en Filandia', 'Glamping · 1 habitación', 310_000, 9.8],
    ],
  },
  CUN: {
    booking: [
      ['Hotel Faranda Imperial Laguna', 'Hotel 4★ · Zona Hotelera', 780_000, 8.2],
      ['Selina Cancún Laguna', 'Hostal y hotel · Zona Hotelera', 420_000, 8.0],
      ['Hotel Margaritas Cancún', 'Hotel 4★ · Centro', 510_000, 8.5],
    ],
    expedia: [
      ['Hotel Margaritas Cancún', 'Hotel 4★ · Centro', 498_000, 8.5],
      ['Hotel Faranda Imperial Laguna', 'Hotel 4★ · Zona Hotelera', 765_000, 8.2],
    ],
    agoda: [
      ['Selina Cancún Laguna', 'Hostal y hotel · Zona Hotelera', 405_000, 8.0],
      ['Hotel Margaritas Cancún', 'Hotel 4★ · Centro', 515_000, 8.5],
    ],
    airbnb: [
      ['Estudio en Puerto Cancún', 'Apartamento entero · Estudio', 460_000, 9.3],
    ],
  },
};

/** Vendedores de ejemplo para «¿Dónde lo compro?» de Google Flights: [vendedor, es aerolínea, recargo en COP]. */
export const VENDEDORES: Array<[string, boolean, number]> = [
  ['Aerolínea (sitio oficial)', true, 0],
  ['Despegar', false, -6_500],
  ['Expedia', false, 4_200],
  ['Kiwi.com', false, -11_800],
  ['Trip.com', false, 1_900],
];

/** Ofertas destacadas por ciudad de salida: [destino, días desde hoy, noches, escalas, precio ida y vuelta COP]. */
export const OFERTAS: Record<string, Array<[string, number, number, number, number]>> = {
  BOG: [
    ['CTG', 18, 5, 0, 389_900],
    ['SMR', 25, 4, 0, 342_500],
    ['ADZ', 32, 5, 0, 598_000],
    ['MDE', 12, 3, 0, 219_800],
    ['PEI', 20, 3, 0, 248_300],
    ['LET', 40, 4, 0, 689_000],
    ['MIA', 30, 6, 0, 1_455_300],
    ['PTY', 22, 4, 0, 1_012_800],
    ['CUN', 45, 6, 0, 1_689_200],
    ['MAD', 60, 10, 0, 3_598_000],
    ['LIM', 35, 5, 0, 1_120_400],
    ['MEX', 28, 5, 0, 1_380_600],
  ],
  MDE: [
    ['ADZ', 21, 5, 0, 579_800],
    ['CTG', 16, 4, 0, 318_400],
    ['SMR', 27, 4, 0, 356_900],
    ['BOG', 9, 2, 0, 201_500],
    ['BAQ', 14, 3, 0, 287_600],
    ['MIA', 33, 6, 0, 1_398_000],
    ['PTY', 19, 4, 0, 905_300],
    ['PUJ', 50, 6, 1, 2_310_700],
    ['MAD', 64, 10, 0, 3_720_400],
  ],
  CLO: [
    ['CTG', 20, 5, 0, 412_700],
    ['ADZ', 29, 5, 1, 688_200],
    ['BOG', 10, 2, 0, 198_400],
    ['SMR', 24, 4, 1, 455_100],
    ['MIA', 36, 6, 1, 1_610_800],
    ['PTY', 26, 4, 0, 998_000],
    ['MAD', 70, 10, 1, 3_890_000],
  ],
};
