import {
  MAX_ADULTOS,
  MONEDAS,
  consultaAParametros,
  hoyISO,
  sumarDias,
  validarConsulta,
  type Errores,
  type Modulo,
  type Moneda,
} from '@tav/core';
import { useId, useState, type FormEvent } from 'react';
import { CampoLugar, lugarDesdeIata, type LugarElegido } from './CampoLugar.tsx';
import { IconoBuscar, IconoIntercambiar } from './iconos.tsx';

interface Props {
  modulo: Modulo;
  parametros: URLSearchParams;
  alBuscar: (p: URLSearchParams) => void;
  ocupado?: boolean;
}

const TEXTOS: Record<Modulo, { ida: string; regreso: string; boton: string }> = {
  vuelos: { ida: 'Ida', regreso: 'Regreso', boton: 'Comparar vuelos' },
  hoteles: { ida: 'Llegada', regreso: 'Salida', boton: 'Comparar hoteles' },
  paquetes: { ida: 'Ida', regreso: 'Regreso', boton: 'Comparar paquetes' },
};

export function FormularioBusqueda({ modulo, parametros, alBuscar, ocupado = false }: Props) {
  const id = useId();
  const hoy = hoyISO();
  const idaInicial = parametros.get('ida') ?? sumarDias(hoy, 21);
  const [origen, setOrigen] = useState<LugarElegido | null>(lugarDesdeIata(parametros.get('origen') ?? 'BOG'));
  const [destino, setDestino] = useState<LugarElegido | null>(() => {
    const l = lugarDesdeIata(parametros.get('destino') ?? '');
    const lugar = parametros.get('lugar');
    return l && lugar ? { ...l, lugar } : l;
  });
  const [ida, setIda] = useState(idaInicial);
  const [soloIda, setSoloIda] = useState(modulo === 'vuelos' && parametros.has('ida') && !parametros.get('regreso'));
  const [regreso, setRegreso] = useState(parametros.get('regreso') ?? sumarDias(idaInicial, 5));
  const [adultos, setAdultos] = useState(parametros.get('adultos') ?? '2');
  const [moneda, setMoneda] = useState<Moneda>((MONEDAS as readonly string[]).includes(parametros.get('moneda') ?? '') ? (parametros.get('moneda') as Moneda) : 'COP');
  const [errores, setErrores] = useState<Errores>({});
  const t = TEXTOS[modulo];
  const usaOrigen = modulo !== 'hoteles';

  function enviar(e: FormEvent) {
    e.preventDefault();
    const entrada = {
      origen: usaOrigen ? (origen?.iata ?? '') : '',
      destino: destino?.iata ?? '',
      ida,
      regreso: modulo === 'vuelos' && soloIda ? '' : regreso,
      adultos,
      moneda,
      lugar: destino?.lugar ?? '',
    };
    const v = validarConsulta(modulo, entrada, hoy);
    if (!v.ok) {
      setErrores(v.errores);
      const primero = document.querySelector<HTMLElement>(`#${CSS.escape(id)} [aria-invalid="true"]`);
      primero?.focus();
      return;
    }
    setErrores({});
    const p = consultaAParametros(v.consulta);
    if (destino?.lugar && destino.lugar !== v.consulta.lugar) p.set('lugar', destino.lugar);
    const presupuesto = parametros.get('presupuesto');
    if (presupuesto) p.set('presupuesto', presupuesto);
    alBuscar(p);
  }

  function intercambiar() {
    setOrigen(destino);
    setDestino(origen);
  }

  const errorDe = (campo: keyof Errores) => errores[campo];
  const idErr = (campo: string) => `${id}-${campo}-error`;

  return (
    <form id={id} className="formulario panel" onSubmit={enviar} noValidate aria-label={t.boton}>
      {usaOrigen ? (
        <CampoLugar etiqueta="Desde" nombre="origen" valor={origen} alCambiar={setOrigen} error={errorDe('origen')} marcador="Ciudad o aeropuerto" clase="campo campo--ancho" />
      ) : null}
      <CampoLugar
        etiqueta={modulo === 'hoteles' ? '¿A dónde vas?' : 'Hacia'}
        nombre="destino"
        valor={destino}
        alCambiar={setDestino}
        error={errorDe('destino')}
        marcador="Ciudad o aeropuerto"
        clase={usaOrigen ? 'campo campo--ancho' : 'campo campo--ancho'}
      />
      {usaOrigen ? (
        <div className="campo campo--chico">
          <span className="etiqueta" aria-hidden="true">
            &nbsp;
          </span>
          <button type="button" className="boton boton--secundario" onClick={intercambiar}>
            <IconoIntercambiar /> Invertir
          </button>
        </div>
      ) : null}
      <div className="campo campo--chico campo--mitad-movil">
        <label htmlFor={`${id}-ida`}>{t.ida}</label>
        <input
          id={`${id}-ida`}
          type="date"
          min={hoy}
          value={ida}
          onChange={(e) => {
            setIda(e.target.value);
            if (e.target.value && regreso <= e.target.value) setRegreso(sumarDias(e.target.value, modulo === 'vuelos' ? 5 : 3));
          }}
          aria-invalid={errorDe('ida') ? true : undefined}
          aria-describedby={errorDe('ida') ? idErr('ida') : undefined}
          required
        />
        {errorDe('ida') ? (
          <p id={idErr('ida')} className="error-campo">
            {errorDe('ida')}
          </p>
        ) : null}
      </div>
      <div className="campo campo--chico campo--mitad-movil">
        <label htmlFor={`${id}-regreso`}>{t.regreso}</label>
        <input
          id={`${id}-regreso`}
          type="date"
          min={ida || hoy}
          value={modulo === 'vuelos' && soloIda ? '' : regreso}
          disabled={modulo === 'vuelos' && soloIda}
          onChange={(e) => setRegreso(e.target.value)}
          aria-invalid={errorDe('regreso') ? true : undefined}
          aria-describedby={errorDe('regreso') ? idErr('regreso') : undefined}
        />
        {errorDe('regreso') ? (
          <p id={idErr('regreso')} className="error-campo">
            {errorDe('regreso')}
          </p>
        ) : null}
      </div>
      <div className="campo campo--chico campo--mitad-movil">
        <label htmlFor={`${id}-adultos`}>Adultos</label>
        <select id={`${id}-adultos`} value={adultos} onChange={(e) => setAdultos(e.target.value)} aria-invalid={errorDe('adultos') ? true : undefined}>
          {Array.from({ length: MAX_ADULTOS }, (_, i) => String(i + 1)).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="campo campo--chico campo--mitad-movil">
        <label htmlFor={`${id}-moneda`}>Moneda</label>
        <select id={`${id}-moneda`} value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
          <option value="COP">Pesos (COP)</option>
          <option value="USD">Dólares (USD)</option>
          <option value="EUR">Euros (EUR)</option>
        </select>
      </div>
      <div className="formulario__acciones">
        {modulo === 'vuelos' ? (
          <label className="fila" style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={soloIda} onChange={(e) => setSoloIda(e.target.checked)} style={{ width: 20, minHeight: 20 }} />
            Solo ida
          </label>
        ) : (
          <p className="ayuda">{modulo === 'hoteles' ? 'Precios totales de la estadía, para todos los adultos.' : 'Vuelo + hotel para todo el grupo y todas las noches.'}</p>
        )}
        <button type="submit" className="boton" disabled={ocupado}>
          <IconoBuscar /> {ocupado ? 'Buscando…' : t.boton}
        </button>
      </div>
    </form>
  );
}
