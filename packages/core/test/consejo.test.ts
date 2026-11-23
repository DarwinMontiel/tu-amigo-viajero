import { describe, expect, it } from 'vitest';
import { buscarDemo, consejoDeCompra, domingoDePascua, esBajoCosto, temporadaAlta, validarConsulta, type Modulo } from '../src/index.ts';

const HOY = '2026-11-23';

function consulta(modulo: Modulo, cambios: Record<string, string>) {
  const r = validarConsulta(modulo, { origen: 'BOG', destino: 'CTG', adultos: '1', ...cambios }, HOY);
  if (!r.ok) throw new Error(JSON.stringify(r.errores));
  return r.consulta;
}

describe('temporadas altas de Colombia', () => {
  it('calcula el Domingo de Pascua', () => {
    expect(domingoDePascua(2026)).toBe('2026-04-05');
    expect(domingoDePascua(2027)).toBe('2027-03-28');
  });

  it.each([
    ['2026-12-20', 'fin de año'],
    ['2027-01-10', 'fin de año'],
    ['2027-03-25', 'Semana Santa'],
    ['2027-07-05', 'vacaciones de mitad de año'],
    ['2027-02-10', undefined],
  ])('%s → %s', (fecha, esperado) => {
    expect(temporadaAlta(fecha)).toBe(esperado);
  });
});

describe('consejoDeCompra', () => {
  it('a menos de dos semanas aconseja comprar pronto', () => {
    const c = consejoDeCompra(consulta('vuelos', { ida: '2026-12-01' }), { hoy: HOY });
    expect(c.nivel).toBe('comprar');
    expect(c.titulo).toMatch(/menos de dos semanas/);
  });

  it('un vuelo nacional muy lejano puede esperar', () => {
    const c = consejoDeCompra(consulta('vuelos', { ida: '2027-05-10' }), { hoy: HOY });
    expect(c.nivel).toBe('esperar');
    expect(c.razones.join(' ')).toMatch(/semanas antes/);
  });

  it('usa el indicador de Google cuando el precio está alto y menciona la temporada', () => {
    const c = consejoDeCompra(consulta('vuelos', { ida: '2026-12-20' }), {
      hoy: HOY,
      perspectiva: { nivel: 'alto', rangoTipico: [300_000, 500_000], fuente: 'historial de Google Flights' },
    });
    expect(c.nivel).toBe('atento');
    expect(c.razones.join(' ')).toMatch(/fin de año/);
    expect(c.razones.join(' ')).toMatch(/historial de Google Flights/);
  });

  it('en hoteles de temporada alta aconseja reservar con cancelación gratis', () => {
    const c = consejoDeCompra(consulta('hoteles', { ida: '2026-12-26', regreso: '2026-12-30' }), { hoy: HOY });
    expect(c.titulo).toMatch(/cancelación gratis/);
  });
});

describe('ayudas en los resultados', () => {
  it('reconoce aerolíneas de bajo costo', () => {
    expect(esBajoCosto('Wingo · 05:10 → 06:38')).toBe(true);
    expect(esBajoCosto('LATAM + JetSMART')).toBe(true);
    expect(esBajoCosto('Avianca · 09:30 → 11:01')).toBe(false);
  });

  it('el modo demo marca impuestos, maleta y el rango típico de la ruta', () => {
    const r = buscarDemo(consulta('vuelos', { ida: '2026-12-10', regreso: '2026-12-15' }));
    const ofertas = r.grupos.flatMap((g) => g.ofertas);
    expect(ofertas.every((o) => o.incluyeImpuestos)).toBe(true);
    expect(ofertas.find((o) => o.titulo.startsWith('Wingo'))?.avisoEquipaje).toMatch(/maleta/);
    expect(ofertas.find((o) => o.titulo.startsWith('Avianca'))?.avisoEquipaje).toBeUndefined();
    expect(r.perspectiva?.rangoTipico?.[0]).toBeGreaterThan(0);
  });
});
