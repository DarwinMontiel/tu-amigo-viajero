import { diasEntre, fechaCorta, hoyISO, nombreCiudad, sumarDias } from '@tav/core';
import { useEffect, useState } from 'react';
import { useAjustes } from '../ajustes.ts';

interface Dia {
  fecha: string;
  max: number;
  min: number;
  lluvia: number;
  codigo: number;
}

/** Código WMO de Open-Meteo → texto corto. */
export function describirClima(codigo: number): string {
  if (codigo === 0) return 'Despejado';
  if (codigo <= 2) return 'Parcial';
  if (codigo === 3) return 'Nublado';
  if (codigo === 45 || codigo === 48) return 'Niebla';
  if (codigo >= 51 && codigo <= 57) return 'Llovizna';
  if (codigo >= 61 && codigo <= 67) return 'Lluvia';
  if (codigo >= 80 && codigo <= 82) return 'Aguaceros';
  if (codigo >= 95) return 'Tormenta';
  return 'Variable';
}

/**
 * Pronóstico del destino con Open-Meteo (gratis, sin clave): las fechas del
 * viaje si caen en los próximos 16 días; si no, los próximos 7 como referencia.
 */
export function Clima({ destino, lugar, ida, regreso }: { destino: string; lugar: string; ida: string; regreso: string }) {
  const { ahorroDatos } = useAjustes();
  const [dias, setDias] = useState<Dia[] | null>(null);
  const esDelViaje = diasEntre(hoyISO(), ida) <= 15;

  useEffect(() => {
    if (ahorroDatos) return;
    const control = new AbortController();
    const hoy = hoyISO();
    const ciudad = nombreCiudad(destino) !== destino ? nombreCiudad(destino) : lugar.split(',')[0] ?? destino;
    const enRango = diasEntre(hoy, ida) <= 15;
    const desde = enRango ? ida : hoy;
    const hasta = enRango ? (regreso && diasEntre(hoy, regreso) <= 15 ? regreso : sumarDias(ida, Math.min(6, 15 - diasEntre(hoy, ida)))) : sumarDias(hoy, 6);
    (async () => {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es`, { signal: control.signal });
      const lugarGeo = ((await g.json()) as { results?: Array<{ latitude: number; longitude: number }> }).results?.[0];
      if (!lugarGeo) return;
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lugarGeo.latitude}&longitude=${lugarGeo.longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&start_date=${desde}&end_date=${hasta}`;
      const r = await fetch(url, { signal: control.signal });
      const d = (await r.json()) as {
        daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weather_code: number[] };
      };
      if (!d.daily) return;
      setDias(
        d.daily.time.map((fecha, i) => ({
          fecha,
          max: Math.round(d.daily!.temperature_2m_max[i] ?? 0),
          min: Math.round(d.daily!.temperature_2m_min[i] ?? 0),
          lluvia: d.daily!.precipitation_probability_max[i] ?? 0,
          codigo: d.daily!.weather_code[i] ?? -1,
        })),
      );
    })().catch(() => setDias(null));
    return () => control.abort();
  }, [destino, lugar, ida, regreso, ahorroDatos]);

  if (ahorroDatos || !dias || dias.length === 0) return null;
  return (
    <section aria-labelledby="titulo-clima" style={{ marginTop: 28 }}>
      <div className="subtitulo-seccion">
        <h2 id="titulo-clima">Clima en {nombreCiudad(destino)}</h2>
        <span className="ayuda">{esDelViaje ? 'Pronóstico para tus fechas' : 'Próximos días (el pronóstico de tus fechas sale 16 días antes)'} · Open-Meteo</span>
      </div>
      <ul className="clima">
        {dias.map((d) => (
          <li key={d.fecha}>
            <span>{fechaCorta(d.fecha)}</span>
            <strong>
              {d.max}° / {d.min}°
            </strong>
            <span>{describirClima(d.codigo)}</span>
            <br />
            <span className="ayuda">Lluvia {d.lluvia}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
