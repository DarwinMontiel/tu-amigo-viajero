import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import {
  MONEDAS,
  hoyMasTemprano,
  noches,
  validarConsulta,
  type Consulta,
  type ContextoRecomendacion,
  type GrupoPlataforma,
  type Modulo,
  type Moneda,
  type RespuestaBusqueda,
} from '@tav/core';
import { crearCache } from './cache.ts';
import { fuentesDisponibles, type Entorno } from './entorno.ts';
import { interpretar, recomendar } from './ia.ts';
import { permitirPeticion } from './limites.ts';
import * as servicio from './servicio.ts';

type Ctx = Context<{ Bindings: Entorno }>;

const MODULOS: readonly Modulo[] = ['vuelos', 'hoteles', 'paquetes'];

export function crearApp(opciones: Partial<Pick<servicio.Contexto, 'llamarSerpApi'>> = {}) {
  const app = new Hono<{ Bindings: Entorno }>();

  app.use('*', secureHeaders());
  app.use(
    '/api/*',
    cors({
      origin: (origen, c) => {
        const lista: string = (c.env as Entorno | undefined)?.ORIGENES_PERMITIDOS ?? '';
        const permitidos = lista.split(',').map((o) => o.trim()).filter(Boolean);
        return permitidos.length === 0 || permitidos.includes(origen) ? origen : null;
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      maxAge: 86_400,
    }),
  );

  const ip = (c: Ctx): string => c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local';

  const contexto = (c: Ctx): servicio.Contexto => ({
    env: c.env,
    cache: crearCache(c.env),
    origenApi: new URL(c.req.url).origin,
    ...opciones,
  });

  const limitar = (tipo: 'busqueda' | 'ia') => async (c: Ctx, siguiente: () => Promise<void>) => {
    if (!(await permitirPeticion(c.env, ip(c), tipo))) {
      return c.json({ error: 'Demasiadas búsquedas seguidas. Espera un minuto e inténtalo de nuevo.' }, 429);
    }
    await siguiente();
    return undefined;
  };

  app.get('/', (c) => c.json({ nombre: 'API de Tu Amigo Viajero', documentacion: 'https://github.com/DarwinMontiel/tu-amigo-viajero' }));

  app.get('/api/salud', (c) => {
    const f = fuentesDisponibles(c.env);
    return c.json({ ok: true, modo: f.serpapi || f.travelpayouts ? 'vivo' : 'demo', fuentes: f });
  });

  // El Worker corre en UTC: se valida con el «hoy» más atrasado del planeta para no rechazar viajes de hoy.
  const leerConsulta = (c: Ctx, modulo: Modulo) => validarConsulta(modulo, new URL(c.req.url).searchParams, hoyMasTemprano());

  for (const modulo of ['vuelos', 'hoteles', 'paquetes'] as const) {
    app.get(`/api/${modulo}`, limitar('busqueda'), async (c) => {
      const v = leerConsulta(c, modulo);
      if (!v.ok) return c.json({ error: 'La búsqueda tiene datos inválidos.', errores: v.errores }, 400);
      const r = await servicio.buscar(v.consulta, contexto(c));
      c.header('Cache-Control', r.modo === 'demo' ? 'public, max-age=3600' : 'private, max-age=600');
      return c.json(r);
    });
  }

  app.get('/api/vuelos/opciones', limitar('busqueda'), async (c) => {
    const token = c.req.query('token') ?? '';
    const v = leerConsulta(c, 'vuelos');
    if (!token || token.length > 4000 || !v.ok) return c.json({ error: 'Faltan el vuelo o los datos de la búsqueda.' }, 400);
    try {
      return c.json(await servicio.opciones(token, v.consulta, contexto(c)));
    } catch (e) {
      if (e instanceof servicio.TokenInvalido) return c.json({ error: e.message }, 400);
      throw e;
    }
  });

  app.get('/api/hoteles/ir', limitar('busqueda'), async (c) => {
    const token = c.req.query('token') ?? '';
    const fuente = c.req.query('fuente') ?? '';
    const firma = c.req.query('firma') ?? '';
    const v = leerConsulta(c, 'hoteles');
    if (!token || !fuente || token.length > 4000 || fuente.length > 60 || firma.length > 64 || !v.ok) return c.json({ error: 'Enlace incompleto.' }, 400);
    const destino = await servicio.enlaceHotel(token, fuente, firma, v.consulta, contexto(c));
    // Solo se redirige a URLs https que vienen de la fuente o al respaldo de Google.
    return destino.startsWith('https://') ? c.redirect(destino, 302) : c.json({ error: 'Enlace no disponible.' }, 502);
  });

  app.get('/api/ofertas', limitar('busqueda'), async (c) => {
    const origen = (c.req.query('origen') ?? 'BOG').toUpperCase();
    const moneda = (c.req.query('moneda') ?? 'COP').toUpperCase() as Moneda;
    if (!/^[A-Z]{3}$/.test(origen) || !MONEDAS.includes(moneda)) return c.json({ error: 'Origen o moneda inválidos.' }, 400);
    return c.json(await servicio.ofertas(origen, moneda, contexto(c)));
  });

  app.post('/api/asistente/interpretar', limitar('ia'), async (c) => {
    const cuerpo = await c.req.json<{ texto?: unknown }>().catch(() => ({ texto: undefined }));
    const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : '';
    if (texto.length < 3 || texto.length > 500) return c.json({ error: 'Escribe tu viaje en una o dos frases (máximo 500 caracteres).' }, 400);
    return c.json(await interpretar(texto, c.env));
  });

  app.post('/api/asistente/recomendar', limitar('ia'), async (c) => {
    const cuerpo = await c.req.json<{ consulta?: Record<string, string>; respuesta?: RespuestaBusqueda; presupuesto?: unknown }>().catch(() => null);
    const modulo: Modulo = MODULOS.includes(cuerpo?.respuesta?.modulo as Modulo) ? (cuerpo!.respuesta!.modulo as Modulo) : 'vuelos';
    const v = cuerpo?.consulta && typeof cuerpo.consulta === 'object' && cuerpo.respuesta ? validarConsulta(modulo, cuerpo.consulta, hoyMasTemprano()) : null;
    if (!cuerpo?.respuesta || !v?.ok) return c.json({ error: 'Faltan los resultados para recomendar.' }, 400);
    const respuesta = sanearRespuesta(cuerpo.respuesta, v.consulta);
    const p = cuerpo.presupuesto as { valor?: unknown; moneda?: unknown } | undefined;
    const ctx: ContextoRecomendacion = {
      adultos: v.consulta.adultos,
      noches: noches(v.consulta),
      ...(p && Number(p.valor) > 0 && MONEDAS.includes(p.moneda as Moneda) ? { presupuesto: { valor: Number(p.valor), moneda: p.moneda as Moneda } } : {}),
    };
    return c.json(await recomendar(respuesta, ctx, c.env));
  });

  app.notFound((c) => c.json({ error: 'Ruta no encontrada.' }, 404));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Algo falló de nuestro lado. Inténtalo de nuevo en un momento.' }, 500);
  });

  return app;
}

