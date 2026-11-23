# Licencias, atribuciones y fuentes de datos

## Código propio — MIT

Todo el código de `packages/`, `apps/`, `e2e/` y `scripts/` se distribuye bajo la
[licencia MIT](LICENSE). El texto de la licencia está en inglés porque es su versión oficial; en
resumen: puedes usar, copiar y modificar este código siempre que conserves el aviso de copyright, y
se entrega sin garantías.

## Plantilla de 2022 (GetTemplates, CC BY 3.0): ya no se usa

Las versiones 1.x y 2.x partían de una plantilla gratuita de [GetTemplates.co](https://gettemplates.co/)
publicada bajo [Creative Commons Atribución 3.0](https://creativecommons.org/licenses/by/3.0/deed.es),
con Bootstrap 3, jQuery y varios plugins. **En la versión 3.0.0 no queda nada de esa plantilla:** la
estructura, los estilos, los scripts y las fuentes se reescribieron desde cero en React y CSS propio.
Por eso ya no se incluye la atribución en el pie del sitio. El historial de esas versiones sigue en
git y en el [CHANGELOG](CHANGELOG.md), donde se reconoce la plantilla original.

## Proyecto académico original

Tu Amigo Viajero nació en 2022 como proyecto académico en equipo de **Darwin Montiel, Andrés, Jhon y
Martín**. El nombre y la idea vienen de ese trabajo y se reconocen en el README, en la página de
Contacto y en el pie del sitio.

## Imágenes

- `apps/web/public/ilustraciones/heroe.svg` y `favicon.svg`: creadas para la versión 3.0 (MIT).
- `apps/web/public/ilustraciones/*.svg` de destinos: creadas para este repositorio en 2026 para
  reemplazar las fotos sin fuente de 2022 (MIT).
- `docs/*.png`: capturas del propio sitio, generadas con `scripts/capturas.spec.ts`.
- Las plataformas se identifican con su nombre y un punto de color: no se usan sus logos.

## Dependencias principales

| Paquete | Uso | Licencia |
|---|---|---|
| React, React DOM | Interfaz | MIT |
| React Router | Rutas de la web | MIT |
| Vite, @vitejs/plugin-react | Compilación | MIT |
| Hono | API en Workers | MIT |
| Wrangler | Despliegue del Worker | MIT o Apache 2.0 |
| @fontsource-variable/bricolage-grotesque | Tipografía de títulos | SIL OFL 1.1 |
| @fontsource-variable/figtree | Tipografía de texto | SIL OFL 1.1 |
| Vitest, Playwright, @axe-core/playwright | Pruebas | MIT y MPL 2.0 (axe-core) |
| ESLint, typescript-eslint, eslint-plugin-jsx-a11y, eslint-plugin-react-hooks | Calidad | MIT |
| TypeScript | Tipos | Apache 2.0 |

## Fuentes de datos y servicios

| Servicio | Uso | Condiciones |
|---|---|---|
| [SerpApi](https://serpapi.com/) | Resultados públicos de Google Flights, Google Hotels, Booking.com y Airbnb | Plan gratuito con clave del dueño del despliegue |
| [Travelpayouts](https://www.travelpayouts.com/) · Aviasales Data API | Precios en caché y ofertas | Gratis para afiliados; enlaces con el marcador de afiliado opcional |
| [ExchangeRate-API](https://www.exchangerate-api.com) (open.er-api.com) | Tasa del día | Gratis y sin clave, con atribución |
| Travelpayouts · autocompletado | Sugerencias de ciudades y aeropuertos | Público, sin clave |
| [Open-Meteo](https://open-meteo.com/) | Pronóstico y geocodificación | Gratis para uso no comercial, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) · Llama 3.3 70B | Asistente | Plan Free (10 000 neuronas al día); modelo bajo la licencia comunitaria de Llama 3.3 |

Los datos del **modo demo** (`packages/core/src/demo/datos.ts`) son de ejemplo, armados a mano. No
son precios reales y la interfaz siempre lo indica. Los nombres de aerolíneas, hoteles y plataformas
son marcas de sus dueños y se mencionan solo para identificar la oferta.
