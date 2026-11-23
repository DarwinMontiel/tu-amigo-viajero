import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { cambiarAjuste, useAjustes } from '../ajustes.ts';
import { HAY_API } from '../api.ts';
import { useTema } from '../tema.ts';
import { IconoCerrar, IconoLuna, IconoMenu, IconoSol } from './iconos.tsx';
import { Logo } from './Logo.tsx';

const ENLACES = [
  { a: '/', texto: 'Inicio', fin: true },
  { a: '/vuelos', texto: 'Vuelos' },
  { a: '/hoteles', texto: 'Hoteles' },
  { a: '/paquetes', texto: 'Paquetes' },
  { a: '/compromiso', texto: 'Compromiso' },
  { a: '/contacto', texto: 'Contacto' },
];

const TITULOS: Record<string, string> = {
  '/': 'Compara vuelos, hoteles y paquetes',
  '/vuelos': 'Vuelos',
  '/hoteles': 'Hoteles',
  '/paquetes': 'Paquetes vuelo + hotel',
  '/compromiso': 'Nuestro compromiso',
  '/contacto': 'Contacto',
};

function Encabezado() {
  const [tema, alternarTema] = useTema();
  const { letraGrande } = useAjustes();
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const [rutaPrevia, setRutaPrevia] = useState(pathname);

  // Al cambiar de página, el menú del celular se cierra.
  if (pathname !== rutaPrevia) {
    setRutaPrevia(pathname);
    setAbierto(false);
  }

  return (
    <header className="encabezado">
      <div className="contenedor encabezado__fila">
        <Link to="/" className="marca" aria-label="Tu Amigo Viajero, ir al inicio">
          <Logo />
          <span>Tu Amigo Viajero</span>
        </Link>
        <nav id="navegacion" className="nav" aria-label="Principal" data-abierto={abierto}>
          {ENLACES.map((e) => (
            <NavLink key={e.a} to={e.a} end={e.fin ?? false}>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="boton-icono boton-letra"
          aria-pressed={letraGrande}
          onClick={() => cambiarAjuste('letraGrande', !letraGrande)}
          title="Letra grande"
        >
          <span aria-hidden="true">A+</span>
          <span className="solo-lectores">Letra grande</span>
        </button>
        <button
          type="button"
          className="boton-icono"
          onClick={alternarTema}
          aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          title={tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}
        >
          {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
        </button>
        <button
          type="button"
          className="boton-icono menu-movil"
          aria-expanded={abierto}
          aria-controls="navegacion"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto((a) => !a)}
        >
          {abierto ? <IconoCerrar /> : <IconoMenu />}
        </button>
      </div>
    </header>
  );
}

function BannerModo() {
  if (HAY_API) return null;
  return (
    <div className="banner-modo" role="note">
      <div className="contenedor">
        <span className="pastilla pastilla--demo">Modo demo</span>
        <span>
          Los precios son <strong>datos de ejemplo</strong>; los enlaces sí abren la búsqueda real en cada página.{' '}
          <Link to="/contacto#como-funciona">¿Cómo se activan los datos en vivo?</Link>
        </span>
      </div>
    </div>
  );
}

function Pie() {
  return (
    <footer className="pie">
      <div className="contenedor">
        <div className="pie__grilla">
          <div>
            <h2>Tu Amigo Viajero</h2>
            <p>
              Un comparador de viajes gratuito y abierto, hecho para ayudar: busca una vez y ve los 3 precios más baratos de cada plataforma,
              ordenados solo por precio. Sin registro, sin publicidad y sin comisiones ocultas.
            </p>
          </div>
          <div>
            <h2>Comparar</h2>
            <ul>
              <li>
                <Link to="/vuelos">Vuelos</Link>
              </li>
              <li>
                <Link to="/hoteles">Hoteles</Link>
              </li>
              <li>
                <Link to="/paquetes">Paquetes vuelo + hotel</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Fuentes de datos</h2>
            <ul>
              <li>
                <a href="https://serpapi.com/">SerpApi</a> (Google Flights, Google Hotels y Airbnb)
              </li>
              <li>
                <a href="https://www.travelpayouts.com/">Travelpayouts</a> (Aviasales)
              </li>
              <li>
                <a href="https://open-meteo.com/">Open-Meteo</a> (clima)
              </li>
            </ul>
          </div>
          <div>
            <h2>Proyecto</h2>
            <ul>
              <li>
                <Link to="/compromiso">Nuestro compromiso</Link>
              </li>
              <li>
                <Link to="/compromiso#ajustes">Letra grande y ahorro de datos</Link>
              </li>
              <li>
                <Link to="/contacto">Autor y créditos</Link>
              </li>
              <li>
                <a href="https://github.com/DarwinMontiel/tu-amigo-viajero">Código en GitHub</a>
              </li>
            </ul>
          </div>
        </div>
        <p className="pie__legal">
          Proyecto académico en equipo (2022: Darwin Montiel, Andrés, Jhon y Martín), reconstruido en 2026 por Darwin Montiel. Código bajo
          licencia MIT. Las marcas citadas pertenecen a sus dueños; este sitio no está afiliado a ninguna plataforma.
        </p>
      </div>
    </footer>
  );
}

export function Marco() {
  const { pathname } = useLocation();

  useEffect(() => {
    // GitHub Pages redirige /vuelos a /vuelos/: se ignora la barra final.
    const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    document.title = `${TITULOS[ruta] ?? 'Página no encontrada'} · Tu Amigo Viajero`;
  }, [pathname]);

  return (
    <>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <Encabezado />
      <BannerModo />
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <Pie />
    </>
  );
}
