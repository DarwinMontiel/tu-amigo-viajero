import { formatearPrecio } from './moneda.ts';
import { resumir } from './ranking.ts';
import type { Moneda, Oferta, RespuestaBusqueda } from './tipos.ts';

export interface Recomendacion {
  titular: string;
  puntos: string[];
  motor: 'ia' | 'reglas';
}

export interface ContextoRecomendacion {
  presupuesto?: { valor: number; moneda: Moneda };
  adultos: number;
  noches: number;
}

/**
 * Resumen compacto de los resultados para el modelo de IA: solo lo necesario
 * (plataforma, título, precio) para que el prompt sea corto y no invente datos.
 */
export function resultadosParaIA(r: RespuestaBusqueda, maxPorGrupo = 3): string {
  const lineas = r.grupos
    .filter((g) => g.estado === 'ok')
    .map((g) => {
      const ofertas = g.ofertas
        .slice(0, maxPorGrupo)
        .map((o) => `  - ${o.titulo} (${o.detalle}): ${formatearPrecio(o.precio, r.moneda)}${o.calificacion ? `, calificación ${o.calificacion}` : ''}`)
        .join('\n');
      return `${g.plataforma.nombre}:\n${ofertas}`;
    });
  return lineas.join('\n');
}

/** Mejor relación calidad/precio: la mejor calificada entre las que cuestan hasta 25 % más que la más barata. */
function mejorValorada(r: RespuestaBusqueda): { plataforma: string; oferta: Oferta } | undefined {
  const todas = r.grupos.flatMap((g) => g.ofertas.map((oferta) => ({ plataforma: g.plataforma.nombre, oferta })));
  const minimo = Math.min(...todas.map((x) => x.oferta.precio));
  return todas
    .filter((x) => x.oferta.calificacion !== undefined && x.oferta.precio <= minimo * 1.25)
    .sort((a, b) => (b.oferta.calificacion ?? 0) - (a.oferta.calificacion ?? 0))[0];
}

/** Recomendación determinista: la usa el modo demo y es el respaldo si la IA no responde. */
export function recomendarConReglas(r: RespuestaBusqueda, ctx: ContextoRecomendacion): Recomendacion {
  const { masBarata, ahorro, plataformasConPrecio } = resumir(r);
  const precio = (v: number): string => formatearPrecio(v, r.moneda);

  if (!masBarata) {
    return {
      titular: 'No hay precios para comparar en esta búsqueda.',
      puntos: ['Prueba con otras fechas o abre la búsqueda directamente en las plataformas de la lista.'],
      motor: 'reglas',
    };
  }

  const puntos: string[] = [];
  const titular = `Lo más barato: ${masBarata.oferta.titulo} en ${masBarata.plataforma} por ${precio(masBarata.oferta.precio)}.`;

  if (plataformasConPrecio > 1 && ahorro > 0) {
    puntos.push(`Comparar ${plataformasConPrecio} plataformas te ahorra hasta ${precio(ahorro)} frente a la opción más cara entre las mejores de cada una.`);
  }
  if (ctx.adultos > 1) {
    puntos.push(`Por persona sale en ${precio(masBarata.oferta.precio / ctx.adultos)}.`);
  }
  if (ctx.noches > 0 && masBarata.oferta.precioPorNoche) {
    puntos.push(`Equivale a ${precio(masBarata.oferta.precioPorNoche)} por noche.`);
  }
  const valorada = mejorValorada(r);
  if (valorada && valorada.oferta.id !== masBarata.oferta.id) {
    puntos.push(
      `Por poco más, ${valorada.oferta.titulo} (${valorada.plataforma}) tiene calificación ${valorada.oferta.calificacion} por ${precio(valorada.oferta.precio)}.`,
    );
  }
  if (ctx.presupuesto && ctx.presupuesto.moneda === r.moneda) {
    const diferencia = ctx.presupuesto.valor - masBarata.oferta.precio;
    puntos.push(
      diferencia >= 0
        ? `Cabe en tu presupuesto y te sobran ${precio(diferencia)}.`
        : `Se pasa de tu presupuesto por ${precio(-diferencia)}: prueba con otras fechas o menos noches.`,
    );
  }
  puntos.push('Los precios cambian rápido: confirma el valor final en la página antes de pagar.');
  return { titular, puntos, motor: 'reglas' };
}
