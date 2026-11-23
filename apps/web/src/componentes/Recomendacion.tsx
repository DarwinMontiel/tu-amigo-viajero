import { formatearPrecio, type Consulta, type Moneda, type Recomendacion as Rec, type RespuestaBusqueda } from '@tav/core';
import { useMemo } from 'react';
import { api } from '../api.ts';
import { useCarga } from '../useCarga.ts';
import { IconoChispa } from './iconos.tsx';

/** Recomendación sobre los resultados ya cargados: IA gratuita con la API, reglas en demo. */
export function Recomendacion({ consulta, respuesta, presupuesto }: { consulta: Consulta; respuesta: RespuestaBusqueda; presupuesto?: number }) {
  const clave = useMemo(() => `${JSON.stringify(consulta)}|${respuesta.consultadoEn}|${respuesta.grupos.length}|${presupuesto ?? ''}`, [consulta, respuesta, presupuesto]);
  const { datos: rec, cargando } = useCarga<Rec>(clave, () =>
    api.recomendar(consulta, respuesta, presupuesto ? { valor: presupuesto, moneda: consulta.moneda as Moneda } : undefined),
  );

  if (!cargando && !rec) return null;
  return (
    <section className="recomendacion" aria-live="polite" aria-busy={cargando}>
      <div className="fila separado">
        <span className="fila" style={{ gap: 8, fontWeight: 700 }}>
          <IconoChispa /> Recomendación de tu amigo viajero
        </span>
        {rec ? <span className={`pastilla ${rec.motor === 'ia' ? 'pastilla--ia' : ''}`}>{rec.motor === 'ia' ? 'Con IA' : 'Calculada con reglas'}</span> : null}
      </div>
      {cargando ? (
        <p className="ayuda cargando-puntos" style={{ marginTop: 10 }}>
          Revisando las ofertas
        </p>
      ) : rec ? (
        <>
          <h2>{rec.titular}</h2>
          <ul>
            {rec.puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {presupuesto ? <p className="ayuda" style={{ margin: '10px 0 0' }}>Tu presupuesto: {formatearPrecio(presupuesto, consulta.moneda)}</p> : null}
        </>
      ) : null}
    </section>
  );
}
