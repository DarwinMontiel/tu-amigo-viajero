import { describe, expect, it } from 'vitest';
import { enlacesHoteles, enlacesVuelos, fechaSalidaHotel, validarConsulta, type Consulta } from '../src/index.ts';

function consulta(cambios: Record<string, string> = {}): Consulta {
  const r = validarConsulta(
    'vuelos',
    { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-17', adultos: '2', ...cambios },
    '2026-11-23',
  );
  if (!r.ok) throw new Error('consulta inválida');
  return r.consulta;
}

describe('enlaces a cada plataforma (formatos comprobados en el navegador)', () => {
  it('Despegar ida y vuelta y solo ida', () => {
    expect(enlacesVuelos.despegar(consulta())).toBe('https://www.despegar.com.co/shop/flights/results/roundtrip/BOG/CTG/2026-12-10/2026-12-17/2/0/0');
    expect(enlacesVuelos.despegar(consulta({ regreso: '' }))).toBe('https://www.despegar.com.co/shop/flights/results/oneway/BOG/CTG/2026-12-10/2/0/0');
  });

  it('Aviasales codifica fechas DDMM y adultos', () => {
    expect(enlacesVuelos.aviasales(consulta())).toBe('https://www.aviasales.com/search/BOG1012CTG17122');
    expect(enlacesVuelos.aviasales(consulta({ regreso: '' }), 'abc')).toBe('https://www.aviasales.com/search/BOG1012CTG2?marker=abc');
  });

  it('Kayak y Skyscanner', () => {
    expect(enlacesVuelos.kayak(consulta())).toBe('https://www.kayak.com.co/flights/BOG-CTG/2026-12-10/2026-12-17/2adults?sort=price_a');
    expect(enlacesVuelos.skyscanner(consulta())).toBe(
      'https://www.skyscanner.com.co/transporte/vuelos/bog/ctg/261210/261217/?adultsv2=2&cabinclass=economy&rtn=1',
    );
  });

  it('Google Flights lleva la búsqueda en texto, idioma y moneda', () => {
    const url = new URL(enlacesVuelos.googleFlights(consulta()));
    expect(url.searchParams.get('q')).toBe('Flights to CTG from BOG on 2026-12-10 through 2026-12-17 for 2 adults');
    expect(url.searchParams.get('curr')).toBe('COP');
  });

  it('Booking y Airbnb usan el lugar de hospedaje y una noche si no hay regreso', () => {
    const c = consulta({ regreso: '' });
    expect(fechaSalidaHotel(c)).toBe('2026-12-11');
    const booking = new URL(enlacesHoteles.booking(c));
    expect(booking.searchParams.get('ss')).toBe('Cartagena de Indias, Colombia');
    expect(booking.searchParams.get('checkout')).toBe('2026-12-11');
    expect(enlacesHoteles.airbnb(c)).toBe(
      'https://www.airbnb.com.co/s/Cartagena-de-Indias--Colombia/homes?checkin=2026-12-10&checkout=2026-12-11&adults=2',
    );
  });
});
