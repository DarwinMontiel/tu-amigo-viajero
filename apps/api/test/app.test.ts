import { buscarDemo, validarConsulta, type Intencion, type RespuestaBusqueda } from '@tav/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheMemoria } from '../src/cache.ts';
import type { Entorno } from '../src/entorno.ts';
import { recomendacionFiel, sanearIntencion } from '../src/ia.ts';
import { crearApp } from '../src/index.ts';
import { abrirToken, firmarToken } from '../src/firma.ts';
import { CuotaDiaria, LimitadorMemoria } from '../src/limites.ts';
import type { LlamarSerpApi } from '../src/proveedores/serpapi.ts';
import * as muestras from './muestras.ts';

const BUSQUEDA = 'origen=BOG&destino=CTG&ida=2026-12-10&regreso=2026-12-15&adultos=2&moneda=COP';
let ip = 0;

/** Cada prueba usa otra IP para no chocar con el limitador en memoria. */
function pedir(app: ReturnType<typeof crearApp>, ruta: string, env: Entorno = {}, init: RequestInit = {}) {
  ip += 1;
  const headers = new Headers(init.headers);
  headers.set('cf-connecting-ip', `10.0.0.${ip}`);
  return app.request(ruta, { ...init, headers }, env);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
});

describe('sin claves: modo demo', () => {
  const app = crearApp();

  it('salud informa modo demo y fuentes apagadas', async () => {
    const r = await pedir(app, '/api/salud');
    expect(await r.json()).toEqual({ ok: true, modo: 'demo', fuentes: { serpapi: false, travelpayouts: false, ia: false } });
  });

  it.each(['vuelos', 'hoteles', 'paquetes'])('/api/%s responde datos de ejemplo', async (modulo) => {
    const r = await pedir(app, `/api/${modulo}?${BUSQUEDA}`);
    expect(r.status).toBe(200);
    const cuerpo = (await r.json()) as RespuestaBusqueda;
    expect(cuerpo.modo).toBe('demo');
    expect(cuerpo.grupos.some((g) => g.estado === 'ok')).toBe(true);
  });

  it('valida la búsqueda y explica cada error en español', async () => {
    const r = await pedir(app, '/api/vuelos?origen=BOG&destino=BOG&ida=2020-01-01');
    expect(r.status).toBe(400);
    const cuerpo = (await r.json()) as { errores: Record<string, string> };
    expect(cuerpo.errores.destino).toMatch(/distinto/);
    expect(cuerpo.errores.ida).toMatch(/pasado/);
  });

  it('el asistente funciona sin IA con el intérprete por reglas', async () => {
    const r = await pedir(app, '/api/asistente/interpretar', {}, { method: 'POST', body: JSON.stringify({ texto: 'vuelo de Bogotá a Miami en enero' }) });
    const intencion = (await r.json()) as Intencion;
    expect(intencion).toMatchObject({ motor: 'reglas', origen: 'BOG', destino: 'MIA' });
  });

  it('rechaza textos vacíos o enormes', async () => {
    const r = await pedir(app, '/api/asistente/interpretar', {}, { method: 'POST', body: JSON.stringify({ texto: 'x'.repeat(600) }) });
    expect(r.status).toBe(400);
  });

  it('CORS solo para los orígenes permitidos', async () => {
    const env = { ORIGENES_PERMITIDOS: 'https://darwinmontiel.github.io' };
    const ok = await pedir(app, '/api/salud', env, { headers: { Origin: 'https://darwinmontiel.github.io' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://darwinmontiel.github.io');
    const otro = await pedir(app, '/api/salud', env, { headers: { Origin: 'https://otro.com' } });
    expect(otro.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('con claves: datos en vivo', () => {
  function serpFalso() {
    const llamar = vi.fn(async (p: Record<string, string>) => {
      if (p.engine === 'google_flights') return muestras.googleFlights;
      if (p.engine === 'google_hotels') return muestras.googleHotels;
      if (p.engine === 'airbnb') return muestras.airbnb;
      if (p.engine === 'booking') return muestras.booking;
      throw new Error(`motor inesperado ${p.engine}`);
    });
    return { llamar, cliente: llamar as unknown as LlamarSerpApi };
  }

  it('vuelos combina Google Flights y Aviasales, y usa la caché en la segunda búsqueda', async () => {
    const { llamar, cliente } = serpFalso();
    const fetchFalso = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(muestras.travelpayouts)));
    const app = crearApp({ llamarSerpApi: cliente });
    const env: Entorno = { SERPAPI_KEY: 'k', TRAVELPAYOUTS_TOKEN: 't', SERPAPI_LIMITE_DIARIO: '50' };
    const ruta = `/api/vuelos?${BUSQUEDA.replace('2026-12-15', '2026-12-16')}`;

    const primera = (await (await pedir(app, ruta, env)).json()) as RespuestaBusqueda;
    expect(primera.modo).toBe('vivo');
    expect(primera.grupos[0]?.plataforma.id).toBe('google-flights');
    expect(primera.grupos.find((g) => g.plataforma.id === 'aviasales')?.ofertas).toHaveLength(2);
    expect(String(fetchFalso.mock.calls[0]?.[0])).toContain('api.travelpayouts.com');

    await pedir(app, ruta, env);
    expect(llamar).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('hoteles reagrupa agencias de Google Hotels y suma Airbnb', async () => {
    const { cliente } = serpFalso();
    const app = crearApp({ llamarSerpApi: cliente });
    const r = (await (await pedir(app, `/api/hoteles?${BUSQUEDA.replace('2026-12-10', '2026-12-11')}`, { SERPAPI_KEY: 'k', SERPAPI_LIMITE_DIARIO: '50' })).json()) as RespuestaBusqueda;
    const ids = r.grupos.map((g) => g.plataforma.id);
    expect(ids).toEqual(expect.arrayContaining(['booking', 'expedia', 'agoda', 'airbnb']));
    expect(r.grupos.find((g) => g.plataforma.id === 'airbnb')?.fuente).toBe('Airbnb vía SerpApi');
  });

  it('cuando se agota la cuota diaria la plataforma lo explica sin romper la página', async () => {
    const { llamar, cliente } = serpFalso();
    const app = crearApp({ llamarSerpApi: cliente });
    const r = (await (await pedir(app, `/api/vuelos?${BUSQUEDA.replace('2026-12-10', '2026-12-12')}`, { SERPAPI_KEY: 'k', SERPAPI_LIMITE_DIARIO: '0.5' })).json()) as RespuestaBusqueda;
    expect(llamar).not.toHaveBeenCalled();
    const gf = r.grupos.find((g) => g.plataforma.id === 'google-flights');
    expect(gf?.estado).toBe('error');
    expect(gf?.nota).toMatch(/cuota diaria/);
  });

  it('una fuente caída no tumba a las demás', async () => {
    const app = crearApp({ llamarSerpApi: (async () => { throw new Error('caída'); }) as LlamarSerpApi });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(muestras.travelpayouts)));
    const r = (await (await pedir(app, `/api/vuelos?${BUSQUEDA.replace('2026-12-10', '2026-12-13')}`, { SERPAPI_KEY: 'k', TRAVELPAYOUTS_TOKEN: 't' })).json()) as RespuestaBusqueda;
    expect(r.grupos.find((g) => g.plataforma.id === 'aviasales')?.estado).toBe('ok');
    expect(r.grupos.find((g) => g.plataforma.id === 'google-flights')?.estado).toBe('error');
  });

  it('el asistente usa Workers AI y completa con reglas lo que el modelo deje vacío', async () => {
    const AI = { run: vi.fn(async () => ({ response: { modulo: 'paquetes', origen: 'MDE', destino: '', sugeridos: [], ida: '2026-12-05', regreso: '', adultos: 2, presupuesto: 0, moneda: 'COP', explicacion: 'Plan de playa.' } })) };
    const app = crearApp();
    const r = await pedir(app, '/api/asistente/interpretar', { AI: AI as unknown as Ai }, { method: 'POST', body: JSON.stringify({ texto: 'playa desde Medellín con mi pareja una semana' }) });
    const intencion = (await r.json()) as Intencion;
    expect(AI.run).toHaveBeenCalledOnce();
    expect(intencion).toMatchObject({ motor: 'ia', origen: 'MDE', ida: '2026-12-05', regreso: '2026-12-12', adultos: 2, explicacion: 'Plan de playa.' });
    expect(['CTG', 'SMR', 'ADZ']).toContain(intencion.destino);
  });

  it('si la IA falla, responde el intérprete por reglas', async () => {
    const AI = { run: vi.fn(async () => { throw new Error('JSON Mode couldn\'t be met'); }) };
    const r = await pedir(crearApp(), '/api/asistente/interpretar', { AI: AI as unknown as Ai }, { method: 'POST', body: JSON.stringify({ texto: 'hotel en Cartagena el 10 de diciembre' }) });
    expect(((await r.json()) as Intencion).motor).toBe('reglas');
  });
});

describe('fidelidad de la IA', () => {
  const v = validarConsulta('paquetes', { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2' }, '2026-11-23');
  if (!v.ok) throw new Error('consulta inválida');
  const resultados = buscarDemo(v.consulta);
  const precioReal = resultados.grupos[0]!.ofertas[0]!.precio;

  it('acepta recomendaciones que solo citan precios de los resultados', () => {
    const texto = `Cuesta $ ${precioReal.toLocaleString('es-CO')} en total.`;
    expect(recomendacionFiel({ titular: texto, puntos: ['Directo y barato.'] }, resultados, { adultos: 2, noches: 5 })).toBe(true);
  });

  it('rechaza recomendaciones con precios inventados', () => {
    expect(recomendacionFiel({ titular: 'Solo $ 123.456', puntos: [] }, resultados, { adultos: 2, noches: 5 })).toBe(false);
  });

  it('recomendar: si el modelo inventa un precio, se usa la recomendación por reglas', async () => {
    const AI = { run: vi.fn(async () => ({ response: { titular: 'Vuela por $ 99.999', puntos: ['Ganga.'] } })) };
    const r = await pedir(crearApp(), '/api/asistente/recomendar', { AI: AI as unknown as Ai }, {
      method: 'POST',
      body: JSON.stringify({ consulta: { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2' }, respuesta: resultados }),
    });
    const rec = (await r.json()) as { motor: string; titular: string };
    expect(rec.motor).toBe('reglas');
    expect(rec.titular).toMatch(/Lo más barato/);
  });

  it('sanearIntencion descarta códigos y fechas inválidos', () => {
    const i = sanearIntencion({ modulo: 'cruceros', origen: 'Bogotá', destino: 'ctg', ida: '2020-01-01', adultos: 40 }, 'vuelo a Cartagena desde Cali el 10 de diciembre', '2026-11-23');
    expect(i).toMatchObject({ modulo: 'vuelos', origen: 'CLO', destino: 'CTG', ida: '2026-12-10', adultos: 1 });
  });
});

describe('caché y límites', () => {
  it('la caché en memoria vence y expulsa lo más viejo', async () => {
    let ahora = 0;
    const cache = new CacheMemoria(() => ahora);
    await cache.guardar('a', 1, 10);
    expect(await cache.leer('a')).toBe(1);
    ahora = 11_000;
    expect(await cache.leer('a')).toBeUndefined();
  });

  it('el limitador corta tras el máximo y se recupera al pasar la ventana', () => {
    let ahora = 0;
    const l = new LimitadorMemoria(2, 1000, () => ahora);
    expect([l.permitir('x'), l.permitir('x'), l.permitir('x')]).toEqual([true, true, false]);
    ahora = 1500;
    expect(l.permitir('x')).toBe(true);
  });

  it('la cuota diaria se reinicia cada día', async () => {
    let dia = '2026-11-23';
    const cuota = new CuotaDiaria(1, undefined, () => dia, new Map(), new Set());
    expect(await cuota.consumir()).toBe(true);
    expect(await cuota.consumir()).toBe(false);
    dia = '2026-11-24';
    expect(await cuota.disponible()).toBe(1);
  });

  it('la cuota cuenta todas las reservas hechas en paralelo y cobra el costo real', async () => {
    const cuota = new CuotaDiaria(4, undefined, () => '2026-11-23', new Map(), new Set());
    const resultados = await Promise.all([cuota.consumir(), cuota.consumir(), cuota.consumir()]);
    expect(resultados).toEqual([true, true, true]);
    expect(await cuota.disponible()).toBe(1);
    expect(await cuota.consumir(2)).toBe(false);
    expect(await cuota.disponible()).toBe(1);
  });

  it('la cuota no depende de la caché: llenarla no la reinicia', async () => {
    const uso = new Map<string, number>();
    const cuota = new CuotaDiaria(1, undefined, () => '2026-11-23', uso, new Set());
    await cuota.consumir();
    const cache = new CacheMemoria();
    for (let i = 0; i < 400; i++) await cache.guardar(`busqueda:${i}`, i, 60);
    expect(await cuota.consumir()).toBe(false);
  });

  it('con KV, la cuota retoma el uso guardado por otra instancia', async () => {
    const guardado = new Map<string, string>([['cuota:serpapi:2026-11-23', '5']]);
    const kv = { get: async (k: string) => guardado.get(k) ?? null, put: async (k: string, v: string) => void guardado.set(k, v) } as unknown as KVNamespace;
    const cuota = new CuotaDiaria(6, kv, () => '2026-11-23', new Map(), new Set());
    expect(await cuota.consumir()).toBe(true);
    expect(await cuota.consumir()).toBe(false);
    expect(guardado.get('cuota:serpapi:2026-11-23')).toBe('6');
  });

  it('responde 429 cuando una IP busca demasiado seguido', async () => {
    const app = crearApp();
    const headers = { 'cf-connecting-ip': '192.168.1.1' };
    const estados: number[] = [];
    for (let i = 0; i < 32; i++) estados.push((await app.request(`/api/salud`, { headers }, {})).status);
    // /api/salud no está limitado; las búsquedas sí.
    expect(estados.every((s) => s === 200)).toBe(true);
    let ultimo = 0;
    for (let i = 0; i < 31; i++) ultimo = (await app.request(`/api/ofertas?origen=BOG`, { headers }, {})).status;
    expect(ultimo).toBe(429);
  });
});

describe('seguridad y casos borde de la revisión 3.1.1', () => {
  const consulta = () => {
    const v = validarConsulta('vuelos', { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2' }, '2026-11-23');
    if (!v.ok) throw new Error('consulta inválida');
    return v.consulta;
  };

  it('los tokens firmados solo abren con la misma búsqueda y sin alterarse', async () => {
    const firmado = await firmarToken('book:ABC', consulta(), 'secreto');
    expect(await abrirToken(firmado, consulta(), 'secreto')).toBe('book:ABC');
    expect(await abrirToken(firmado, { ...consulta(), adultos: 3 }, 'secreto')).toBeNull();
    expect(await abrirToken(firmado.replace('ABC', 'XYZ'), consulta(), 'secreto')).toBeNull();
    expect(await abrirToken('book:ABC', consulta(), 'secreto')).toBeNull();
  });

  it('un token inventado no gasta cuota en «¿Dónde lo compro?»', async () => {
    const llamar = vi.fn();
    const app = crearApp({ llamarSerpApi: llamar as unknown as LlamarSerpApi });
    const r = await pedir(app, `/api/vuelos/opciones?token=book:INVENTADO~xyz&${BUSQUEDA}`, { SERPAPI_KEY: 'k' });
    expect(r.status).toBe(400);
    expect(llamar).not.toHaveBeenCalled();
  });

  it('los vuelos en vivo entregan tokens firmados que la API acepta después', async () => {
    const llamar = vi.fn(async (p: Record<string, string>) => (p.booking_token || p.departure_token ? muestras.opcionesGF : muestras.googleFlights));
    const app = crearApp({ llamarSerpApi: llamar as unknown as LlamarSerpApi });
    const env: Entorno = { SERPAPI_KEY: 'k', SERPAPI_LIMITE_DIARIO: '50' };
    const busqueda = BUSQUEDA.replace('2026-12-10', '2026-12-14');
    const vuelos = (await (await pedir(app, `/api/vuelos?${busqueda}`, env)).json()) as RespuestaBusqueda;
    const token = vuelos.grupos.find((g) => g.plataforma.id === 'google-flights')?.ofertas[0]?.tokenOpciones ?? '';
    expect(token).toContain('~');
    const r = await pedir(app, `/api/vuelos/opciones?token=${encodeURIComponent(token)}&${busqueda}`, env);
    expect(r.status).toBe(200);
  });

  it('un enlace de hotel sin firma válida va a Google Hotels sin gastar cuota', async () => {
    const llamar = vi.fn();
    const app = crearApp({ llamarSerpApi: llamar as unknown as LlamarSerpApi });
    const r = await pedir(app, `/api/hoteles/ir?token=PROP&fuente=Expedia&firma=falsa&${BUSQUEDA}`, { SERPAPI_KEY: 'k' });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toMatch(/^https:\/\/www\.google\.com\/travel\/search/);
    expect(llamar).not.toHaveBeenCalled();
  });

  it('a las 8 p. m. de Bogotá la API acepta viajes que salen hoy', async () => {
    vi.setSystemTime(new Date('2026-11-24T01:00:00Z'));
    const r = await pedir(crearApp(), '/api/vuelos?origen=BOG&destino=CTG&ida=2026-11-23&adultos=1');
    expect(r.status).toBe(200);
  });

  it('recomendar resiste datos mal formados en vez de responder 500', async () => {
    const r = await pedir(crearApp(), '/api/asistente/recomendar', {}, {
      method: 'POST',
      body: JSON.stringify({
        consulta: { origen: 'BOG', destino: 'CTG', ida: '2026-12-10', adultos: '1' },
        respuesta: { modulo: 'xyz', grupos: [null, 5, { plataforma: null, ofertas: [null, { precio: 'x' }] }] },
      }),
    });
    expect(r.status).toBe(200);
  });
});

describe('en vivo solo con SerpApi (sin Travelpayouts)', () => {
  it('las ofertas del Inicio no muestran datos de ejemplo', async () => {
    const r = (await (await pedir(crearApp(), '/api/ofertas?origen=BOG', { SERPAPI_KEY: 'k' })).json()) as { modo: string; nacionales: unknown[] };
    expect(r.modo).toBe('vivo');
    expect(r.nacionales).toEqual([]);
  });
});