/**
 * Los resultados para recomendar llegan del navegador: se recortan y se
 * limpian para que el prompt sea pequeño y no lleve texto arbitrario largo.
 */
function sanearRespuesta(r: RespuestaBusqueda, consulta: Consulta): RespuestaBusqueda {
  const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
  const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
  const grupos: GrupoPlataforma[] = (Array.isArray(r.grupos) ? r.grupos : []).filter(esObjeto).slice(0, 20).map((g) => ({
    plataforma: { id: texto(g.plataforma?.id, 40), nombre: texto(g.plataforma?.nombre, 60) },
    estado: g.estado === 'ok' ? 'ok' : 'sin-resultados',
    ofertas: (Array.isArray(g.ofertas) ? g.ofertas : []).filter(esObjeto).slice(0, 3).flatMap((o) => {
      const precio = Number(o.precio);
      if (!Number.isFinite(precio) || precio <= 0) return [];
      const porNoche = Number(o.precioPorNoche);
      const calificacion = Number(o.calificacion);
      return [
        {
          id: texto(o.id, 60),
          titulo: texto(o.titulo, 120),
          detalle: texto(o.detalle, 160),
          precio: Math.round(precio),
          ...(porNoche > 0 ? { precioPorNoche: Math.round(porNoche) } : {}),
          ...(calificacion > 0 && calificacion <= 10 ? { calificacion } : {}),
          enlace: { metodo: 'GET' as const, url: '' },
        },
      ];
    }),
  }));
  return { modulo: consulta.modulo, modo: r.modo === 'vivo' ? 'vivo' : 'demo', moneda: consulta.moneda, consultadoEn: '', grupos, avisos: [] };
}

export default crearApp();
