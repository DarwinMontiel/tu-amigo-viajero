import { consejoDeCompra, formatearPrecio, resumir, type Consulta, type Moneda, type RespuestaBusqueda } from '@tav/core';
import { useAjustes } from '../ajustes.ts';
import { useCarga } from '../useCarga.ts';

/* ---------- Tasa del día ---------- */

interface Tasas {
  /** Pesos por un dólar y por un euro. */
  copPorUsd: number;
  copPorEur: number;
  fecha: string;
}

/** ExchangeRate-API (open.er-api.com): gratis y sin clave. */
async function cargarTasas(senal: AbortSignal): Promise<Tasas> {
  const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: senal });
  const d = (await r.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
  const cop = d.rates?.COP;
  const eur = d.rates?.EUR;
  if (!cop || !eur) throw new Error('Sin tasas');
  return { copPorUsd: cop, copPorEur: cop / eur, fecha: d.time_last_update_utc ?? '' };
}

export function useTasas(): Tasas | undefined {
  const { ahorroDatos } = useAjustes();
  return useCarga<Tasas>(ahorroDatos ? null : 'tasas', cargarTasas).datos;
}

/** Equivalencia en otra moneda: en pesos muestra dólares; en dólares o euros, pesos. */
export function equivalente(valor: number, moneda: Moneda, t: Tasas): string {
  if (moneda === 'COP') return `≈ ${formatearPrecio(valor / t.copPorUsd, 'USD')}`;
  const enPesos = moneda === 'USD' ? valor * t.copPorUsd : valor * t.copPorEur;
  return `≈ ${formatearPrecio(enPesos, 'COP')}`;
}

export function TasaDelDia({ moneda }: { moneda: Moneda }) {
  const t = useTasas();
  if (!t) return null;
  const tasa = moneda === 'EUR' ? `1 EUR = ${formatearPrecio(t.copPorEur, 'COP')}` : `1 USD = ${formatearPrecio(t.copPorUsd, 'COP')}`;
  return (
    <p className="ayuda" style={{ margin: '6px 0 0' }}>
      Tasa del día: {tasa} · <a href="https://www.exchangerate-api.com">ExchangeRate-API</a>. Tu banco puede cobrar otra tasa y comisión.
    </p>
  );
}

/* ---------- ¿Conviene comprar ahora? ---------- */

const TONO = { comprar: 'consejo--comprar', esperar: 'consejo--esperar', atento: 'consejo--atento' } as const;

export function ConsejoCompra({ consulta, respuesta }: { consulta: Consulta; respuesta: RespuestaBusqueda }) {
  const c = consejoDeCompra(consulta, respuesta.perspectiva ? { perspectiva: respuesta.perspectiva } : {});
  return (
    <section className={`consejo ${TONO[c.nivel]}`} aria-labelledby="titulo-consejo">
      <p className="antetitulo" style={{ marginBottom: 2 }}>
        ¿Conviene comprar ahora?
      </p>
      <h2 id="titulo-consejo">{c.titulo}</h2>
      <ul>
        {c.razones.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- ¿Paquete o por separado? ---------- */

export function PaqueteOSeparado({ respuesta }: { respuesta: RespuestaBusqueda }) {
  const { masBarata } = resumir(respuesta);
  const piezas = masBarata?.oferta.piezas;
  if (!masBarata || !piezas) return null;
  const m = respuesta.moneda;
  return (
    <section className="panel" aria-labelledby="titulo-separado" style={{ marginBottom: 18 }}>
      <h2 id="titulo-separado" style={{ fontSize: '1.15rem' }}>
        ¿Paquete o por separado?
      </h2>
      <p style={{ marginBottom: 8 }}>
        Comprando por separado, lo más barato que encontramos suma <strong>{formatearPrecio(masBarata.oferta.precio, m)}</strong>: vuelo en{' '}
        {piezas.vuelo.plataforma} ({formatearPrecio(piezas.vuelo.precio, m)}) + alojamiento en {piezas.hotel.plataforma} (
        {formatearPrecio(piezas.hotel.precio, m)}).
      </p>
      <p className="ayuda" style={{ margin: 0 }}>
        Las agencias que venden paquetes armados (Despegar, Expedia) a veces dan descuento por combinarlos. <strong>Si su paquete cuesta menos de{' '}
        {formatearPrecio(masBarata.oferta.precio, m)}</strong> para las mismas fechas y personas, conviene el paquete; si cuesta más, compra por separado.
      </p>
    </section>
  );
}
