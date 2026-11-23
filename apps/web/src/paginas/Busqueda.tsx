import {
  AVISO_DEMO,
  RUTAS_DEMO,
  consultaAParametros,
  fechaCorta,
  hoyISO,
  nombreCiudad,
  sumarDias,
  validarConsulta,
  type Consulta,
  type Modulo,
  type RespuestaBusqueda,
} from '@tav/core';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, HAY_API } from '../api.ts';
import { useCarga } from '../useCarga.ts';
import { Clima } from '../componentes/Clima.tsx';
import { FormularioBusqueda } from '../componentes/FormularioBusqueda.tsx';
import { IconoAvion, IconoCama, IconoMaleta } from '../componentes/iconos.tsx';
import { Recomendacion } from '../componentes/Recomendacion.tsx';
import { ListaPlataformas, ResumenResultados } from '../componentes/Resultados.tsx';

const CABECERA: Record<Modulo, { titulo: string; texto: string }> = {
  vuelos: {
    titulo: 'Compara vuelos',
    texto: 'Precios de Google Flights y Aviasales, más la búsqueda lista en Despegar, Kayak y Skyscanner. Toca «¿Dónde lo compro?» para ver qué agencia vende cada vuelo más barato.',
  },
  hoteles: {
    titulo: 'Compara hoteles',
    texto: 'Los 3 alojamientos más baratos de Booking.com, Expedia, Agoda, Hotels.com, Trip.com, Airbnb y más, con el total de la estadía.',
  },
  paquetes: {
    titulo: 'Compara paquetes vuelo + hotel',
    texto: 'Sumamos el vuelo más barato a los hoteles más baratos de cada plataforma para darte el total del viaje, y te llevamos a las agencias que venden paquetes armados.',
  },
};

const ICONO: Record<Modulo, typeof IconoAvion> = { vuelos: IconoAvion, hoteles: IconoCama, paquetes: IconoMaleta };

function PestanasModulo({ actual, parametros }: { actual: Modulo; parametros: URLSearchParams }) {
  const conservar = new URLSearchParams(parametros);
  conservar.delete('asistente');
  return (
    <nav className="pestanas" aria-label="Tipo de búsqueda">
      {(['vuelos', 'hoteles', 'paquetes'] as const).map((m) => {
        const Icono = ICONO[m];
        const p = new URLSearchParams(conservar);
        if (m === 'paquetes' || m === 'hoteles') {
          const ida = p.get('ida');
          if (ida && !p.get('regreso')) p.set('regreso', sumarDias(ida, 5));
        }
        return (
          <Link key={m} to={`/${m}${p.toString() ? `?${p}` : ''}`} aria-current={m === actual ? 'page' : undefined}>
            <Icono /> {m === 'vuelos' ? 'Vuelos' : m === 'hoteles' ? 'Hoteles' : 'Paquetes'}
          </Link>
        );
      })}
    </nav>
  );
}

function EjemplosDemo({ modulo }: { modulo: Modulo }) {
  if (HAY_API) return null;
  const ida = sumarDias(hoyISO(), 21);
  return (
    <div className="fila" style={{ marginTop: 16 }}>
      <span className="ayuda">Rutas con datos de ejemplo:</span>
      {RUTAS_DEMO.map((r) => {
        const p = new URLSearchParams({ ...(modulo !== 'hoteles' ? { origen: r.origen } : {}), destino: r.destino, ida, regreso: sumarDias(ida, 5), adultos: '2', moneda: 'COP' });
        return (
          <Link key={`${r.origen}-${r.destino}`} className="chip" to={`/${modulo}?${p}`}>
            {modulo === 'hoteles' ? nombreCiudad(r.destino) : `${nombreCiudad(r.origen)} → ${nombreCiudad(r.destino)}`}
          </Link>
        );
      })}
    </div>
  );
}

