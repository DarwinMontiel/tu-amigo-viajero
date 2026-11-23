import type { Consulta } from './consulta.ts';
import { noches } from './consulta.ts';
import { sumarDias } from './fechas.ts';

/**
 * Búsquedas en cada plataforma armadas con los datos del usuario. Los
 * formatos se comprobaron abriendo cada URL en el navegador (noviembre de
 * 2026): conservan ruta, fechas y pasajeros.
 */

function qs(parametros: Record<string, string | number>): string {
  return new URLSearchParams(Object.entries(parametros).map(([k, v]) => [k, String(v)])).toString();
}

/** "2026-12-10" → "261210" (Skyscanner). */
const aAAMMDD = (iso: string): string => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
/** "2026-12-10" → "1012" (Aviasales). */
const aDDMM = (iso: string): string => iso.slice(8, 10) + iso.slice(5, 7);

/** Salida del hotel: el regreso, o una noche si el vuelo es solo de ida. */
export function fechaSalidaHotel(c: Consulta): string {
  return c.regreso && noches(c) > 0 ? c.regreso : sumarDias(c.ida, 1);
}

export const enlacesVuelos = {
  despegar(c: Consulta): string {
    const tramo = c.regreso
      ? `roundtrip/${c.origen}/${c.destino}/${c.ida}/${c.regreso}`
      : `oneway/${c.origen}/${c.destino}/${c.ida}`;
    return `https://www.despegar.com.co/shop/flights/results/${tramo}/${c.adultos}/0/0`;
  },
  googleFlights(c: Consulta): string {
    const q = `Flights to ${c.destino} from ${c.origen} on ${c.ida}${c.regreso ? ` through ${c.regreso}` : ' oneway'}${c.adultos > 1 ? ` for ${c.adultos} adults` : ''}`;
    return `https://www.google.com/travel/flights?${qs({ q, hl: 'es-419', gl: 'CO', curr: c.moneda })}`;
  },
  kayak(c: Consulta): string {
    return `https://www.kayak.com.co/flights/${c.origen}-${c.destino}/${c.ida}${c.regreso ? `/${c.regreso}` : ''}/${c.adultos}adults?sort=price_a`;
  },
  skyscanner(c: Consulta): string {
    return (
      `https://www.skyscanner.com.co/transporte/vuelos/${c.origen.toLowerCase()}/${c.destino.toLowerCase()}/` +
      `${aAAMMDD(c.ida)}/${c.regreso ? `${aAAMMDD(c.regreso)}/` : ''}?` +
      qs({ adultsv2: c.adultos, cabinclass: 'economy', rtn: c.regreso ? 1 : 0 })
    );
  },
  /** BOG1012CTG17122 = Bogotá 10/12 → Cartagena, regreso 17/12, 2 adultos. */
  aviasales(c: Consulta, marcador?: string): string {
    const ruta = `${c.origen}${aDDMM(c.ida)}${c.destino}${c.regreso ? aDDMM(c.regreso) : ''}${c.adultos}`;
    return `https://www.aviasales.com/search/${ruta}${marcador ? `?${qs({ marker: marcador })}` : ''}`;
  },
};

export const enlacesHoteles = {
  booking(c: Consulta, texto = c.lugar): string {
    return `https://www.booking.com/searchresults.es.html?${qs({
      ss: texto,
      checkin: c.ida,
      checkout: fechaSalidaHotel(c),
      group_adults: c.adultos,
      no_rooms: 1,
      group_children: 0,
      selected_currency: c.moneda,
      order: 'price',
    })}`;
  },
  airbnb(c: Consulta): string {
    const lugar = encodeURIComponent(c.lugar.replace(/,\s*/g, '--').replace(/\s+/g, '-'));
    return `https://www.airbnb.com.co/s/${lugar}/homes?${qs({ checkin: c.ida, checkout: fechaSalidaHotel(c), adults: c.adultos })}`;
  },
  /** Google Hotels no respeta fechas por URL: abre el hotel o la ciudad con todas sus tarifas. */
  googleHotels(c: Consulta, texto = c.lugar): string {
    return `https://www.google.com/travel/search?${qs({ q: texto, hl: 'es-419', gl: 'co', curr: c.moneda })}`;
  },
};

export const enlacesPaquetes = {
  despegar(): string {
    return 'https://www.despegar.com.co/paquetes/';
  },
  expedia(): string {
    return 'https://www.expedia.com/Vacation-Packages';
  },
};
