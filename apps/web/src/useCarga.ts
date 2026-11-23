import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorApi } from './api.ts';

interface Estado<T> {
  clave: string | null;
  datos?: T;
  error?: string;
}

export interface Carga<T> {
  datos: T | undefined;
  error: string | undefined;
  cargando: boolean;
  reintentar: () => void;
}

/**
 * Carga datos asíncronos identificados por una clave. El estado «cargando» se
 * deriva de si la respuesta guardada corresponde a la clave actual, así no hay
 * setState síncrono dentro del efecto ni respuestas viejas que pisen a las nuevas.
 */
export function useCarga<T>(clave: string | null, cargar: (senal: AbortSignal) => Promise<T>, mensajeError = 'Algo falló. Inténtalo de nuevo.'): Carga<T> {
  const [estado, setEstado] = useState<Estado<T>>({ clave: null });
  const [intento, setIntento] = useState(0);
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  });

  const claveIntento = clave === null ? null : `${clave}#${intento}`;

  useEffect(() => {
    if (claveIntento === null) return;
    const control = new AbortController();
    cargarRef.current(control.signal).then(
      (datos) => setEstado({ clave: claveIntento, datos }),
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setEstado({ clave: claveIntento, error: e instanceof ErrorApi ? e.message : mensajeError });
      },
    );
    return () => control.abort();
  }, [claveIntento, mensajeError]);

  const vigente = claveIntento !== null && estado.clave === claveIntento;
  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return {
    datos: vigente ? estado.datos : undefined,
    error: vigente ? estado.error : undefined,
    cargando: claveIntento !== null && !vigente,
    reintentar,
  };
}
