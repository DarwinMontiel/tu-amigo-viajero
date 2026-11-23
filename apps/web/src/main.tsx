import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './estilos.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, RouterProvider } from 'react-router';
import { Marco } from './componentes/Marco.tsx';
import { Busqueda } from './paginas/Busqueda.tsx';
import { Contacto } from './paginas/Contacto.tsx';
import { Inicio } from './paginas/Inicio.tsx';

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
        { path: 'vuelos', element: <Busqueda key="vuelos" modulo="vuelos" /> },
        { path: 'hoteles', element: <Busqueda key="hoteles" modulo="hoteles" /> },
        { path: 'paquetes', element: <Busqueda key="paquetes" modulo="paquetes" /> },
        { path: 'contacto', element: <Contacto /> },
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
