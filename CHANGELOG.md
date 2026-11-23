# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [2.2.0] - 2026-11-23

### Agregado

- Página `buscar.html`: una búsqueda arma vuelos en Despegar, Google Flights, Kayak y Skyscanner y
  alojamiento en Booking.com y Airbnb, con autocompletado de ciudades del mundo, pronóstico del
  clima del destino (Open-Meteo) y tasa de cambio del día. Enlace en el menú y en el pie de todas
  las páginas, y atajos desde los seis destinos.
- "Quiero este plan" llega a Contacto con el asunto lleno (`contact.html?plan=familiar`).

### Corregido

- Destinos y portada: con tarjetas de alturas distintas, Bootstrap 3 (float) dejaba huecos y
  colgaba una tarjeta sola en la tercera columna. Las filas de tarjetas ahora usan flex: cada fila
  se alinea y las tarjetas miden lo mismo, con el precio al pie.
- La portada tardaba varios segundos en mostrar el título y el formulario porque esperaban la
  animación de scroll; el contenido de la cabecera ahora se ve de inmediato en las cinco páginas.
- Menú del celular: el submenú "Regiones" solo se abría con el mouse; ahora abre y cierra al
  tocarlo, y el menú se cierra al elegir un destino de la misma página. Enlaces más legibles.
- Entre 769 y 991 px el menú se partía en dos líneas; se compacta para caber en una.
- El simulador podía cortar "$" y el valor en líneas distintas ("12 cuotas de $ / 120.554"); el
  peso usa un espacio de no separación.

## [2.1.0] - 2026-11-17

### Cambiado

- Identidad visual propia, «atardecer en vuelo»: naranja de atardecer (`#b8400b`) para la marca y
  el morado del cielo de la portada para la banda de suscripción, en lugar del turquesa y el azul
  de la plantilla. El favicon pasa a un degradado de atardecer.
- La tarjeta «Cuota mensual» del simulador usa un tono cálido; el verde queda solo para mensajes
  de éxito.
- Capturas de `docs/` y vista previa para compartir regeneradas con el estilo nuevo.

### Corregido

- Contraste WCAG AA en los textos heredados de la plantilla: grises `#777`, `#808080` y `#b3b3b3`
  y blancos translúcidos sobre fondos de color pasaron a colores con al menos 4,5:1. Medido con
  una auditoría automática sobre las cuatro páginas (de 148 textos bajo el mínimo a ninguno real).

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
