import type { Entorno } from './entorno.ts';

/**
 * Ventana deslizante en memoria por clave (IP + ruta). Es el respaldo cuando
 * no hay binding de Rate Limiting: protege igual dentro de cada isolate.
 */
export class LimitadorMemoria {
  private readonly golpes = new Map<string, number[]>();

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = Date.now,
  ) {}

  permitir(clave: string): boolean {
    const t = this.ahora();
    const recientes = (this.golpes.get(clave) ?? []).filter((x) => t - x < this.ventanaMs);
    if (recientes.length >= this.maximo) {
      this.golpes.set(clave, recientes);
      return false;
    }
    recientes.push(t);
    this.golpes.set(clave, recientes);
    if (this.golpes.size > 5000) this.golpes.clear();
    return true;
  }
}

const limitadorBusquedas = new LimitadorMemoria(30, 60_000);
const limitadorIA = new LimitadorMemoria(10, 60_000);

export async function permitirPeticion(env: Entorno, ip: string, tipo: 'busqueda' | 'ia'): Promise<boolean> {
  const clave = `${tipo}:${ip}`;
  if (env.LIMITADOR) {
    const { success } = await env.LIMITADOR.limit({ key: clave });
    if (!success) return false;
  }
  return (tipo === 'ia' ? limitadorIA : limitadorBusquedas).permitir(clave);
}

/** Uso de la cuota por día, por isolate. Separado de la caché: nada lo desaloja. */
const usoGlobal = new Map<string, number>();
const sincronizadas = new Set<string>();

/**
 * Cuota diaria de SerpApi: el plan gratuito trae 250 búsquedas al mes, así que
 * se reparte por día. Las respuestas en caché no cuentan.
 *
 * La reserva es atómica dentro del isolate: entre leer y anotar el uso no hay
 * ningún `await`, así las consultas en paralelo de un paquete (vuelos, hoteles
 * y Airbnb) se cuentan todas. Con KV, el uso se comparte entre instancias
 * (KV es eventual: puede haber un pequeño exceso si dos instancias reservan
 * en el mismo segundo; por eso el tope por defecto deja margen).
 */
export class CuotaDiaria {
  constructor(
    private readonly limite: number,
    private readonly kv?: KVNamespace,
    private readonly hoy: () => string = () => new Date().toISOString().slice(0, 10),
    private readonly uso: Map<string, number> = usoGlobal,
    private readonly sincronizado: Set<string> = sincronizadas,
  ) {}

  private clave(): string {
    return `cuota:serpapi:${this.hoy()}`;
  }

  /** Trae el uso guardado en KV la primera vez que se consulta ese día en este isolate. */
  private async sincronizar(clave: string): Promise<void> {
    if (!this.kv || this.sincronizado.has(clave)) return;
    const remoto = Number(await this.kv.get(clave).catch(() => null)) || 0;
    this.uso.set(clave, Math.max(this.uso.get(clave) ?? 0, remoto));
    this.sincronizado.add(clave);
  }

  async disponible(): Promise<number> {
    const clave = this.clave();
    await this.sincronizar(clave);
    return Math.max(0, this.limite - (this.uso.get(clave) ?? 0));
  }

  /** Reserva `costo` búsquedas; false (sin reservar nada) si no alcanzan hoy. */
  async consumir(costo = 1): Promise<boolean> {
    const clave = this.clave();
    await this.sincronizar(clave);
    // Sección crítica sin await: leer y anotar ocurren en el mismo turno del event loop.
    const usadas = this.uso.get(clave) ?? 0;
    if (usadas + costo > this.limite) return false;
    this.uso.set(clave, usadas + costo);
    if (this.uso.size > 10) {
      for (const k of this.uso.keys()) if (k !== clave) this.uso.delete(k);
    }
    if (this.kv) await this.kv.put(clave, String(usadas + costo), { expirationTtl: 26 * 3600 }).catch(() => undefined);
    return true;
  }
}

export class CuotaAgotada extends Error {
  constructor() {
    super('Se agotó la cuota diaria gratuita de búsquedas en vivo. Vuelve mañana o revisa las plataformas con los enlaces.');
    this.name = 'CuotaAgotada';
  }
}
