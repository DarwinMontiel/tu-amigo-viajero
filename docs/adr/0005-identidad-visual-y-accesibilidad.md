# ADR 0005 · Identidad visual «atardecer en vuelo» y accesibilidad AA

- **Estado:** aceptada
- **Fecha:** 2026-11-23

## Contexto

La plantilla de 2022 se veía vieja y genérica. Cada proyecto del portafolio tiene una identidad
propia (miel, verde radar, papel y sello, azul marino y oro, índigo, verde azulado) y esta no debe
parecerse a ninguna.

## Decisión

- **Paleta:** terracota de atardecer (`#b93d0a`) y ciruela de cielo nocturno (`#7a2e5e`, `#2b1530`)
  sobre crema cálido (`#fff7f0`). El tema oscuro usa noche ciruela (`#170d1c`) con coral (`#ff9a62`).
  Degradado de marca coral → rosa → ciruela solo en superficies decorativas; el texto con degradado
  usa tonos oscuros que mantienen 4,5:1.
- **Tipografía:** Bricolage Grotesque (títulos) y Figtree (texto), autoalojadas con Fontsource
  (SIL OFL), sin peticiones a terceros.
- **Imágenes:** ilustración principal nueva (SVG propio) y las ilustraciones de destinos hechas para
  este repositorio en 2026. Nada de fotos de stock. Las plataformas se identifican con un punto de
  color y su nombre, sin usar sus logos.
- **Accesibilidad (WCAG 2.2 AA):** enlace para saltar al contenido, foco visible, combobox con el
  patrón ARIA 1.2, errores asociados con `aria-describedby`, resultados en regiones `aria-live`, foco
  al título de resultados al terminar la búsqueda, `prefers-reduced-motion` y tema que respeta
  `prefers-color-scheme` con selector manual.
- **Verificación automática:** axe-core en Playwright revisa Inicio, Vuelos, Hoteles y Contacto en
  ambos temas, a 1440 y 375 px, en cada push. También se comprueba que no haya scroll horizontal.

## Consecuencias

- Identidad reconocible y distinta del resto del portafolio.
- Cualquier regresión de contraste o de ARIA rompe el CI.
