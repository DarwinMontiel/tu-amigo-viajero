import { HAY_API } from '../api.ts';
import { IconoGithub, IconoLinkedin } from '../componentes/iconos.tsx';

export function Contacto() {
  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <span className="antetitulo">Contacto</span>
          <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>¿Hablamos?</h1>
          <p className="lead">Tu Amigo Viajero es un proyecto de portafolio. Si quieres comentarlo, proponer una mejora o hablar de trabajo, escríbeme por LinkedIn o abre un issue en GitHub.</p>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor" style={{ display: 'grid', gap: 24 }}>
          <article className="panel autor" aria-labelledby="titulo-autor">
            <div className="autor__avatar" aria-hidden="true">
              DM
            </div>
            <div>
              <h2 id="titulo-autor" className="mt-0">
                Darwin Montiel
              </h2>
              <p className="lead" style={{ marginBottom: 0 }}>
                Desarrollador RPA y backend: Python, TypeScript, Playwright, RabbitMQ, SQL Server, PostgreSQL y Docker. Automatizo procesos y construyo APIs y
                tableros para el sector de cartera y cobranzas.
              </p>
              <div className="redes">
                <a className="boton" href="https://www.linkedin.com/in/darwin-montiel-mora-925216206" target="_blank" rel="noopener noreferrer">
                  <IconoLinkedin /> LinkedIn
                </a>
                <a className="boton boton--secundario" href="https://github.com/DarwinMontiel" target="_blank" rel="noopener noreferrer">
                  <IconoGithub /> GitHub
                </a>
              </div>
            </div>
          </article>

          <article className="panel" id="como-funciona" aria-labelledby="titulo-tecnico">
            <h2 id="titulo-tecnico" className="mt-0">
              Cómo está hecho
            </h2>
            <ul>
              <li>
                <strong>Web:</strong> React 19 + TypeScript con Vite, publicada en GitHub Pages.
              </li>
              <li>
                <strong>API:</strong> Hono en Cloudflare Workers (plan gratuito), con caché, límite por IP y cuota diaria para no gastar los planes gratuitos.
              </li>
              <li>
                <strong>Precios:</strong> SerpApi (Google Flights, Google Hotels y Airbnb) y la Data API de Travelpayouts (Aviasales). Sin raspar páginas.
              </li>
              <li>
                <strong>IA:</strong> Workers AI (Llama 3.3 70B) entiende pedidos en lenguaje natural y recomienda sobre los resultados, con una verificación que
                descarta precios inventados. Sin IA, responde un intérprete por reglas.
              </li>
              <li>
                <strong>Estado de este sitio:</strong> {HAY_API ? 'conectado a la API con datos en vivo.' : 'modo demo con datos de ejemplo grabados. Para datos en vivo se despliega la API con las claves gratuitas (ver README).'}
              </li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              <a href="https://github.com/DarwinMontiel/tu-amigo-viajero#readme">Documentación, arquitectura y decisiones técnicas</a>
            </p>
          </article>

          <article className="panel" aria-labelledby="titulo-creditos">
            <h2 id="titulo-creditos" className="mt-0">
              Créditos
            </h2>
            <p>
              Tu Amigo Viajero nació en 2022 como proyecto académico en equipo de Ingeniería de Sistemas, hecho por <strong>Darwin Montiel, Andrés, Jhon y Martín</strong>:
              una agencia de viajes ficticia sobre una plantilla de Bootstrap. En 2026 Darwin lo reconstruyó desde cero como comparador real de precios; de la
              versión original se conservan el nombre, la idea y las ilustraciones de destinos.
            </p>
            <p style={{ marginBottom: 0 }}>
              Clima: <a href="https://open-meteo.com/">Open-Meteo</a> (CC BY 4.0). Sugerencias de ciudades: Travelpayouts. Tipografías Bricolage Grotesque y Figtree (SIL OFL).
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
