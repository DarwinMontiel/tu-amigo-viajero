import { buscarLugar, fechaCorta, formatearPrecio, hoyISO, sumarDias, type Moneda, type OfertaDestacada, type RespuestaOfertas } from '@tav/core';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.ts';
import { useCarga } from '../useCarga.ts';
import { Asistente } from '../componentes/Asistente.tsx';
import { IconoAvion, IconoCama, IconoMaleta } from '../componentes/iconos.tsx';
import { EnlaceOferta } from '../componentes/Resultados.tsx';
import { useAjustes } from '../ajustes.ts';
import { COMPROMISOS } from './Compromiso.tsx';

const BASE = import.meta.env.BASE_URL;

/** Ilustraciones propias por destino (el resto usa el degradado con el código). */
const ARTE: Record<string, { archivo: string; alt: string }> = {
  CTG: { archivo: 'cartagena.svg', alt: 'Ilustración de las murallas de Cartagena al atardecer' },
  ADZ: { archivo: 'san-andres.svg', alt: 'Ilustración del mar de siete colores de San Andrés' },
  AXM: { archivo: 'valle-de-cocora.svg', alt: 'Ilustración de las palmas de cera del Valle de Cocora' },
  PEI: { archivo: 'valle-de-cocora.svg', alt: 'Ilustración de las palmas de cera del Eje Cafetero' },
  MDE: { archivo: 'guatape.svg', alt: 'Ilustración de la Piedra del Peñol en Guatapé, cerca de Medellín' },
  BOG: { archivo: 'cerros-bogota.svg', alt: 'Ilustración de los cerros orientales de Bogotá' },
};

const ORIGENES = [
  { iata: 'BOG', nombre: 'Bogotá' },
  { iata: 'MDE', nombre: 'Medellín' },
  { iata: 'CLO', nombre: 'Cali' },
];

function TarjetaDestacada({ o, moneda }: { o: OfertaDestacada; moneda: Moneda }) {
  const { ahorroDatos } = useAjustes();
  const arte = ahorroDatos ? undefined : ARTE[o.destino];
  const busqueda = new URLSearchParams({ origen: o.origen, destino: o.destino, ida: o.ida, ...(o.regreso ? { regreso: o.regreso } : {}), adultos: '1', moneda });
  return (
    <li className="destacada">
      {arte ? (
        <img className="destacada__imagen" src={`${BASE}ilustraciones/${arte.archivo}`} alt={arte.alt} width={900} height={506} loading="lazy" />
      ) : (
        <div className="destacada__arte" aria-hidden="true">
          {o.destino}
        </div>
      )}
      <div className="destacada__cuerpo">
        <h3>
          {o.ciudadDestino}
          {o.pais && !o.nacional ? <span className="ayuda">, {o.pais}</span> : null}
        </h3>
        <p className="destacada__meta">
          {fechaCorta(o.ida)}
          {o.regreso ? ` – ${fechaCorta(o.regreso)}` : ''} · {o.escalas === 0 ? 'directo' : `${o.escalas} escala`} · ida y vuelta
        </p>
        <p className="destacada__precio" style={{ margin: 0 }}>
          {formatearPrecio(o.precio, moneda)} <span className="ayuda">por persona</span>
        </p>
        <div className="destacada__acciones">
          <Link to={`/vuelos?${busqueda}`}>Comparar en todas</Link>
          <EnlaceOferta enlace={o.enlace}>Ver en {o.plataforma}</EnlaceOferta>
        </div>
      </div>
    </li>
  );
}

const DESTINOS: Record<'nacionales' | 'internacionales', string[]> = {
  nacionales: ['CTG', 'SMR', 'ADZ', 'MDE', 'BOG', 'PEI', 'CLO', 'LET'],
  internacionales: ['MIA', 'MAD', 'CUN', 'PTY', 'MEX', 'LIM', 'PUJ', 'JFK'],
};

