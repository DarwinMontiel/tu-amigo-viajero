import { describe, expect, it } from 'vitest';
import { claveConsulta, consultaAParametros, noches, validarConsulta } from '../src/index.ts';

const HOY = '2026-11-23';
const base = { origen: 'bog', destino: 'ctg', ida: '2026-12-10', regreso: '2026-12-17', adultos: '2', moneda: 'cop' };

describe('validarConsulta', () => {
  it('normaliza una búsqueda de vuelos válida', () => {
    const r = validarConsulta('vuelos', base, HOY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.consulta).toMatchObject({ origen: 'BOG', destino: 'CTG', adultos: 2, moneda: 'COP', lugar: 'Cartagena de Indias, Colombia' });
    expect(noches(r.consulta)).toBe(7);
  });

  it('acepta vuelos solo de ida, pero exige regreso en hoteles y paquetes', () => {
    expect(validarConsulta('vuelos', { ...base, regreso: '' }, HOY).ok).toBe(true);
    const hoteles = validarConsulta('hoteles', { ...base, regreso: '' }, HOY);
    expect(hoteles.ok).toBe(false);
    if (!hoteles.ok) expect(hoteles.errores.regreso).toMatch(/salida/);
  });

  it('hoteles no necesita origen', () => {
    const r = validarConsulta('hoteles', { ...base, origen: '' }, HOY);
    expect(r.ok && r.consulta.origen).toBe('');
  });

  it.each([
    [{ origen: 'BO' }, 'origen'],
    [{ destino: 'BOG' }, 'destino'],
    [{ ida: '2026-11-22' }, 'ida'],
    [{ ida: '2026-02-31' }, 'ida'],
    [{ ida: '2027-12-01' }, 'ida'],
    [{ regreso: '2026-12-01' }, 'regreso'],
    [{ adultos: '0' }, 'adultos'],
    [{ adultos: '10' }, 'adultos'],
    [{ adultos: '1.5' }, 'adultos'],
    [{ moneda: 'ARS' }, 'moneda'],
  ])('rechaza %o en el campo correspondiente (%s)', (cambio, campo) => {
    const r = validarConsulta('vuelos', { ...base, ...cambio }, HOY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errores)).toContain(campo);
  });

  it('limita estadías de hotel a 30 noches y exige al menos una', () => {
    expect(validarConsulta('hoteles', { ...base, regreso: '2026-12-10' }, HOY).ok).toBe(false);
    expect(validarConsulta('hoteles', { ...base, regreso: '2027-01-20' }, HOY).ok).toBe(false);
  });

  it('lee URLSearchParams y produce parámetros y clave estables', () => {
    const r = validarConsulta('paquetes', new URLSearchParams(base), HOY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(consultaAParametros(r.consulta).toString()).toBe('origen=BOG&destino=CTG&ida=2026-12-10&regreso=2026-12-17&adultos=2&moneda=COP');
    expect(claveConsulta(r.consulta)).toBe('paquetes:BOG:CTG:2026-12-10:2026-12-17:2:COP');
  });
});
