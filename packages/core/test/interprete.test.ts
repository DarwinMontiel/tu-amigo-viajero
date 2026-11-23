import { describe, expect, it } from 'vitest';
import { interpretarConReglas } from '../src/index.ts';

const HOY = '2026-11-23'; // lunes

describe('interpretarConReglas', () => {
  it('entiende origen, destino, rango de fechas y adultos', () => {
    const r = interpretarConReglas('Vuelo de Bogotá a Cartagena del 10 al 17 de diciembre para 2 personas', HOY);
    expect(r).toMatchObject({ modulo: 'vuelos', origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-17', adultos: 2, faltantes: [] });
    expect(r.motor).toBe('reglas');
  });

  it('un pedido temático sugiere destinos de playa y arma un paquete con presupuesto', () => {
    const r = interpretarConReglas('Quiero playa en diciembre saliendo de Medellín con mi familia, máximo 3 millones, una semana', HOY);
    expect(r.modulo).toBe('paquetes');
    expect(r.origen).toBe('MDE');
    expect(['CTG', 'SMR', 'ADZ']).toContain(r.destino);
    expect(r.adultos).toBe(4);
    expect(r.presupuesto).toEqual({ valor: 3_000_000, moneda: 'COP' });
    expect(r.ida).toBe('2026-12-05'); // primer sábado de diciembre
    expect(r.regreso).toBe('2026-12-12');
  });

  it('playas en el exterior sugiere destinos internacionales', () => {
    const r = interpretarConReglas('playa internacional desde Bogotá en enero', HOY);
    expect(['CUN', 'PUJ', 'AUA']).toContain(r.destino);
  });

  it('"playas de Cartagena" no confunde Cartagena con el origen', () => {
    const r = interpretarConReglas('quiero conocer las playas de Cartagena saliendo de Cali', HOY);
    expect(r.origen).toBe('CLO');
    expect(r.destino).toBe('CTG');
  });

  it('solo hotel: no pide origen y usa 5 noches por defecto', () => {
    const r = interpretarConReglas('hotel en Madrid el 3 de febrero para mi pareja', HOY);
    expect(r).toMatchObject({ modulo: 'hoteles', destino: 'MAD', ida: '2027-02-03', regreso: '2027-02-08', adultos: 2 });
    expect(r.faltantes).toEqual([]);
  });

  it('presupuestos en dólares y con decimales', () => {
    expect(interpretarConReglas('Miami hasta 800 dólares', HOY).presupuesto).toEqual({ valor: 800, moneda: 'USD' });
    expect(interpretarConReglas('San Andrés presupuesto de 2,5 millones', HOY).presupuesto).toEqual({ valor: 2_500_000, moneda: 'COP' });
  });

  it('dice qué falta cuando el pedido es vago', () => {
    const r = interpretarConReglas('quiero viajar', HOY);
    expect(r.faltantes).toEqual(['origen', 'destino', 'ida']);
  });
});
