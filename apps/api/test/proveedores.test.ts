import { validarConsulta, type Consulta } from '@tav/core';
import { describe, expect, it } from 'vitest';
import * as serp from '../src/proveedores/serpapi.ts';
import * as tp from '../src/proveedores/travelpayouts.ts';
import * as muestras from './muestras.ts';

function consulta(cambios: Record<string, string> = {}): Consulta {
  const r = validarConsulta(cambios.regreso === '' ? 'vuelos' : 'paquetes', { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2', ...cambios }, '2026-11-23');
  if (!r.ok) throw new Error('consulta inválida');
  return r.consulta;
}

describe('SerpApi · Google Flights', () => {
  it('pide los vuelos ordenados por precio, en la moneda de la búsqueda', () => {
    expect(serp.parametrosGoogleFlights(consulta())).toMatchObject({ departure_id: 'BOG', arrival_id: 'CTG', return_date: '2026-12-15', type: '1', sort_by: '2', currency: 'COP', adults: '2' });
    expect(serp.parametrosGoogleFlights(consulta({ regreso: '' }))).toMatchObject({ type: '2' });
  });

  it('devuelve los 3 más baratos con aerolínea, horario, escalas y token para ver vendedores', () => {
    const g = serp.mapearGoogleFlights(muestras.googleFlights, consulta());
    expect(g.estado).toBe('ok');
    expect(g.ofertas.map((o) => o.precio)).toEqual([779_800, 804_600, 936_000]);
    expect(g.ofertas[0]).toMatchObject({ titulo: 'Wingo · 05:10 → 06:38', detalle: 'Directo · 1 h 28 min · ida y vuelta', tokenOpciones: 'dep:TOKEN_SALIDA_2' });
    expect(g.ofertas[2]?.detalle).toMatch(/^1 escala/);
  });

  it('lee el indicador de precio de Google y marca impuestos y maleta', () => {
    expect(serp.perspectivaGoogle({ price_insights: { price_level: 'high', typical_price_range: [600_000, 900_000] } })).toEqual({
      nivel: 'alto',
      rangoTipico: [600_000, 900_000],
      fuente: 'historial de Google Flights',
    });
    expect(serp.perspectivaGoogle({})).toBeUndefined();
    const g = serp.mapearGoogleFlights(muestras.googleFlights, consulta());
    expect(g.ofertas[0]).toMatchObject({ incluyeImpuestos: true, avisoEquipaje: expect.stringMatching(/maleta/) });
    expect(g.ofertas[2]?.avisoEquipaje).toBeUndefined();
  });

  it('las opciones de compra respetan los formularios POST de Google', () => {
    const opciones = serp.mapearOpciones(muestras.opcionesGF, 'https://respaldo');
    expect(opciones.map((o) => o.vendedor)).toEqual(['Despegar', 'Avianca']);
    expect(opciones[1]?.enlace).toEqual({ metodo: 'POST', url: 'https://www.google.com/travel/clk/f', campos: { u: 'abc', tok: '1 2' } });
    expect(opciones[1]?.esAerolinea).toBe(true);
  });

  it('ida y vuelta: usa el token de salida, elige el regreso más barato y pide sus vendedores', async () => {
    const llamadas: Array<Record<string, string>> = [];
    const llamar: serp.LlamarSerpApi = async <T,>(p: Record<string, string>) => {
      llamadas.push(p);
      if (p.departure_token) return { other_flights: [{ price: 900, booking_token: 'CARO' }, { price: 800, booking_token: 'BARATO' }] } as T;
      return muestras.opcionesGF as T;
    };
    const opciones = await serp.opcionesCompra(llamar, 'dep:TOKEN', consulta());
    expect(llamadas.map((l) => l.departure_token ?? l.booking_token)).toEqual(['TOKEN', 'BARATO']);
    expect(opciones).toHaveLength(2);
  });
});

describe('SerpApi · Google Hotels', () => {
  it('reagrupa los precios por agencia y omite las que tienen motor propio', () => {
    const grupos = serp.mapearGoogleHotels(muestras.googleHotels, consulta(), (t, f) => `https://api/ir?token=${t}&fuente=${f}`, new Set(['airbnb']));
    const porId = Object.fromEntries(grupos.map((g) => [g.plataforma.id, g]));
    expect(Object.keys(porId).sort()).toEqual(['agoda', 'booking', 'expedia']);
    expect(porId.booking!.ofertas.map((o) => [o.titulo, o.precio, o.precioPorNoche])).toEqual([
      ['Hotel Regatta', 1_710_000, 342_000],
      ['Hotel Capilla del Mar', 1_945_000, 389_000],
    ]);
    expect(porId.booking!.ofertas[1]).toMatchObject({ calificacion: 8.6, imagen: 'https://lh3.googleusercontent.com/capilla.jpg' });
    expect(porId.expedia!.ofertas[0]?.enlace.url).toBe('https://api/ir?token=PROP_1&fuente=Expedia');
  });

  it('el enlace de agencia sale del detalle de la propiedad', async () => {
    const llamar: serp.LlamarSerpApi = async <T,>() =>
      ({ prices: [{ source: 'Agoda', link: 'https://www.agoda.com/x' }, { source: 'Expedia', link: 'https://www.expedia.com/y' }] }) as T;
    expect(await serp.enlaceDeAgencia(llamar, 'PROP_1', 'Expedia', consulta())).toBe('https://www.expedia.com/y');
    expect(await serp.enlaceDeAgencia(llamar, 'PROP_1', 'Trip.com', consulta())).toBeUndefined();
  });
});

describe('SerpApi · Booking y Airbnb', () => {
  it('Booking usa el enlace directo y el total de la estadía', () => {
    const g = serp.mapearBooking(muestras.booking, consulta());
    expect(g.ofertas).toHaveLength(1);
    expect(g.ofertas[0]).toMatchObject({ precio: 1_710_000, precioPorNoche: 342_000, calificacion: 8.1, enlace: { url: 'https://www.booking.com/hotel/co/regatta.html' } });
  });

  it('Booking suma impuestos y tasas al total cuando vienen aparte', () => {
    const g = serp.mapearBooking({ properties: [{ name: 'Hotel X', link: 'https://www.booking.com/x', extracted_price: 1_000_000, extracted_taxes_and_fees: 190_000 }] }, consulta());
    expect(g.ofertas[0]).toMatchObject({ precio: 1_190_000, precioPorNoche: 238_000, incluyeImpuestos: true });
  });

  it('Airbnb pasa la calificación de 5 a 10 y calcula el precio por noche', () => {
    const g = serp.mapearAirbnb(muestras.airbnb, consulta());
    expect(g.ofertas[0]).toMatchObject({ titulo: 'Frente al mar', precio: 1_490_000, precioPorNoche: 298_000, calificacion: 9.8 });
  });
});

describe('Travelpayouts · Aviasales', () => {
  it('multiplica el precio por adulto y arma el enlace con el marcador de afiliado', () => {
    const g = tp.mapearTP(muestras.travelpayouts, consulta(), { marcador: 'M1' });
    expect(g.ofertas[0]).toMatchObject({ titulo: 'JetSMART · 13:45 → 15:12', precio: 790_800 });
    expect(g.ofertas[0]?.enlace.url).toBe('https://www.aviasales.com/search/BOG1012CTG15121?t=JA123&marker=M1');
    expect(g.ofertas[1]?.enlace.url).toBe('https://www.aviasales.com/search/BOG1012CTG15122?marker=M1');
    // Con marcador de afiliado, la tarjeta lo declara; la segunda oferta es de Wingo (bajo costo).
    expect(g.afiliado).toBe(true);
    expect(g.ofertas[1]?.avisoEquipaje).toMatch(/maleta/);
    expect(tp.mapearTP(muestras.travelpayouts, consulta(), {}).afiliado).toBeUndefined();
  });

  it('pide fechas exactas, ida y vuelta y mercado colombiano', () => {
    expect(tp.parametrosTP(consulta(), { token: 'T' })).toMatchObject({ departure_at: '2026-12-10', return_at: '2026-12-15', one_way: 'false', market: 'co', currency: 'cop' });
  });

  it('ofertas: una por destino, futuras y de menor a mayor', () => {
    const o = tp.mapearOfertas(muestras.ofertasTP, 'BOG', 'COP', {}, '2026-11-23');
    expect(o.map((x) => [x.destino, x.precio, x.nacional])).toEqual([
      ['CTG', 390_000, true],
      ['MIA', 1_450_000, false],
    ]);
  });
});
