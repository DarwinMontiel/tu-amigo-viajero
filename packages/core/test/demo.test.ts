import { describe, expect, it } from 'vitest';
import { buscarDemo, ofertasDemo, opcionesDemo, recomendarConReglas, validarConsulta, type Modulo } from '../src/index.ts';

function consulta(modulo: Modulo, cambios: Record<string, string> = {}) {
  const r = validarConsulta(modulo, { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2', ...cambios }, '2026-11-23');
  if (!r.ok) throw new Error(JSON.stringify(r.errores));
  return r.consulta;
}

describe('modo demo', () => {
  it.each(['vuelos', 'hoteles', 'paquetes'] as const)('%s: como máximo 3 ofertas por plataforma, de menor a mayor, con enlaces https', (modulo) => {
    const r = buscarDemo(consulta(modulo));
    expect(r.modo).toBe('demo');
    expect(r.avisos[0]).toMatch(/datos de ejemplo/);
    const conPrecio = r.grupos.filter((g) => g.estado === 'ok');
    expect(conPrecio.length).toBeGreaterThanOrEqual(2);
    for (const g of conPrecio) {
      expect(g.ofertas.length).toBeLessThanOrEqual(3);
      const precios = g.ofertas.map((o) => o.precio);
      expect(precios).toEqual([...precios].sort((a, b) => a - b));
      for (const o of g.ofertas) expect(o.enlace.url).toMatch(/^https:\/\//);
    }
    // La plataforma con la oferta más barata queda primero.
    const primeras = conPrecio.map((g) => g.ofertas[0]!.precio);
    expect(primeras).toEqual([...primeras].sort((a, b) => a - b));
  });

  it('vuelos incluye las plataformas sin API como solo enlace', () => {
    const ids = buscarDemo(consulta('vuelos')).grupos.filter((g) => g.estado === 'solo-enlace').map((g) => g.plataforma.id);
    expect(ids).toEqual(expect.arrayContaining(['despegar', 'kayak', 'skyscanner']));
  });

  it('una ruta sin datos de ejemplo avisa y conserva los enlaces reales', () => {
    const r = buscarDemo(consulta('vuelos', { destino: 'LIM' }));
    expect(r.grupos.every((g) => g.estado === 'solo-enlace')).toBe(true);
    expect(r.avisos.join(' ')).toMatch(/solo para/);
  });

  it('acepta la ruta inversa y convierte a dólares', () => {
    const r = buscarDemo(consulta('vuelos', { origen: 'CTG', destino: 'BOG', moneda: 'USD' }));
    const precio = r.grupos.find((g) => g.estado === 'ok')?.ofertas[0]?.precio ?? 0;
    expect(r.moneda).toBe('USD');
    expect(precio).toBeGreaterThan(50);
    expect(precio).toBeLessThan(500);
  });

  it('ofertas destacadas separa nacionales e internacionales', () => {
    const r = ofertasDemo('BOG', 'COP', '2026-11-23');
    expect(r.nacionales.every((o) => o.nacional)).toBe(true);
    expect(r.internacionales.some((o) => o.destino === 'MAD')).toBe(true);
  });

  it('opciones de compra del demo vienen ordenadas por precio', () => {
    const c = consulta('vuelos');
    const token = buscarDemo(c).grupos.find((g) => g.plataforma.id === 'google-flights')?.ofertas[0]?.tokenOpciones ?? '';
    const precios = opcionesDemo(token, c).opciones.map((o) => o.precio);
    expect(precios.length).toBeGreaterThan(2);
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });

  it('la recomendación por reglas menciona la opción más barata y el presupuesto', () => {
    const c = consulta('paquetes');
    const r = recomendarConReglas(buscarDemo(c), { adultos: 2, noches: 5, presupuesto: { valor: 1_000_000, moneda: 'COP' } });
    expect(r.titular).toMatch(/Lo más barato/);
    expect(r.puntos.join(' ')).toMatch(/presupuesto/);
  });
});
