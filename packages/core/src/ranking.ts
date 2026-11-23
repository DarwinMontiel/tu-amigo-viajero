import type { Consulta } from './consulta.ts';
import { enlacesPaquetes } from './enlaces.ts';
import { infoPlataforma } from './plataformas.ts';
import type { EstadoGrupo, GrupoPlataforma, Oferta, RespuestaBusqueda } from './tipos.ts';

export const OFERTAS_POR_PLATAFORMA = 3;

/** Las N ofertas más baratas, de menor a mayor, sin repetidas ni precios inválidos. */
export function masBaratas(ofertas: readonly Oferta[], n = OFERTAS_POR_PLATAFORMA): Oferta[] {
  const vistas = new Set<string>();
  return ofertas
    .filter((o) => Number.isFinite(o.precio) && o.precio > 0)
    .slice()
    .sort((a, b) => a.precio - b.precio || a.titulo.localeCompare(b.titulo))
    .filter((o) => {
      const clave = `${o.titulo}|${o.detalle}|${o.precio}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    })
    .slice(0, n);
}

const PESO_ESTADO: Record<EstadoGrupo, number> = { ok: 0, 'sin-resultados': 1, error: 2, 'solo-enlace': 3 };

/** Primero las plataformas con precio (la más barata arriba), luego las demás. */
export function ordenarGrupos(grupos: readonly GrupoPlataforma[]): GrupoPlataforma[] {
  return grupos.slice().sort((a, b) => {
    const porEstado = PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado];
    if (porEstado !== 0) return porEstado;
    const pa = a.ofertas[0]?.precio ?? Number.POSITIVE_INFINITY;
    const pb = b.ofertas[0]?.precio ?? Number.POSITIVE_INFINITY;
    return pa - pb || a.plataforma.nombre.localeCompare(b.plataforma.nombre);
  });
}

/** Grupo listo para responder: recorta a 3, ordena y fija el estado según haya precios. */
export function grupo(
  plataforma: string,
  ofertas: readonly Oferta[],
  extra: Partial<Omit<GrupoPlataforma, 'plataforma' | 'ofertas'>> = {},
): GrupoPlataforma {
  const info = infoPlataforma(plataforma);
  const top = masBaratas(ofertas);
  return {
    plataforma: { id: info.id, nombre: info.nombre },
    ofertas: top,
    estado: extra.estado ?? (top.length > 0 ? 'ok' : 'sin-resultados'),
    ...(extra.enlaceBusqueda ? { enlaceBusqueda: extra.enlaceBusqueda } : {}),
    ...(extra.fuente ? { fuente: extra.fuente } : {}),
    ...(extra.nota ? { nota: extra.nota } : {}),
  };
}

/** Grupo de una plataforma sin API pública: solo el enlace con la búsqueda armada. */
export function grupoSoloEnlace(plataforma: string, enlaceBusqueda: string, nota: string): GrupoPlataforma {
  const info = infoPlataforma(plataforma);
  return { plataforma: { id: info.id, nombre: info.nombre }, estado: 'solo-enlace', ofertas: [], enlaceBusqueda, nota };
}

export interface Resumen {
  masBarata?: { plataforma: string; oferta: Oferta };
  /** Diferencia entre la mejor oferta de la plataforma más cara y la más barata de todas. */
  ahorro: number;
  plataformasConPrecio: number;
}

export function resumir(r: Pick<RespuestaBusqueda, 'grupos'>): Resumen {
  const conPrecio = r.grupos.filter((g) => g.estado === 'ok' && g.ofertas.length > 0);
  const primeras = conPrecio
    .map((g) => ({ plataforma: g.plataforma.nombre, oferta: g.ofertas[0] }))
    .filter((x): x is { plataforma: string; oferta: Oferta } => x.oferta !== undefined)
    .sort((a, b) => a.oferta.precio - b.oferta.precio);
  const masBarata = primeras[0];
  const masCara = primeras[primeras.length - 1];
  return {
    ...(masBarata ? { masBarata } : {}),
    ahorro: masBarata && masCara ? masCara.oferta.precio - masBarata.oferta.precio : 0,
    plataformasConPrecio: conPrecio.length,
  };
}

/**
 * Paquetes vuelo + hotel: por cada plataforma de alojamiento con precios, sus
 * 3 hoteles más baratos sumados al vuelo más barato encontrado en cualquier
 * plataforma. Al final, las agencias que venden paquetes armados (solo enlace).
 */
export function armarPaquetes(
  consulta: Consulta,
  vuelos: Pick<RespuestaBusqueda, 'grupos'>,
  hoteles: Pick<RespuestaBusqueda, 'grupos'>,
): Pick<RespuestaBusqueda, 'grupos' | 'avisos'> {
  const avisos: string[] = [];
  const mejorVuelo = resumir(vuelos).masBarata;
  const grupos: GrupoPlataforma[] = [];

  if (!mejorVuelo) {
    avisos.push('No encontramos precios de vuelos para esta ruta: los paquetes se muestran solo como enlaces.');
  } else {
    for (const g of hoteles.grupos) {
      if (g.estado !== 'ok') continue;
      const ofertas: Oferta[] = g.ofertas.map((h) => ({
        id: `paq-${g.plataforma.id}-${h.id}`,
        titulo: h.titulo,
        detalle: h.detalle,
        precio: mejorVuelo.oferta.precio + h.precio,
        enlace: h.enlace,
        ...(h.calificacion !== undefined ? { calificacion: h.calificacion } : {}),
        ...(h.imagen ? { imagen: h.imagen } : {}),
        piezas: {
          vuelo: {
            plataforma: mejorVuelo.plataforma,
            titulo: mejorVuelo.oferta.titulo,
            precio: mejorVuelo.oferta.precio,
            enlace: mejorVuelo.oferta.enlace,
          },
          hotel: { plataforma: g.plataforma.nombre, titulo: h.titulo, precio: h.precio, enlace: h.enlace },
        },
      }));
      const base = grupo(g.plataforma.id, ofertas, {
        fuente: `Vuelo más barato (${mejorVuelo.plataforma}) + hotel en ${g.plataforma.nombre}`,
      });
      grupos.push({ ...base, plataforma: { id: `paquete-${g.plataforma.id}`, nombre: `Vuelo + ${g.plataforma.nombre}` } });
    }
  }

  grupos.push(
    {
      plataforma: { id: 'despegar-paquetes', nombre: 'Despegar: paquetes' },
      estado: 'solo-enlace',
      ofertas: [],
      enlaceBusqueda: enlacesPaquetes.despegar(),
      nota: 'Vende vuelo + hotel con descuento por combinarlos. No ofrece API pública de precios: abre su buscador de paquetes.',
    },
    {
      plataforma: { id: 'expedia-paquetes', nombre: 'Expedia: vuelo + hotel' },
      estado: 'solo-enlace',
      ofertas: [],
      enlaceBusqueda: enlacesPaquetes.expedia(),
      nota: 'Paquetes internacionales con precio combinado. Sin API pública de precios.',
    },
  );

  if (consulta.adultos > 1) avisos.push(`Los totales incluyen a los ${consulta.adultos} adultos y todas las noches.`);
  return { grupos: ordenarGrupos(grupos), avisos };
}
