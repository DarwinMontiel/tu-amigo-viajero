import { useSyncExternalStore } from 'react';

/**
 * Preferencias pensadas para todo tipo de persona y de celular:
 * - letra grande: sube el tamaño base del texto;
 * - ahorro de datos: no descarga ilustraciones, clima, tasa del día ni
 *   sugerencias remotas. Se activa solo si el navegador pide ahorrar datos
 *   (Save-Data) o la conexión es 2G, y se puede cambiar a mano.
 * Guardarlas es opcional: si el almacenamiento falla, duran la visita.
 */
export interface Ajustes {
  letraGrande: boolean;
  ahorroDatos: boolean;
}

const CLAVE = 'tav-ajustes';

interface ConexionLenta {
  saveData?: boolean;
  effectiveType?: string;
}

function conexionLenta(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: ConexionLenta }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g';
}

function leer(): Ajustes {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Ajustes> | null;
    if (guardado) return { letraGrande: Boolean(guardado.letraGrande), ahorroDatos: guardado.ahorroDatos ?? conexionLenta() };
  } catch {
    /* sin almacenamiento */
  }
  return { letraGrande: false, ahorroDatos: conexionLenta() };
}

let actual: Ajustes = leer();
const oyentes = new Set<() => void>();

function aplicar(a: Ajustes) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.letra = a.letraGrande ? 'grande' : 'normal';
  document.documentElement.dataset.ahorro = a.ahorroDatos ? 'si' : 'no';
}
aplicar(actual);

export function cambiarAjuste<K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) {
  actual = { ...actual, [clave]: valor };
  aplicar(actual);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(actual));
  } catch {
    /* sin almacenamiento: dura la visita */
  }
  oyentes.forEach((o) => o());
}

export function useAjustes(): Ajustes {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => actual,
  );
}
