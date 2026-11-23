import type { Consulta } from './consulta.ts';
import { enlacesVuelos } from './enlaces.ts';
import { grupoSoloEnlace } from './ranking.ts';
import type { GrupoPlataforma } from './tipos.ts';

/**
 * Plataformas sin API pública de precios para terceros. No se raspan sus
 * páginas (va contra sus condiciones de uso): se muestra la búsqueda armada
 * con los mismos datos para revisar ahí con un clic.
 */
export function gruposSoloEnlaceVuelos(c: Consulta): GrupoPlataforma[] {
  return [
    grupoSoloEnlace('despegar', enlacesVuelos.despegar(c), 'Agencia latinoamericana que cobra en pesos y permite pagar a cuotas. No ofrece API pública de precios.'),
    grupoSoloEnlace('kayak', enlacesVuelos.kayak(c), 'Metabuscador de aerolíneas y agencias. Su API es solo para socios comerciales.'),
    grupoSoloEnlace('skyscanner', enlacesVuelos.skyscanner(c), 'Metabuscador con alertas de precio. Su API es solo para socios comerciales.'),
  ];
}
