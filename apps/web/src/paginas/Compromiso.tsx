import { Link } from 'react-router';
import { cambiarAjuste, useAjustes } from '../ajustes.ts';

/** Los compromisos, en lenguaje sencillo. Se reutilizan en el Inicio. */
export const COMPROMISOS = [
  {
    titulo: 'Gratis, sin registro y sin publicidad',
    texto: 'No pedimos correo, ni cuenta, ni datos personales. No hay anuncios ni ventanas que te apuren a comprar.',
  },
  {
    titulo: 'Ordenado solo por precio',
    texto: 'La plataforma más barata va primero. Ninguna paga por aparecer arriba y no escondemos ninguna: si una falla, te lo decimos.',
  },
  {
    titulo: 'Transparente con cada precio',
    texto: 'Cada precio dice de dónde sale, cuándo se consultó y si es en vivo o de ejemplo. También si ya trae impuestos o si la maleta se paga aparte.',
  },
  {
    titulo: 'Si algún enlace nos da comisión, lo decimos',
    texto: 'Hoy ningún enlace es de afiliado. Si algún día lo es, la tarjeta dirá «Enlace de afiliado». La comisión no cambia tu precio ni el orden.',
  },
  {
    titulo: 'Te ayudamos a decidir, no a gastar',
    texto: 'Te decimos si conviene comprar ya o esperar, cuánto ahorras al comparar, si un paquete conviene más que comprar por separado y la tasa del día.',
  },
  {
    titulo: 'Para todas las personas y todos los celulares',
    texto: 'Funciona con lector de pantalla y teclado, tiene letra grande y un modo para ahorrar datos en conexiones lentas o planes pequeños.',
  },
];

export function Compromiso() {
  const { letraGrande, ahorroDatos } = useAjustes();
  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <span className="antetitulo">Nuestro compromiso</span>
          <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>Por qué existe Tu Amigo Viajero</h1>
          <p className="lead">
            Viajar no debería depender de saber buscar en diez páginas. Hicimos un comparador abierto para que cualquier persona, en Colombia o desde
            cualquier lugar, encuentre el precio justo en una sola búsqueda y entienda lo que está pagando.
          </p>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <ul className="compromisos">
            {COMPROMISOS.map((c) => (
              <li key={c.titulo}>
                <h2>{c.titulo}</h2>
                <p>{c.texto}</p>
              </li>
            ))}
          </ul>

          <div className="panel" style={{ marginTop: 28 }} id="ajustes">
            <h2 className="mt-0" style={{ fontSize: '1.25rem' }}>
              Ajusta la página a ti
            </h2>
            <div className="ajustes">
              <label className="interruptor" htmlFor="ajuste-letra">
                <input id="ajuste-letra" type="checkbox" checked={letraGrande} onChange={(e) => cambiarAjuste('letraGrande', e.target.checked)} />
                <span>
                  <strong>Letra grande</strong>
                  <small>Agranda todo el texto de la página.</small>
                </span>
              </label>
              <label className="interruptor" htmlFor="ajuste-ahorro">
                <input id="ajuste-ahorro" type="checkbox" checked={ahorroDatos} onChange={(e) => cambiarAjuste('ahorroDatos', e.target.checked)} />
                <span>
                  <strong>Ahorrar datos</strong>
                  <small>No descarga ilustraciones, clima, tasa del día ni sugerencias de ciudades. Se activa solo en conexiones lentas.</small>
                </span>
              </label>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 18 }}>
            <h2 className="mt-0" style={{ fontSize: '1.25rem' }}>
              Lo que no hacemos
            </h2>
            <ul>
              <li>No vendemos tiquetes ni cobramos: compras directamente en la página de cada plataforma.</li>
              <li>No copiamos páginas de nadie: usamos servicios que permiten consultar precios (SerpApi y Travelpayouts).</li>
              <li>No guardamos tus búsquedas ni usamos cookies de seguimiento. Tu búsqueda solo vive en la dirección de la página, para que la compartas si quieres.</li>
              <li>No inventamos precios: la recomendación con IA se descarta si menciona un precio que no está en los resultados.</li>
              <li>
                Algunas ayudas consultan servicios públicos y gratuitos desde tu navegador: el clima (Open-Meteo), la tasa del día (ExchangeRate-API) y las
                sugerencias de ciudades (Travelpayouts). Con «Ahorrar datos» activado no se consultan.
              </li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              ¿Algo no se cumple o se puede mejorar? <Link to="/contacto">Escríbenos</Link>: este proyecto es abierto y su código es público.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
