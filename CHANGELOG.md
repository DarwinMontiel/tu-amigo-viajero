# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [2.0.0] - 2026-11-12

Revisión completa del proyecto académico.

### Agregado

- Simulador "Viaja ahora, paga a cuotas" en `pricing.html`: cuota fija (sistema francés),
  tasa mensual equivalente, totales y tabla de amortización en pesos enteros.
- Sección "Historias de viajeros" con testimonios ficticios en la portada.
- Validación de los formularios con mensajes en español y estados de error y éxito.
- Selector de fechas en español con formato dd/mm/aaaa y sin días pasados.
- Ilustraciones SVG propias de los seis destinos y de los fondos, y favicon.
- Etiquetas Open Graph y Twitter con vista previa (`docs/vista-previa.png`).
- Accesibilidad: textos alternativos descriptivos, enlace "Saltar al contenido", `aria-label`
  en el menú móvil y en el botón para volver arriba.
- Pruebas con `node --test`, validación con html-validate, verificador del sitio
  (`scripts/verificar-sitio.mjs`) e integración continua en GitHub Actions.
- `LICENSE` (MIT) y `AVISOS.md` con las licencias de la plantilla y las librerías.

### Cambiado

- Todo el contenido pasa a una agencia colombiana ficticia: destinos nacionales, precios en
  COP, planes "/mes" y una sola marca, *Tu Amigo Viajero*, en las cuatro páginas.
- Textos de la interfaz en español: menú, formularios, contadores, pie de página y visor de
  imágenes.
- Ortografía corregida (tildes, signos de apertura ¿ ¡, "Suscríbete").
- Teléfono y correo de ejemplo con formato válido (`tel:+576010000000`).
- `js/main.js` y `js/magnific-popup-options.js` reescritos con nombres y comentarios en
  español.

### Corregido

- El texto de relleno en latín de "Cómo funciona" y "Nuestro éxito".
- El README prometía testimonios que la portada no tenía.
- HTML inválido (`<ul>` dentro de `<p>`, clase `row-p b-md` con un tabulador) y enlace con el
  texto "xxxxxxx.co".

### Eliminado

- Fotos de demostración sin fuente identificable.
- Archivos de la plantilla sin uso: `google_map.js` (llamaba a la API de Google por HTTP y sin
  clave), Easy Pie Chart, Owl Carousel, Respond.js, FlexSlider, mapas de fuentes obsoletos e
  imágenes de muestra.
- Íconos de redes sociales que apuntaban a `#`.

## [1.0.0] - 2022-05-27

- Versión original del equipo (Darwin Montiel, Andrés, Jhon y Martín) sobre la plantilla de
  GetTemplates.co.
