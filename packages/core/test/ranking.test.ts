import { describe, expect, it } from 'vitest';
import { armarPaquetes, grupo, masBaratas, ordenarGrupos, resumir, validarConsulta, type Oferta } from '../src/index.ts';

const oferta = (id: string, precio: number, extra: Partial<Oferta> = {}): Oferta => ({
  id,
  titulo: id,
  detalle: '',
  precio,
  enlace: { metodo: 'GET', url: `https://ejemplo.com/${id}` },
  ...extra,
});

describe('masBaratas', () => {
  it('devuelve las 3 más baratas de menor a mayor sin precios inválidos ni repetidas', () => {
    const r = masBaratas([
      oferta('a', 500),
      oferta('b', 100),
      oferta('c', Number.NaN),
      oferta('d', 0),
      oferta('e', 300),
      oferta('b', 100),
      oferta('f', 200),
    ]);
    expect(r.map((o) => o.precio)).toEqual([100, 200, 300]);
  });
});

describe('grupos', () => {
  it('fija el estado según haya precios y ordena con los baratos primero', () => {
    const caro = grupo('booking', [oferta('x', 900)]);
    const barato = grupo('expedia', [oferta('y', 400)]);
    const vacio = grupo('agoda', []);
    expect(vacio.estado).toBe('sin-resultados');
    const enlace = { ...grupo('kayak', []), estado: 'solo-enlace' as const };
    expect(ordenarGrupos([enlace, vacio, caro, barato]).map((g) => g.plataforma.id)).toEqual(['expedia', 'booking', 'agoda', 'kayak']);
  });

  it('resume la oferta más barata y el ahorro frente a la plataforma más cara', () => {
    const r = resumir({ grupos: [grupo('booking', [oferta('x', 900)]), grupo('expedia', [oferta('y', 400)])] });
    expect(r.masBarata?.plataforma).toBe('Expedia');
    expect(r.ahorro).toBe(500);
    expect(r.plataformasConPrecio).toBe(2);
  });
});

describe('armarPaquetes', () => {
  const v = validarConsulta('paquetes', { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2' }, '2026-11-23');
  if (!v.ok) throw new Error('consulta inválida');

  it('suma el vuelo más barato a los 3 hoteles más baratos de cada plataforma', () => {
    const vuelos = { grupos: [grupo('google-flights', [oferta('v1', 800_000), oferta('v2', 700_000)])] };
    const hoteles = {
      grupos: [grupo('booking', [oferta('h1', 1_000_000), oferta('h2', 900_000), oferta('h3', 2_000_000), oferta('h4', 3_000_000)])],
    };
    const { grupos, avisos } = armarPaquetes(v.consulta, vuelos, hoteles);
    const paquete = grupos[0]!;
    expect(paquete.plataforma).toEqual({ id: 'paquete-booking', nombre: 'Vuelo + Booking.com' });
    expect(paquete.ofertas.map((o) => o.precio)).toEqual([1_600_000, 1_700_000, 2_700_000]);
    expect(paquete.ofertas[0]?.piezas?.vuelo.precio).toBe(700_000);
    expect(grupos.at(-1)?.estado).toBe('solo-enlace');
    expect(avisos.join(' ')).toMatch(/2 adultos/);
  });

  it('sin vuelos solo deja los enlaces de agencias de paquetes', () => {
    const { grupos, avisos } = armarPaquetes(v.consulta, { grupos: [] }, { grupos: [grupo('booking', [oferta('h', 1)])] });
    expect(grupos.every((g) => g.estado === 'solo-enlace')).toBe(true);
    expect(avisos[0]).toMatch(/No encontramos precios de vuelos/);
  });
});
