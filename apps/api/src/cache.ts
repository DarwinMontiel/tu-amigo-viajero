import type { Entorno } from './entorno.ts';

/**
 * Caché de dos niveles: memoria del isolate (gratis e instantánea) y, si hay
 * un namespace KV configurado, KV para compartir entre instancias. Así cada
 * búsqueda repetida no gasta la cuota gratuita de las fuentes.
 */
export interface Cache {
  leer<T>(clave: string): Promise<T | undefined>;
  guardar(clave: string, valor: unknown, segundos: number): Promise<void>;
}

interface Entrada {
  valor: unknown;
  vence: number;
}

const MAX_ENTRADAS = 300;

export class CacheMemoria implements Cache {
  private readonly datos = new Map<string, Entrada>();

  constructor(private readonly ahora: () => number = Date.now) {}

  async leer<T>(clave: string): Promise<T | undefined> {
    const e = this.datos.get(clave);
    if (!e) return undefined;
    if (e.vence <= this.ahora()) {
      this.datos.delete(clave);
      return undefined;
    }
    // LRU: lo leído pasa al final.
    this.datos.delete(clave);
    this.datos.set(clave, e);
    return e.valor as T;
  }

  async guardar(clave: string, valor: unknown, segundos: number): Promise<void> {
    if (this.datos.size >= MAX_ENTRADAS) {
      const masVieja = this.datos.keys().next().value;
      if (masVieja !== undefined) this.datos.delete(masVieja);
    }
    this.datos.set(clave, { valor, vence: this.ahora() + segundos * 1000 });
  }
}

class CacheKV implements Cache {
  constructor(
    private readonly kv: KVNamespace,
    private readonly memoria: Cache,
  ) {}

  async leer<T>(clave: string): Promise<T | undefined> {
    const enMemoria = await this.memoria.leer<T>(clave);
    if (enMemoria !== undefined) return enMemoria;
    const valor = await this.kv.get<T>(clave, 'json');
    return valor ?? undefined;
  }

  async guardar(clave: string, valor: unknown, segundos: number): Promise<void> {
    await this.memoria.guardar(clave, valor, segundos);
    // KV exige un TTL mínimo de 60 s.
    await this.kv.put(clave, JSON.stringify(valor), { expirationTtl: Math.max(60, segundos) });
  }
}

const memoriaGlobal = new CacheMemoria();

export function crearCache(env: Entorno): Cache {
  return env.CACHE ? new CacheKV(env.CACHE, memoriaGlobal) : memoriaGlobal;
}

/** Devuelve lo guardado o ejecuta `producir` y guarda el resultado. */
export async function conCache<T>(cache: Cache, clave: string, segundos: number, producir: () => Promise<T>): Promise<{ valor: T; enCache: boolean }> {
  const guardado = await cache.leer<T>(clave);
  if (guardado !== undefined) return { valor: guardado, enCache: true };
  const valor = await producir();
  await cache.guardar(clave, valor, segundos);
  return { valor, enCache: false };
}
