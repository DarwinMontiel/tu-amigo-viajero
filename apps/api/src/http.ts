export class ErrorFuente extends Error {
  constructor(
    readonly fuente: string,
    mensaje: string,
    readonly estado?: number,
  ) {
    super(`${fuente}: ${mensaje}`);
    this.name = 'ErrorFuente';
  }
}

/** GET con tiempo límite que devuelve JSON o lanza ErrorFuente (sin filtrar claves en el mensaje). */
export async function obtenerJSON<T>(fuente: string, url: string, opciones: { ms?: number; cabeceras?: Record<string, string> } = {}): Promise<T> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), opciones.ms ?? 12_000);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', ...opciones.cabeceras },
      signal: controlador.signal,
    });
    if (!r.ok) throw new ErrorFuente(fuente, `respondió ${r.status}`, r.status);
    return (await r.json()) as T;
  } catch (e) {
    if (e instanceof ErrorFuente) throw e;
    const abortado = e instanceof Error && e.name === 'AbortError';
    throw new ErrorFuente(fuente, abortado ? 'tardó demasiado en responder' : 'no respondió');
  } finally {
    clearTimeout(temporizador);
  }
}
