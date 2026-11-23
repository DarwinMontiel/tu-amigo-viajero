/**
 * Respuestas de muestra con la forma documentada por SerpApi y Travelpayouts
 * (recortadas a los campos que usa la API). Sirven para probar el mapeo sin red.
 */
import type { RespuestaAirbnb, RespuestaBooking, RespuestaGoogleFlights, RespuestaGoogleHotels, RespuestaOpcionesGF } from '../src/proveedores/serpapi.ts';
import type { RespuestaTP } from '../src/proveedores/travelpayouts.ts';

export const googleFlights: RespuestaGoogleFlights = {
  best_flights: [
    {
      flights: [{ departure_airport: { id: 'BOG', time: '2026-12-10 09:30' }, arrival_airport: { id: 'CTG', time: '2026-12-10 11:01' }, airline: 'Avianca' }],
      layovers: [],
      total_duration: 91,
      price: 1_025_600,
      departure_token: 'TOKEN_SALIDA_1',
    },
  ],
  other_flights: [
    {
      flights: [{ departure_airport: { id: 'BOG', time: '2026-12-10 05:10' }, arrival_airport: { id: 'CTG', time: '2026-12-10 06:38' }, airline: 'Wingo' }],
      total_duration: 88,
      price: 779_800,
      departure_token: 'TOKEN_SALIDA_2',
    },
    {
      flights: [
        { departure_airport: { id: 'BOG', time: '2026-12-10 18:20' }, arrival_airport: { id: 'MDE', time: '2026-12-10 19:20' }, airline: 'LATAM' },
        { departure_airport: { id: 'MDE', time: '2026-12-10 20:30' }, arrival_airport: { id: 'CTG', time: '2026-12-10 21:45' }, airline: 'LATAM' },
      ],
      layovers: [{}],
      total_duration: 205,
      price: 936_000,
    },
    { flights: [], price: 1 },
    { flights: [{ airline: 'Sin precio' }] },
    {
      flights: [{ departure_airport: { id: 'BOG', time: '2026-12-10 13:45' }, arrival_airport: { id: 'CTG', time: '2026-12-10 15:12' }, airline: 'JetSMART' }],
      total_duration: 87,
      price: 804_600,
    },
  ],
};

export const opcionesGF: RespuestaOpcionesGF = {
  booking_options: [
    { together: { book_with: 'Avianca', airline: true, price: 1_025_600, booking_request: { url: 'https://www.google.com/travel/clk/f', post_data: 'u=abc&tok=1%202' } } },
    { together: { book_with: 'Despegar', price: 998_000, booking_request: { url: 'https://www.despegar.com.co/x' } } },
    { together: { book_with: 'Sin precio' } },
  ],
};

export const googleHotels: RespuestaGoogleHotels = {
  properties: [
    {
      name: 'Hotel Capilla del Mar',
      hotel_class: 'Hotel de 4 estrellas',
      overall_rating: 4.3,
      property_token: 'PROP_1',
      images: [{ thumbnail: 'https://lh3.googleusercontent.com/capilla.jpg' }],
      prices: [
        { source: 'Booking.com', rate_per_night: { extracted_lowest: 389_000 } },
        { source: 'Expedia', rate_per_night: { extracted_lowest: 398_000 } },
        { source: 'Airbnb', rate_per_night: { extracted_lowest: 300_000 } },
      ],
    },
    {
      name: 'Hotel Regatta',
      property_token: 'PROP_2',
      prices: [
        { source: 'Booking.com', rate_per_night: { extracted_lowest: 342_000 } },
        { source: 'Agoda', rate_per_night: { extracted_lowest: 338_900 } },
        { source: 'Expedia' },
      ],
    },
    { name: 'Sin precios' },
  ],
};

export const booking: RespuestaBooking = {
  properties: [
    { name: 'Hotel Regatta', link: 'https://www.booking.com/hotel/co/regatta.html', type: 'Hotel', extracted_price: 1_710_000, extracted_price_per_night: 342_000, rating: 8.1 },
    { name: 'Sin precio', link: 'https://www.booking.com/hotel/co/x.html' },
  ],
};

export const airbnb: RespuestaAirbnb = {
  organic_results: [
    { title: 'Apartamento en Bocagrande', name: 'Frente al mar', link: 'https://www.airbnb.com.co/rooms/1', extracted_price: 1_490_000, rating: 4.9 },
    { title: 'Casa en Getsemaní', link: 'https://www.airbnb.com.co/rooms/2', extracted_price: 3_450_000 },
  ],
};

export const travelpayouts: RespuestaTP = {
  success: true,
  data: [
    {
      origin: 'BOG',
      destination: 'CTG',
      price: 395_400,
      airline: 'JA',
      departure_at: '2026-12-10T13:45:00-05:00',
      return_at: '2026-12-15T16:00:00-05:00',
      transfers: 0,
      duration_to: 87,
      link: '/search/BOG1012CTG15121?t=JA123',
    },
    { origin: 'BOG', destination: 'CTG', price: 401_200, airline: 'P5', departure_at: '2026-12-10T05:10:00-05:00', transfers: 0, duration_to: 88 },
  ],
};

export const ofertasTP: RespuestaTP = {
  success: true,
  data: [
    { origin: 'BOG', destination: 'CTG', price: 390_000, departure_at: '2026-12-11T05:10:00-05:00', return_at: '2026-12-16T05:10:00-05:00', link: '/search/a' },
    { origin: 'BOG', destination: 'CTG', price: 410_000, departure_at: '2026-12-12T05:10:00-05:00' },
    { origin: 'BOG', destination: 'MIA', price: 1_450_000, departure_at: '2026-12-20T23:10:00-05:00', transfers: 1 },
    { origin: 'BOG', destination: 'SMR', price: 99_000, departure_at: '2026-11-20T05:10:00-05:00' },
  ],
};
