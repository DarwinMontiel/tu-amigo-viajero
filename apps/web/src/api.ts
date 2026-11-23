import {
  buscarDemo,
  consultaAParametros,
  hoyISO,
  interpretarConReglas,
  noches,
  ofertasDemo,
  opcionesDemo,
  recomendarConReglas,
  type Consulta,
  type Intencion,
  type Moneda,
  type Recomendacion,
  type RespuestaBusqueda,
  type RespuestaOfertas,
  type RespuestaOpciones,
} from '@tav/core';

/**
 * Cliente de datos. Con VITE_API_URL habla con la API del Worker (datos en
 * vivo con las claves del servidor). Sin ella, usa el modo demo dentro del
 * navegador: así GitHub Pages y el CI funcionan sin claves ni backend.
 */
const URL_API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const HAY_API = URL_API.length > 0;

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly estado?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

async function pedir<T>(ruta: string, init?: RequestInit, senal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${URL_API}${ruta}`, { ...init, ...(senal ? { signal: senal } : {}), headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ErrorApi('No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.');
  }
  if (!r.ok) {
    const cuerpo = (await r.json().catch(() => ({}))) as { error?: string };
    throw new ErrorApi(cuerpo.error ?? 'La búsqueda falló. Inténtalo de nuevo en un momento.', r.status);
  }
  return (await r.json()) as T;
}

/** En demo se simula la espera de la red para que se vean los estados de carga. */
function demora<T>(valor: () => T, ms = 650): Promise<T> {
  return new Promise((resolver) => setTimeout(() => resolver(valor()), ms));
}

export const api = {
  buscar(c: Consulta, senal?: AbortSignal): Promise<RespuestaBusqueda> {
    if (!HAY_API) return demora(() => buscarDemo(c));
    return pedir(`/api/${c.modulo}?${consultaAParametros(c)}`, undefined, senal);
  },

  ofertas(origen: string, moneda: Moneda, senal?: AbortSignal): Promise<RespuestaOfertas> {
    if (!HAY_API) return demora(() => ofertasDemo(origen, moneda, hoyISO()), 350);
    return pedir(`/api/ofertas?${new URLSearchParams({ origen, moneda })}`, undefined, senal);
  },

  opciones(token: string, c: Consulta): Promise<RespuestaOpciones> {
    if (!HAY_API || token.startsWith('demo:')) return demora(() => opcionesDemo(token, c), 450);
    const p = consultaAParametros({ ...c, modulo: 'vuelos' });
    p.set('token', token);
    return pedir(`/api/vuelos/opciones?${p}`);
  },

  interpretar(texto: string): Promise<Intencion> {
    if (!HAY_API) return demora(() => interpretarConReglas(texto), 500);
    return pedir('/api/asistente/interpretar', { method: 'POST', body: JSON.stringify({ texto }) });
  },

  recomendar(c: Consulta, respuesta: RespuestaBusqueda, presupuesto?: Intencion['presupuesto']): Promise<Recomendacion> {
    if (!HAY_API) return demora(() => recomendarConReglas(respuesta, { adultos: c.adultos, noches: noches(c), ...(presupuesto ? { presupuesto } : {}) }), 400);
    return pedir('/api/asistente/recomendar', {
      method: 'POST',
      body: JSON.stringify({ consulta: Object.fromEntries(consultaAParametros(c)), respuesta, presupuesto }),
    });
  },
};