export function Busqueda({ modulo }: { modulo: Modulo }) {
  const [parametros, setParametros] = useSearchParams();
  const clave = parametros.toString();
  const validacion = useMemo(() => validarConsulta(modulo, new URLSearchParams(clave)), [modulo, clave]);
  const consulta: Consulta | null = validacion.ok ? validacion.consulta : null;
  const presupuesto = Number(parametros.get('presupuesto')) || undefined;
  const titulo = useRef<HTMLHeadingElement>(null);
  const claveBusqueda = consulta ? `${modulo}?${consultaAParametros(consulta)}` : null;
  const {
    datos: respuesta,
    error,
    cargando,
    reintentar,
  } = useCarga<RespuestaBusqueda>(claveBusqueda, (senal) => api.buscar(consulta!, senal), 'La búsqueda falló. Inténtalo de nuevo.');

  // Al llegar los resultados, el foco va al título para que los lectores de pantalla los anuncien.
  useEffect(() => {
    if (respuesta) titulo.current?.focus();
  }, [respuesta]);

  const cabecera = CABECERA[modulo];
  // El aviso general del modo demo ya está en el banner superior.
  const avisos = respuesta ? respuesta.avisos.filter((a) => a !== AVISO_DEMO) : [];
  const resumenBusqueda = consulta
    ? `${modulo === 'hoteles' ? nombreCiudad(consulta.destino) : `${nombreCiudad(consulta.origen)} → ${nombreCiudad(consulta.destino)}`} · ${fechaCorta(consulta.ida)}${
        consulta.regreso ? ` – ${fechaCorta(consulta.regreso)}` : ' (solo ida)'
      } · ${consulta.adultos} ${consulta.adultos === 1 ? 'adulto' : 'adultos'}`
    : '';

  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <PestanasModulo actual={modulo} parametros={parametros} />
          <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>{cabecera.titulo}</h1>
          <p className="lead">{cabecera.texto}</p>
          <FormularioBusqueda key={`${modulo}-${clave}`} modulo={modulo} parametros={parametros} alBuscar={(p) => setParametros(p)} ocupado={cargando} />
          {!consulta ? <EjemplosDemo modulo={modulo} /> : null}
        </div>
      </section>

      <section className="contenedor" aria-labelledby="titulo-resultados" style={{ paddingTop: 28 }}>
        {consulta ? (
          <div className="fila separado">
            <h2 id="titulo-resultados" ref={titulo} tabIndex={-1} style={{ margin: 0, fontSize: '1.3rem' }}>
              {resumenBusqueda}
            </h2>
            {respuesta ? (
              <span className={`pastilla ${respuesta.modo === 'vivo' ? 'pastilla--vivo' : 'pastilla--demo'}`}>
                {respuesta.modo === 'vivo' ? 'Precios en vivo' : 'Datos de ejemplo'}
              </span>
            ) : null}
          </div>
        ) : (
          <h2 id="titulo-resultados" className="solo-lectores">
            Resultados
          </h2>
        )}

        <div aria-live="polite" aria-busy={cargando}>
          {cargando ? (
            <>
              <p className="ayuda cargando-puntos">Consultando las plataformas</p>
              <div className="plataformas" style={{ display: 'grid' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="esqueleto" />
                ))}
              </div>
            </>
          ) : null}

          {error ? (
            <div className="panel" role="alert" style={{ marginTop: 18 }}>
              <p className="error-campo" style={{ fontSize: '1rem' }}>
                {error}
              </p>
              <button type="button" className="boton boton--secundario" onClick={reintentar}>
                Reintentar
              </button>
            </div>
          ) : null}

          {respuesta && consulta ? (
            <>
              <p className="solo-lectores">
                {respuesta.grupos.filter((g) => g.estado === 'ok').length} plataformas con precios para {resumenBusqueda}.
              </p>
              <ResumenResultados respuesta={respuesta} consulta={consulta} />
              {avisos.length > 0 ? (
                <ul className="avisos">
                  {avisos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : null}
              {respuesta.grupos.some((g) => g.estado === 'ok') ? <Recomendacion consulta={consulta} respuesta={respuesta} {...(presupuesto ? { presupuesto } : {})} /> : null}
              <ListaPlataformas respuesta={respuesta} consulta={consulta} />
              <p className="ayuda" style={{ marginTop: 18 }}>
                {respuesta.modo === 'vivo'
                  ? `Precios consultados el ${new Date(respuesta.consultadoEn).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}. Pueden cambiar: confirma el valor final en cada página antes de pagar.`
                  : 'Los precios de esta página son datos de ejemplo. Los enlaces abren la búsqueda real con tus datos.'}
              </p>
              <Clima destino={consulta.destino} lugar={consulta.lugar} ida={consulta.ida} regreso={consulta.regreso} />
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
