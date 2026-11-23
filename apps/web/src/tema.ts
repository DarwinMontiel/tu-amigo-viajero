import { useCallback, useEffect, useState } from 'react';

export type Tema = 'claro' | 'oscuro';
const CLAVE = 'tav-tema';

function temaDelSistema(): Tema {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

function temaGuardado(): Tema | null {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === 'claro' || t === 'oscuro' ? t : null;
  } catch {
    return null;
  }
}

/** Tema elegido por la persona; si no eligió, el del sistema. Guardarlo es opcional (puede fallar en modo privado). */
export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => temaGuardado() ?? temaDelSistema());

  useEffect(() => {
    document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light';
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((actual) => {
      const nuevo: Tema = actual === 'oscuro' ? 'claro' : 'oscuro';
      try {
        localStorage.setItem(CLAVE, nuevo);
      } catch {
        /* sin almacenamiento: el tema dura la visita */
      }
      return nuevo;
    });
  }, []);

  return [tema, alternar];
}
