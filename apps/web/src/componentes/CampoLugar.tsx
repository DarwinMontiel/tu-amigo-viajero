import { buscarLugar, filtrarLugares } from '@tav/core';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAjustes } from '../ajustes.ts';

export interface LugarElegido {
  iata: string;
  nombre: string;
  pais: string;
  /** Texto para buscar hospedaje: "Cartagena de Indias, Colombia". */
  lugar: string;
}

interface LugarRemoto {
  code?: string;
  name?: string;
  city_name?: string;
  country_name?: string;
  type?: string;
}

export function lugarDesdeIata(iata: string): LugarElegido | null {
  if (!/^[A-Z]{3}$/.test(iata)) return null;
  const l = buscarLugar(iata);
  return l ? { iata, nombre: l.ciudad, pais: l.pais, lugar: l.alojamiento } : { iata, nombre: iata, pais: '', lugar: iata };
}

const etiqueta = (l: LugarElegido): string => `${l.nombre} (${l.iata})`;

/** Ciudades y aeropuertos del mundo: API pública y gratuita de Travelpayouts, sin clave. */
async function buscarRemoto(termino: string, senal: AbortSignal): Promise<LugarElegido[]> {
  const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(termino)}&locale=es&types[]=city&types[]=airport`;
  const r = await fetch(url, { signal: senal });
  if (!r.ok) return [];
  const datos = (await r.json()) as LugarRemoto[];
  return datos
    .filter((l) => l.code && l.name)
    .slice(0, 8)
    .map((l) => {
      const ciudad = l.type === 'airport' && l.city_name ? `${l.name}, ${l.city_name}` : (l.name ?? '');
      return {
        iata: l.code!.toUpperCase(),
        nombre: ciudad,
        pais: l.country_name ?? '',
        lugar: [l.city_name ?? l.name, l.country_name].filter(Boolean).join(', '),
      };
    });
}

interface Props {
  etiqueta: string;
  nombre: string;
  valor: LugarElegido | null;
  alCambiar: (l: LugarElegido | null) => void;
  error?: string | undefined;
  marcador?: string;
  clase?: string;
}

/** Combobox accesible (patrón ARIA 1.2) con lista local inmediata y sugerencias remotas. */
export function CampoLugar({ etiqueta: textoEtiqueta, nombre, valor, alCambiar, error, marcador, clase = 'campo' }: Props) {
  const id = useId();
  const { ahorroDatos } = useAjustes();
  const idLista = `${id}-lista`;
  const idError = `${id}-error`;
  const [texto, setTexto] = useState(valor ? etiqueta(valor) : '');
  const [valorPrevio, setValorPrevio] = useState(valor);
  const [textoPropio, setTextoPropio] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [remotos, setRemotos] = useState<{ termino: string; lista: LugarElegido[] }>({ termino: '', lista: [] });
  const control = useRef<AbortController | null>(null);

  // Si el valor cambia desde afuera (por ejemplo «Invertir»), el texto lo sigue.
  if (valor !== valorPrevio) {
    setValorPrevio(valor);
    // Si el valor se borró porque la persona cambió el texto, se respeta lo que escribió.
    if (valor || !textoPropio) setTexto(valor ? etiqueta(valor) : '');
    setTextoPropio(false);
  }

  const termino = texto.trim();
  const buscando = abierto && termino.length >= 2 && !(valor && termino === etiqueta(valor));

  const opciones = useMemo(() => {
    if (!buscando) return [];
    const locales = filtrarLugares(termino).map((l) => ({ iata: l.iata, nombre: l.ciudad, pais: l.pais, lugar: l.alojamiento }));
    const vistos = new Set(locales.map((l) => l.iata));
    const extra = remotos.termino === termino ? remotos.lista.filter((r) => !vistos.has(r.iata)) : [];
    return [...locales, ...extra].slice(0, 8);
  }, [buscando, termino, remotos]);

  useEffect(() => {
    if (!buscando || ahorroDatos) return;
    const espera = setTimeout(() => {
      control.current?.abort();
      control.current = new AbortController();
      buscarRemoto(termino, control.current.signal)
        .then((lista) => setRemotos({ termino, lista }))
        .catch(() => {
          /* sin red: queda la lista local */
        });
    }, 250);
    return () => clearTimeout(espera);
  }, [buscando, termino, ahorroDatos]);

  function elegir(l: LugarElegido) {
    alCambiar(l);
    setTexto(etiqueta(l));
    setAbierto(false);
    setActivo(0);
  }

  function alSalir() {
    // Permite escribir el código IATA directamente ("MDE").
    setTimeout(() => {
      setAbierto(false);
      const t = texto.trim().toUpperCase();
      if (valor && texto === etiqueta(valor)) return;
      const directo = lugarDesdeIata(/^[A-Z]{3}$/.test(t) ? t : (/\(([A-Z]{3})\)/.exec(t)?.[1] ?? ''));
      if (directo) elegir(directo);
      // El texto ya no corresponde a la ciudad elegida: se borra el valor para no buscar otra sin avisar.
      else if (valor) {
        setTextoPropio(Boolean(t));
        alCambiar(null);
      }
    }, 120);
  }

  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setActivo((a) => Math.min(opciones.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && abierto && activo >= 0 && opciones[activo]) {
      e.preventDefault();
      elegir(opciones[activo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  }

  const mostrarLista = abierto && opciones.length > 0;

  return (
    <div className={clase}>
      <label htmlFor={id}>{textoEtiqueta}</label>
      <input
        id={id}
        name={nombre}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder={marcador}
        aria-autocomplete="list"
        aria-expanded={mostrarLista}
        aria-controls={idLista}
        aria-activedescendant={mostrarLista && activo >= 0 ? `${idLista}-${activo}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActivo(0);
          // En cuanto el texto deja de ser la ciudad elegida, el valor se borra: así el formulario
          // no puede enviar la ciudad anterior aunque se haga clic en «Comparar» de inmediato.
          if (valor && e.target.value !== etiqueta(valor)) {
            setTextoPropio(true);
            alCambiar(null);
          }
        }}
        onFocus={() => setAbierto(true)}
        onBlur={alSalir}
        onKeyDown={alTeclear}
      />
      <ul id={idLista} role="listbox" aria-label={`Sugerencias para ${textoEtiqueta.toLowerCase()}`} className="lista-opciones" hidden={!mostrarLista}>
        {opciones.map((l, i) => (
          <li
            key={`${l.iata}-${i}`}
            id={`${idLista}-${i}`}
            role="option"
            aria-selected={i === activo}
            onMouseDown={(e) => {
              e.preventDefault();
              elegir(l);
            }}
          >
            <span>
              {l.nombre}
              {l.pais ? <small>{l.pais}</small> : null}
            </span>
            <span className="codigo">{l.iata}</span>
          </li>
        ))}
      </ul>
      {error ? (
        <p id={idError} className="error-campo">
          {error}
        </p>
      ) : null}
    </div>
  );
}
