import { fechaCorta, formatearPrecio, nombreCiudad, sumarDias, hoyISO, type Intencion } from '@tav/core';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, ErrorApi, HAY_API } from '../api.ts';
import { CampoLugar, lugarDesdeIata, type LugarElegido } from './CampoLugar.tsx';
import { IconoChispa } from './iconos.tsx';

const EJEMPLOS = [
  'Playa en diciembre saliendo de Medellín, 2 adultos, máximo 3 millones',
  'Vuelo de Bogotá a Madrid del 10 al 24 de febrero',
  'Hotel en Cartagena para una semana con mi familia',
  'Fin de semana en el Eje Cafetero desde Bogotá',
];

const NOMBRE_MODULO = { vuelos: 'Vuelos', hoteles: 'Hoteles', paquetes: 'Vuelo + hotel' } as const;

/**
 * Asistente de viaje: entiende un pedido en lenguaje natural y lo convierte en
 * búsqueda. Con la API usa IA gratuita (Workers AI); en demo, un intérprete
 * por reglas que corre en el navegador. Muestra qué entendió antes de buscar.
 */
export function Asistente() {
  const id = useId();
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'inicial' | 'pensando' | 'listo' | 'error'>('inicial');
  const [intencion, setIntencion] = useState<Intencion | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [origenManual, setOrigenManual] = useState<LugarElegido | null>(lugarDesdeIata('BOG'));
  const [destinoManual, setDestinoManual] = useState<LugarElegido | null>(null);

  async function interpretar(e?: FormEvent, ejemplo?: string) {
    e?.preventDefault();
    const pedido = (ejemplo ?? texto).trim();
    if (pedido.length < 3) {
      setMensaje('Cuéntame en una frase a dónde quieres ir, desde dónde y cuándo.');
      setEstado('error');
      return;
    }
    if (ejemplo) setTexto(ejemplo);
    setEstado('pensando');
    try {
      const r = await api.interpretar(pedido);
      setIntencion(r);
      setDestinoManual(r.destino ? lugarDesdeIata(r.destino) : null);
      setEstado('listo');
    } catch (err) {
      setMensaje(err instanceof ErrorApi ? err.message : 'No pude entender el pedido. Inténtalo de nuevo.');
      setEstado('error');
    }
  }

  function buscar(destinoElegido?: string) {
    if (!intencion) return;
    const hoy = hoyISO();
    const origen = intencion.origen ?? origenManual?.iata ?? 'BOG';
    const destino = destinoElegido ?? intencion.destino ?? destinoManual?.iata;
    if (!destino) return;
    const ida = intencion.ida ?? sumarDias(hoy, 21);
    const regreso = intencion.regreso ?? (intencion.modulo === 'vuelos' ? '' : sumarDias(ida, 5));
    const p = new URLSearchParams({ destino, ida, adultos: String(intencion.adultos), moneda: intencion.presupuesto?.moneda ?? 'COP' });
    if (intencion.modulo !== 'hoteles') p.set('origen', origen);
    if (regreso) p.set('regreso', regreso);
    if (intencion.presupuesto) p.set('presupuesto', String(intencion.presupuesto.valor));
    p.set('asistente', '1');
    navegar(`/${intencion.modulo}?${p}`);
  }

  const faltaDestino = intencion && !intencion.destino && !destinoManual;

  return (
    <section className="panel asistente" aria-labelledby={`${id}-titulo`}>
      <div className="fila separado">
        <h2 id={`${id}-titulo`} className="mt-0" style={{ fontSize: '1.25rem', margin: 0 }}>
          <span className="fila" style={{ gap: 8 }}>
            <IconoChispa /> Cuéntame tu viaje
          </span>
        </h2>
        <span className={`pastilla ${HAY_API ? 'pastilla--ia' : ''}`}>{HAY_API ? 'IA gratuita · Llama 3.3' : 'Demo · intérprete por reglas'}</span>
      </div>
      <p className="ayuda" style={{ margin: '6px 0 12px' }}>
        Escríbelo como se lo dirías a un amigo: destino o tipo de plan, desde dónde, cuándo, cuántos y tu presupuesto.
      </p>
      <form onSubmit={interpretar}>
        <div className="asistente__caja">
          <label htmlFor={`${id}-texto`} className="solo-lectores">
            Describe tu viaje
          </label>
          <textarea
            id={`${id}-texto`}
            value={texto}
            maxLength={500}
            rows={2}
            placeholder="Ej.: playa en enero desde Cali para 2, máximo 2 millones"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void interpretar();
              }
            }}
          />
          <button type="submit" className="boton" disabled={estado === 'pensando'}>
            {estado === 'pensando' ? 'Pensando…' : 'Planear'}
          </button>
        </div>
      </form>
      <div className="asistente__ejemplos" aria-label="Ejemplos de pedidos">
        {EJEMPLOS.map((e) => (
          <button key={e} type="button" className="chip" onClick={() => void interpretar(undefined, e)}>
            {e}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {estado === 'error' ? <p className="error-campo" style={{ marginTop: 12 }}>{mensaje}</p> : null}
        {estado === 'listo' && intencion ? (
          <div className="entendido">
            <p style={{ margin: 0 }}>
              <strong>Entendí:</strong> {intencion.explicacion}{' '}
              <span className="ayuda">({intencion.motor === 'ia' ? 'interpretado con IA' : 'interpretado por reglas'})</span>
            </p>
            <dl>
              <div>
                <dt>Busco</dt>
                <dd>{NOMBRE_MODULO[intencion.modulo]}</dd>
              </div>
              {intencion.modulo !== 'hoteles' ? (
                <div>
                  <dt>Desde</dt>
                  <dd>{intencion.origen ? nombreCiudad(intencion.origen) : 'Elígelo abajo'}</dd>
                </div>
              ) : null}
              <div>
                <dt>Hacia</dt>
                <dd>{intencion.destino ? nombreCiudad(intencion.destino) : 'Elígelo abajo'}</dd>
              </div>
              <div>
                <dt>Fechas</dt>
                <dd>
                  {intencion.ida ? fechaCorta(intencion.ida) : 'en 3 semanas'}
                  {intencion.regreso ? ` – ${fechaCorta(intencion.regreso)}` : ''}
                </dd>
              </div>
              <div>
                <dt>Viajeros</dt>
                <dd>
                  {intencion.adultos} {intencion.adultos === 1 ? 'adulto' : 'adultos'}
                </dd>
              </div>
              {intencion.presupuesto ? (
                <div>
                  <dt>Presupuesto</dt>
                  <dd>{formatearPrecio(intencion.presupuesto.valor, intencion.presupuesto.moneda)}</dd>
                </div>
              ) : null}
            </dl>
            {intencion.modulo !== 'hoteles' && !intencion.origen ? (
              <CampoLugar etiqueta="¿Desde dónde sales?" nombre="origen-asistente" valor={origenManual} alCambiar={setOrigenManual} marcador="Ciudad o aeropuerto" />
            ) : null}
            {!intencion.destino ? (
              <CampoLugar etiqueta="¿A dónde quieres ir?" nombre="destino-asistente" valor={destinoManual} alCambiar={setDestinoManual} marcador="Ciudad o aeropuerto" />
            ) : null}
            <div className="fila" style={{ marginTop: 12 }}>
              <button type="button" className="boton" onClick={() => buscar()} disabled={Boolean(faltaDestino)}>
                Comparar precios
              </button>
              {intencion.sugeridos.some((s) => s !== intencion.destino) ? (
                <span className="fila" style={{ gap: 8 }}>
                  <span className="ayuda">O prueba:</span>
                  {intencion.sugeridos.filter((s) => s !== intencion.destino).map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => buscar(s)}>
                      {nombreCiudad(s)}
                    </button>
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
