import type { Cache } from './cache.ts';
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

/**
 * Cuota diaria de SerpApi: el plan gratuito trae 250 búsquedas al mes, así que
 * se reparte por día. Las respuestas en caché no cuentan.
 */
export class CuotaDiaria {
  constructor(
    private readonly cache: Cache,
    private readonly limite: number,
    private readonly hoy: () => string = () => new Date().toISOString().slice(0, 10),
  ) {}

  private clave(): string {
    return `cuota:serpapi:${this.hoy()}`;
  }

  async disponible(): Promise<number> {
    const usadas = (await this.cache.leer<number>(this.clave())) ?? 0;
    return Math.max(0, this.limite - usadas);
  }

  /** Reserva una búsqueda; false si ya no quedan hoy. */
  async consumir(): Promise<boolean> {
    const usadas = (await this.cache.leer<number>(this.clave())) ?? 0;
    if (usadas >= this.limite) return false;
    await this.cache.guardar(this.clave(), usadas + 1, 26 * 3600);
    return true;
  }
}

export class CuotaAgotada extends Error {
  constructor() {
    super('Se agotó la cuota diaria gratuita de búsquedas en vivo. Vuelve mañana o revisa las plataformas con los enlaces.');
    this.name = 'CuotaAgotada';
  }
}
