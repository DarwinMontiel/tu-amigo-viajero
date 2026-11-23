import {
  formatearPrecio,
  infoPlataforma,
  noches,
  resumir,
  type Consulta,
  type Enlace,
  type GrupoPlataforma,
  type Moneda,
  type Oferta,
  type OpcionCompra,
  type RespuestaBusqueda,
} from '@tav/core';
import { useState, type ReactNode } from 'react';
import { api, ErrorApi } from '../api.ts';
import { equivalente, useTasas } from './Ayudas.tsx';
import { IconoAvion, IconoCama, IconoEstrella, IconoExterno } from './iconos.tsx';

/** Abre la oferta en la plataforma. Google entrega algunos enlaces como formulario POST. */
export function EnlaceOferta({ enlace, children, clase }: { enlace: Enlace; children: ReactNode; clase?: string }) {
  if (enlace.metodo === 'POST') {
    return (
      <form method="post" action={enlace.url} target="_blank" style={{ display: 'inline' }}>
        {Object.entries(enlace.campos).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button type="submit" className={clase ?? 'boton boton--texto'}>
          {children} <IconoExterno />
        </button>
      </form>
    );
  }
  return (
    <a href={enlace.url} target="_blank" rel="noopener noreferrer" className={clase}>
      {children} <IconoExterno />
      <span className="solo-lectores"> (abre en otra pestaña)</span>
    </a>
  );
}

function Vendedores({ oferta, consulta, moneda }: { oferta: Oferta; consulta: Consulta; moneda: Moneda }) {
  const [estado, setEstado] = useState<'cerrado' | 'cargando' | 'listo' | 'error'>('cerrado');
  const [opciones, setOpciones] = useState<OpcionCompra[]>([]);
  const [mensaje, setMensaje] = useState('');
  const idLista = `vendedores-${oferta.id}`;

  async function abrir() {
    if (estado === 'listo') {
      setEstado('cerrado');
      return;
    }
    if (!oferta.tokenOpciones) return;
    setEstado('cargando');
    try {
      const r = await api.opciones(oferta.tokenOpciones, consulta);
      setOpciones(r.opciones);
      setEstado('listo');
    } catch (e) {
      setMensaje(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los vendedores.');
      setEstado('error');
    }
  }

  return (
    <>
      <button type="button" className="boton boton--texto" aria-expanded={estado === 'listo'} aria-controls={idLista} onClick={abrir} disabled={estado === 'cargando'}>
        {estado === 'cargando' ? 'Buscando vendedores…' : estado === 'listo' ? 'Ocultar vendedores' : '¿Dónde lo compro más barato?'}
      </button>
      <div id={idLista} aria-live="polite" style={{ gridColumn: '1 / -1' }}>
        {estado === 'listo' ? (
          opciones.length === 0 ? (
            <p className="ayuda">Google no mostró vendedores para este vuelo. Ábrelo en Google Flights.</p>
          ) : (
            <ul className="vendedores" aria-label="Vendedores de este vuelo, del más barato al más caro">
              {opciones.map((o, i) => (
                <li key={`${o.vendedor}-${i}`}>
                  <span>
                    {o.vendedor}
                    {o.esAerolinea ? ' · aerolínea' : ''}
                  </span>
                  <span className="fila">
                    <strong>{formatearPrecio(o.precio, moneda)}</strong>
                    <EnlaceOferta enlace={o.enlace}>Ir</EnlaceOferta>
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {estado === 'error' ? <p className="error-campo">{mensaje}</p> : null}
      </div>
    </>
  );
}

function FilaOferta({ oferta, puesto, grupo, consulta, moneda }: { oferta: Oferta; puesto: number; grupo: GrupoPlataforma; consulta: Consulta; moneda: Moneda }) {
  const n = noches(consulta);
  return (
    <li className="oferta">
      <span className="oferta__puesto" aria-label={`Puesto ${puesto}`}>
        {puesto}
      </span>
      <p className="oferta__titulo">{oferta.titulo}</p>
      <div className="oferta__precio">
        <strong>{formatearPrecio(oferta.precio, moneda)}</strong>
        <small>
          {oferta.precioPorNoche && n > 0 ? `${formatearPrecio(oferta.precioPorNoche, moneda)} / noche` : consulta.adultos > 1 ? `total ${consulta.adultos} adultos` : 'total'}
        </small>
      </div>
      <p className="oferta__detalle">{oferta.detalle}</p>
      {oferta.piezas ? (
        <div className="piezas" role="group" aria-label="Desglose del paquete">
          <div>
            <IconoAvion />
            <span>{oferta.piezas.vuelo.titulo} · {oferta.piezas.vuelo.plataforma}</span>
            <strong>{formatearPrecio(oferta.piezas.vuelo.precio, moneda)}</strong>
          </div>
          <div>
            <IconoCama />
            <span>{oferta.piezas.hotel.titulo} · {oferta.piezas.hotel.plataforma}</span>
            <strong>{formatearPrecio(oferta.piezas.hotel.precio, moneda)}</strong>
          </div>
        </div>
      ) : null}
      {oferta.incluyeImpuestos !== undefined || oferta.avisoEquipaje ? (
        <p className="oferta__avisos">
          {oferta.incluyeImpuestos === true ? <span className="etiqueta-ok">Impuestos incluidos</span> : null}
          {oferta.incluyeImpuestos === false ? <span className="etiqueta-ojo">+ impuestos al pagar</span> : null}
          {oferta.avisoEquipaje ? <span className="etiqueta-ojo">{oferta.avisoEquipaje}</span> : null}
        </p>
      ) : null}
      <div className="oferta__acciones">
        {oferta.calificacion ? (
          <span className="estrellas">
            <IconoEstrella /> {oferta.calificacion.toLocaleString('es-CO', { maximumFractionDigits: 1 })}/10
          </span>
        ) : null}
        {oferta.piezas ? (
          <>
            <EnlaceOferta enlace={oferta.piezas.vuelo.enlace}>Ver vuelo</EnlaceOferta>
            <EnlaceOferta enlace={oferta.piezas.hotel.enlace}>Ver hotel</EnlaceOferta>
          </>
        ) : (
          <EnlaceOferta enlace={oferta.enlace}>Ver en {grupo.plataforma.nombre}</EnlaceOferta>
        )}
        {oferta.tokenOpciones ? <Vendedores oferta={oferta} consulta={consulta} moneda={moneda} /> : null}
      </div>
    </li>
  );
}

const TEXTO_ESTADO: Record<string, string> = {
  'sin-resultados': 'Esta plataforma no tiene precios para esa búsqueda. Prueba otras fechas o ábrela directamente.',
  error: 'No pudimos consultar esta plataforma ahora.',
};

export function TarjetaPlataforma({ grupo, consulta, moneda, ganadora }: { grupo: GrupoPlataforma; consulta: Consulta; moneda: Moneda; ganadora: boolean }) {
  const color = infoPlataforma(grupo.plataforma.id.replace(/^paquete-/, '')).color;
  const idTitulo = `plataforma-${grupo.plataforma.id}`;
  return (
    <li className={`plataforma${ganadora ? ' plataforma--ganadora' : ''}`} aria-labelledby={idTitulo}>
      <div className="plataforma__cabeza">
        <span className="punto" style={{ background: color }} aria-hidden="true" />
        <h3 id={idTitulo}>{grupo.plataforma.nombre}</h3>
        {ganadora ? <span className="pastilla pastilla--vivo">Más barata</span> : null}
        {grupo.estado === 'solo-enlace' ? <span className="pastilla">Solo enlace</span> : null}
        {grupo.afiliado ? (
          <span className="pastilla" title="Si compras por este enlace, la plataforma nos paga una comisión. No cambia tu precio ni el orden.">
            Enlace de afiliado
          </span>
        ) : null}
      </div>
      {grupo.fuente ? <p className="plataforma__fuente">{grupo.fuente}</p> : null}
      {grupo.estado === 'ok' ? (
        <ol className="ofertas" aria-label={`${grupo.ofertas.length} precios más baratos en ${grupo.plataforma.nombre}, de menor a mayor`}>
          {grupo.ofertas.map((o, i) => (
            <FilaOferta key={o.id} oferta={o} puesto={i + 1} grupo={grupo} consulta={consulta} moneda={moneda} />
          ))}
        </ol>
      ) : grupo.estado !== 'solo-enlace' ? (
        <p className="estado-vacio">{grupo.nota ?? TEXTO_ESTADO[grupo.estado]}</p>
      ) : null}
      {grupo.nota && grupo.estado !== 'error' && grupo.estado !== 'sin-resultados' ? <p className="plataforma__nota">{grupo.nota}</p> : null}
      {grupo.afiliado ? (
        <p className="plataforma__nota">Enlace de afiliado: si compras por aquí, la plataforma nos paga una comisión. No cambia tu precio ni el orden.</p>
      ) : null}
      {grupo.enlaceBusqueda ? (
        <div className="plataforma__pie">
          <a
            className={grupo.estado === 'ok' ? 'boton boton--secundario boton--chico' : 'boton boton--chico'}
            href={grupo.enlaceBusqueda}
            target="_blank"
            rel="noopener noreferrer"
          >
            {grupo.estado === 'ok' ? `Ver todos en ${grupo.plataforma.nombre}` : `Buscar en ${grupo.plataforma.nombre}`} <IconoExterno />
            <span className="solo-lectores"> (abre en otra pestaña)</span>
          </a>
        </div>
      ) : null}
    </li>
  );
}

export function ResumenResultados({ respuesta, consulta }: { respuesta: RespuestaBusqueda; consulta: Consulta }) {
  const { masBarata, ahorro, plataformasConPrecio } = resumir(respuesta);
  const tasas = useTasas();
  if (!masBarata) return null;
  const m = respuesta.moneda;
  return (
    <div className="resumen" role="group" aria-label="Resumen de la comparación">
      <div className="dato dato--destacado">
        <span>Lo más barato · {masBarata.plataforma}</span>
        <strong>{formatearPrecio(masBarata.oferta.precio, m)}</strong>
        {tasas ? <small className="dato__extra">{equivalente(masBarata.oferta.precio, m, tasas)}</small> : null}
      </div>
      {consulta.adultos > 1 ? (
        <div className="dato">
          <span>Por persona</span>
          <strong>{formatearPrecio(masBarata.oferta.precio / consulta.adultos, m)}</strong>
        </div>
      ) : null}
      <div className="dato">
        <span>Ahorro al comparar</span>
        <strong>{ahorro > 0 ? formatearPrecio(ahorro, m) : '—'}</strong>
      </div>
      <div className="dato">
        <span>Plataformas con precio</span>
        <strong>{plataformasConPrecio}</strong>
      </div>
    </div>
  );
}

export function ListaPlataformas({ respuesta, consulta }: { respuesta: RespuestaBusqueda; consulta: Consulta }) {
  const { masBarata } = resumir(respuesta);
  const conPrecio = respuesta.grupos.filter((g) => g.estado === 'ok');
  const sinPrecio = respuesta.grupos.filter((g) => g.estado !== 'ok');
  return (
    <>
      {conPrecio.length > 0 ? (
        <>
          <div className="subtitulo-seccion">
            <h2>Los 3 más baratos por plataforma</h2>
            <span className="ayuda">Ordenadas solo por precio: ninguna plataforma paga por aparecer primero</span>
          </div>
          <ul className="plataformas">
            {conPrecio.map((g) => (
              <TarjetaPlataforma key={g.plataforma.id} grupo={g} consulta={consulta} moneda={respuesta.moneda} ganadora={masBarata?.plataforma === g.plataforma.nombre} />
            ))}
          </ul>
        </>
      ) : null}
      {sinPrecio.length > 0 ? (
        <>
          <div className="subtitulo-seccion">
            <h2>{conPrecio.length > 0 ? 'Revisa también en' : 'Abre la búsqueda en cada plataforma'}</h2>
            <span className="ayuda">Plataformas sin API pública de precios: el enlace ya lleva tus datos</span>
          </div>
          <ul className="plataformas">
            {sinPrecio.map((g) => (
              <TarjetaPlataforma key={g.plataforma.id} grupo={g} consulta={consulta} moneda={respuesta.moneda} ganadora={false} />
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
