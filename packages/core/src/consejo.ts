import type { Consulta } from './consulta.ts';
import { aISO, diasEntre, hoyISO, parsearISO, sumarDias } from './fechas.ts';
import { esNacional } from './lugares.ts';
import { formatearPrecio } from './moneda.ts';
import type { PerspectivaPrecio } from './tipos.ts';

/**
 * «¿Conviene comprar ahora?»: orientación general, explicada en lenguaje
 * sencillo. Combina la anticipación, las temporadas altas de Colombia y,
 * cuando hay datos en vivo, la comparación de Google Flights con el precio
 * habitual de la ruta. No promete precios futuros: dice por qué aconseja.
 */
export interface Consejo {
  nivel: 'comprar' | 'esperar' | 'atento';
  titulo: string;
  razones: string[];
}

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aISO(new Date(Date.UTC(anio, mes - 1, dia)));
}

/** Temporadas altas de viaje en Colombia: fin de año, Semana Santa y vacaciones de mitad de año. */
export function temporadaAlta(iso: string): string | undefined {
  const f = parsearISO(iso);
  if (!f) return undefined;
  const anio = f.getUTCFullYear();
  const mes = f.getUTCMonth() + 1;
  const dia = f.getUTCDate();
  if ((mes === 12 && dia >= 15) || (mes === 1 && dia <= 15)) return 'fin de año';
  if ((mes === 6 && dia >= 15) || mes === 7) return 'vacaciones de mitad de año';
  const pascua = domingoDePascua(anio);
  if (diasEntre(sumarDias(pascua, -7), iso) >= 0 && diasEntre(iso, pascua) >= 0) return 'Semana Santa';
  return undefined;
}

interface Ventana {
  desde: number;
  hasta: number;
}

/** Ventanas de compra habituales (días antes del viaje). Referencia general, no una regla fija. */
const VENTANAS: Record<'nacional' | 'internacional', Ventana> = {
  nacional: { desde: 21, hasta: 60 },
  internacional: { desde: 45, hasta: 150 },
};

export function consejoDeCompra(c: Consulta, opciones: { hoy?: string; perspectiva?: PerspectivaPrecio } = {}): Consejo {
  const hoy = opciones.hoy ?? hoyISO();
  const dias = diasEntre(hoy, c.ida);
  const temporada = temporadaAlta(c.ida) ?? (c.regreso ? temporadaAlta(c.regreso) : undefined);
  const razones: string[] = [];
  const p = opciones.perspectiva;

  if (c.modulo === 'hoteles') {
    if (temporada) razones.push(`Viajas en ${temporada}: los hoteles se llenan rápido. Reserva uno con cancelación gratis y sigue comparando.`);
    else razones.push('Los hoteles varían menos que los vuelos. Si encuentras uno con cancelación gratis, resérvalo y sigue mirando.');
    if (dias <= 7) razones.push('Faltan pocos días: quedan menos opciones baratas, no esperes mucho.');
    return { nivel: temporada || dias <= 7 ? 'comprar' : 'atento', titulo: temporada ? 'Reserva pronto, con cancelación gratis' : 'Sin afán, pero no lo dejes para el final', razones };
  }

  const tipo = esNacional(c.origen) && esNacional(c.destino) ? 'nacional' : 'internacional';
  const v = VENTANAS[tipo];
  let nivel: Consejo['nivel'];
  let titulo: string;

  if (p?.nivel === 'bajo') {
    nivel = 'comprar';
    titulo = 'Buen momento: el precio está por debajo de lo habitual';
  } else if (p?.nivel === 'alto') {
    nivel = 'atento';
    titulo = 'Ojo: el precio está más alto de lo habitual';
  } else if (dias < 14) {
    nivel = 'comprar';
    titulo = 'Compra pronto: faltan menos de dos semanas';
  } else if (dias < v.desde) {
    nivel = 'comprar';
    titulo = 'Conviene comprar ya';
  } else if (dias <= v.hasta) {
    nivel = 'comprar';
    titulo = 'Estás en buena época para comprar';
  } else {
    nivel = 'esperar';
    titulo = 'Puedes esperar y vigilar el precio';
  }

  if (p?.rangoTipico) {
    razones.push(
      `Para el vuelo de esta ruta, lo normal es entre ${formatearPrecio(p.rangoTipico[0], c.moneda)} y ${formatearPrecio(p.rangoTipico[1], c.moneda)} (${p.fuente}).`,
    );
  }
  razones.push(
    tipo === 'nacional'
      ? `En vuelos nacionales los mejores precios suelen aparecer entre ${Math.round(v.desde / 7)} y ${Math.round(v.hasta / 7)} semanas antes. Faltan ${dias} días.`
      : `En vuelos internacionales los mejores precios suelen aparecer entre ${Math.round(v.desde / 7)} semanas y ${Math.round(v.hasta / 30)} meses antes. Faltan ${dias} días.`,
  );
  if (temporada) razones.push(`Viajas en ${temporada}, temporada alta: los cupos baratos se acaban primero.`);
  if (nivel === 'esperar') razones.push('Vuelve a buscar en unas semanas: guarda o comparte este enlace, la búsqueda queda en la dirección.');
  razones.push('Es una orientación general, no una garantía: los precios cambian a diario.');
  return { nivel, titulo, razones };
}
