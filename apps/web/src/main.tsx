import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './estilos.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, RouterProvider } from 'react-router';
import { Marco } from './componentes/Marco.tsx';
import { Inicio } from './paginas/Inicio.tsx';

// El Inicio va en el paquete principal; el resto se descarga al visitarlo (menos datos en celulares).
const Busqueda = lazy(() => import('./paginas/Busqueda.tsx').then((m) => ({ default: m.Busqueda })));
const Contacto = lazy(() => import('./paginas/Contacto.tsx').then((m) => ({ default: m.Contacto })));
const Compromiso = lazy(() => import('./paginas/Compromiso.tsx').then((m) => ({ default: m.Compromiso })));

function Cargando() {
  return (
    <div className="contenedor seccion" role="status">
      <p className="ayuda cargando-puntos">Cargando</p>
    </div>
  );
}

const diferido = (nodo: React.ReactNode) => <Suspense fallback={<Cargando />}>{nodo}</Suspense>;

function NoEncontrada() {
  return (
    <section className="seccion">
      <div className="contenedor centro">
        <h1>Esta ruta no existe</h1>
        <p className="lead" style={{ margin: '0 auto 1em' }}>
          Puede que el enlace esté incompleto. Vuelve al inicio o empieza una búsqueda.
        </p>
        <Link className="boton" to="/">
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}

const enrutador = createBrowserRouter(
  [
    {
      element: <Marco />,
      children: [
        { index: true, element: <Inicio /> },
        { path: 'vuelos', element: diferido(<Busqueda key="vuelos" modulo="vuelos" />) },
        { path: 'hoteles', element: diferido(<Busqueda key="hoteles" modulo="hoteles" />) },
        { path: 'paquetes', element: diferido(<Busqueda key="paquetes" modulo="paquetes" />) },
        { path: 'compromiso', element: diferido(<Compromiso />) },
        { path: 'contacto', element: diferido(<Contacto />) },
        { path: '*', element: <NoEncontrada /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz');
createRoot(raiz).render(
  <StrictMode>
    <RouterProvider router={enrutador} />
  </StrictMode>,
);