/** Destinos frecuentes (sin precio inventado): cada uno abre la comparación en vivo para dentro de 3 semanas. */
function DestinosParaComparar({ origen, tipo }: { origen: string; tipo: 'nacionales' | 'internacionales' }) {
  const { ahorroDatos } = useAjustes();
  const ida = sumarDias(hoyISO(), 21);
  const regreso = sumarDias(ida, 5);
  const destinos = DESTINOS[tipo].filter((d) => d !== origen).slice(0, 6);
  return (
    <ul className="grilla" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {destinos.map((destino) => {
        const arte = ahorroDatos ? undefined : ARTE[destino];
        const lugar = buscarLugar(destino);
        const p = new URLSearchParams({ origen, destino, ida, regreso, adultos: '1', moneda: 'COP' });
        return (
          <li key={destino} className="destacada">
            {arte ? (
              <img className="destacada__imagen" src={`${BASE}ilustraciones/${arte.archivo}`} alt={arte.alt} width={900} height={506} loading="lazy" />
            ) : (
              <div className="destacada__arte" aria-hidden="true">
                {destino}
              </div>
            )}
            <div className="destacada__cuerpo">
              <h3>
                {lugar?.ciudad ?? destino}
                {lugar && tipo === 'internacionales' ? <span className="ayuda">, {lugar.pais}</span> : null}
              </h3>
              <p className="destacada__meta">
                {fechaCorta(ida)} – {fechaCorta(regreso)} · ida y vuelta
              </p>
              <div className="destacada__acciones">
                <Link to={`/vuelos?${p}`}>Ver precios reales</Link>
                <Link to={`/paquetes?${p}`}>Vuelo + hotel</Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OfertasDestacadas() {
  const [origen, setOrigen] = useState('BOG');
  const [tipo, setTipo] = useState<'nacionales' | 'internacionales'>('nacionales');
  const [tope, setTope] = useState<number | null>(null);
  const { datos, error } = useCarga<RespuestaOfertas>(origen, (senal) => api.ofertas(origen, 'COP', senal), 'No pudimos cargar las ofertas.');

  const lista = datos ? datos[tipo] : [];
  // En vivo sin fuente de ofertas: se ofrecen destinos frecuentes para comparar precios reales al instante.
  const sinOfertas = datos?.modo === 'vivo' && datos.nacionales.length === 0 && datos.internacionales.length === 0;
  const maximo = useMemo(() => Math.max(0, ...(datos ? [...datos.nacionales, ...datos.internacionales].map((o) => o.precio) : [0])), [datos]);
  const visibles = tope ? lista.filter((o) => o.precio <= tope) : lista;

  return (
    <section className="seccion" aria-labelledby="titulo-ofertas">
      <div className="contenedor">
        <span className="antetitulo">Ofertas que encontramos</span>
        <div className="fila separado">
          <h2 id="titulo-ofertas" className="mt-0">
            Los vuelos más baratos desde {ORIGENES.find((o) => o.iata === origen)?.nombre}
          </h2>
          {datos && !sinOfertas ? (
            <span className={`pastilla ${datos.modo === 'vivo' ? 'pastilla--vivo' : 'pastilla--demo'}`}>{datos.modo === 'vivo' ? 'En vivo · Aviasales' : 'Datos de ejemplo'}</span>
          ) : null}
        </div>
        <p className="lead">
          {sinOfertas
            ? 'Elige un destino y comparamos al instante los precios reales de todas las plataformas para tus fechas.'
            : 'Precios de ida y vuelta por persona que otros viajeros encontraron en los portales en las últimas horas. Ábrelos para confirmar o compáralos en todas las plataformas.'}
        </p>

        <div className="fila" style={{ margin: '18px 0' }} role="group" aria-label="Ciudad de salida">
          {ORIGENES.map((o) => (
            <button key={o.iata} type="button" className="chip" aria-pressed={origen === o.iata} onClick={() => setOrigen(o.iata)}>
              Desde {o.nombre}
            </button>
          ))}
          <span aria-hidden="true" style={{ width: 12 }} />
          <div role="group" aria-label="Tipo de destino" className="fila" style={{ gap: 8 }}>
            <button type="button" className="chip" aria-pressed={tipo === 'nacionales'} onClick={() => setTipo('nacionales')}>
              Colombia
            </button>
            <button type="button" className="chip" aria-pressed={tipo === 'internacionales'} onClick={() => setTipo('internacionales')}>
              Exterior
            </button>
          </div>
        </div>

        {maximo > 0 ? (
          <div className="rango" style={{ marginBottom: 18 }}>
            <label htmlFor="presupuesto-ofertas">
              ¿A dónde voy con mi presupuesto? <strong>{tope ? `hasta ${formatearPrecio(tope, 'COP')}` : 'sin límite'}</strong>
            </label>
            <input
              id="presupuesto-ofertas"
              type="range"
              min={100_000}
              max={Math.ceil(maximo / 100_000) * 100_000}
              step={50_000}
              value={tope ?? Math.ceil(maximo / 100_000) * 100_000}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTope(v >= maximo ? null : v);
              }}
              aria-valuetext={tope ? `hasta ${formatearPrecio(tope, 'COP')}` : 'sin límite'}
            />
          </div>
        ) : null}

        <div aria-live="polite" aria-busy={!datos && !error}>
          {error ? <p className="error-campo">No pudimos cargar las ofertas. Recarga la página.</p> : null}
          {!datos && !error ? (
            <div className="grilla">
              {[0, 1, 2].map((i) => (
                <div key={i} className="esqueleto" />
              ))}
            </div>
          ) : null}
          {datos && sinOfertas ? <DestinosParaComparar origen={origen} tipo={tipo} /> : null}
          {datos && !sinOfertas ? (
            visibles.length > 0 ? (
              <ul className="grilla" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {visibles.slice(0, 6).map((o) => (
                  <TarjetaDestacada key={o.destino} o={o} moneda={datos.moneda} />
                ))}
              </ul>
            ) : (
              <p className="ayuda">{lista.length > 0 ? 'Ningún destino cabe en ese presupuesto: sube el tope.' : (datos.avisos.at(-1) ?? 'Sin ofertas por ahora.')}</p>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Inicio() {
  const { ahorroDatos } = useAjustes();
  return (
    <>
      <section className="heroe">
        <div className="contenedor heroe__grilla">
          <div>
            <span className="antetitulo">Comparador de viajes · Colombia y el mundo</span>
            <h1>
              Busca una vez. <em>Paga lo justo.</em>
            </h1>
            <p className="lead">
              Ve los <strong>3 precios más baratos de cada plataforma</strong>, de menor a mayor, para vuelos, hoteles y paquetes. Luego compras
              donde más te convenga: aquí no se cobra nada.
            </p>
            <Asistente />
            <ul className="cifras">
              <li>
                <strong>10+</strong> plataformas por búsqueda
              </li>
              <li>
                <strong>3</strong> mejores precios por cada una
              </li>
              <li>
                <strong>$0</strong> de comisión, sin registro
              </li>
            </ul>
          </div>
          {ahorroDatos ? null : <img className="heroe__ilustracion" src={`${BASE}ilustraciones/heroe.svg`} width={560} height={480} alt="" />}
        </div>
      </section>

      <section className="seccion seccion--alt" aria-labelledby="titulo-modulos">
        <div className="contenedor">
          <span className="antetitulo">¿Qué quieres comparar?</span>
          <h2 id="titulo-modulos" className="mt-0">
            Tres comparadores, una sola búsqueda
          </h2>
          <div className="grilla" style={{ marginTop: 18 }}>
            <Link to="/vuelos" className="modulo-tarjeta">
              <span className="modulo-tarjeta__icono">
                <IconoAvion />
              </span>
              <h3 className="mt-0">Vuelos</h3>
              <p>Google Flights y Aviasales con precio; Despegar, Kayak y Skyscanner con la búsqueda armada. Y ves qué agencia vende cada vuelo más barato.</p>
            </Link>
            <Link to="/hoteles" className="modulo-tarjeta">
              <span className="modulo-tarjeta__icono">
                <IconoCama />
              </span>
              <h3 className="mt-0">Hoteles</h3>
              <p>Booking.com, Expedia, Agoda, Hotels.com, Trip.com, Airbnb y más: los 3 alojamientos más baratos de cada una para tus noches.</p>
            </Link>
            <Link to="/paquetes" className="modulo-tarjeta">
              <span className="modulo-tarjeta__icono">
                <IconoMaleta />
              </span>
              <h3 className="mt-0">Paquetes</h3>
              <p>Arma vuelo + hotel con el vuelo más barato y los hoteles más baratos de cada plataforma, con el total para todo el grupo.</p>
            </Link>
          </div>
        </div>
      </section>

      <OfertasDestacadas />

      <section className="seccion" aria-labelledby="titulo-compromiso">
        <div className="contenedor">
          <span className="antetitulo">Nuestro compromiso</span>
          <h2 id="titulo-compromiso" className="mt-0">
            Hecho para ayudar, no para venderte
          </h2>
          <p className="lead">Un servicio abierto y gratuito para que cualquier persona compare con calma y pague el precio justo.</p>
          <ul className="compromisos" style={{ marginTop: 18 }}>
            {COMPROMISOS.slice(0, 3).map((c) => (
              <li key={c.titulo}>
                <h3>{c.titulo}</h3>
                <p>{c.texto}</p>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 18 }}>
            <Link className="boton boton--secundario" to="/compromiso">
              Lee todo nuestro compromiso
            </Link>
          </p>
        </div>
      </section>

      <section className="seccion seccion--alt" aria-labelledby="titulo-como">
        <div className="contenedor">
          <span className="antetitulo">Transparente de punta a punta</span>
          <h2 id="titulo-como" className="mt-0">
            Cómo funciona
          </h2>
          <ol className="pasos" style={{ marginTop: 18 }}>
            <li>
              <h3>Cuéntanos tu viaje</h3>
              <p className="mt-0">Con el formulario o escribiéndolo como se lo dirías a un amigo: el asistente arma la búsqueda.</p>
            </li>
            <li>
              <h3>Consultamos las fuentes</h3>
              <p className="mt-0">APIs oficiales y legales (SerpApi y Travelpayouts). No copiamos páginas de nadie y guardamos en caché para no gastar cuota.</p>
            </li>
            <li>
              <h3>Ordenamos de menor a mayor</h3>
              <p className="mt-0">Los 3 más baratos de cada plataforma, el ahorro al comparar y una recomendación con IA gratuita.</p>
            </li>
            <li>
              <h3>Compras donde quieras</h3>
              <p className="mt-0">Cada precio lleva a la misma búsqueda en la plataforma. No pagas nada aquí ni guardamos tus datos.</p>
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
