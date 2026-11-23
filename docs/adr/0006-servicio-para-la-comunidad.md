# ADR 0006 · Un servicio público para la comunidad

- **Estado:** aceptada
- **Fecha:** 2026-11-23

## Contexto

El objetivo no es solo comparar precios: es que cualquier persona sienta que la herramienta está de
su lado. Los buscadores grandes comparan bien, pero mezclan anuncios, no dicen si un precio trae
impuestos, no avisan que la maleta se paga aparte en las aerolíneas de bajo costo y no ayudan a
decidir si un paquete conviene más que comprar por separado.

## Decisión

Principios, publicados en la página **/compromiso** y en el README:

1. **Gratis, sin registro y sin publicidad.** No hay cuentas, cookies de seguimiento ni anuncios.
   Las preferencias (tema, letra, ahorro de datos) se guardan solo en el navegador.
2. **Neutral.** El orden es solo por precio (`ordenarGrupos`) y ninguna plataforma se esconde: si
   una falla, su tarjeta lo dice.
3. **Transparente.** Cada tarjeta dice de dónde sale el precio, cuándo se consultó y si es en vivo
   o de ejemplo.
4. **Afiliados declarados.** Si se configura `TRAVELPAYOUTS_MARKER`, el grupo lleva `afiliado: true`
   y la tarjeta muestra «Enlace de afiliado» con su explicación. Hoy no hay marcador configurado.
5. **Ayuda para decidir**, toda calculada con datos verificables:
   - **Impuestos:** `incluyeImpuestos` por oferta. Google Flights y Airbnb dan totales con impuestos;
     Booking separa `taxes_and_fees` y la API los suma.
   - **Maleta:** `avisoEquipaje` para aerolíneas de bajo costo (Wingo, JetSMART, Viva, Spirit…).
   - **¿Conviene comprar ahora?:** `consejoDeCompra` combina la anticipación (nacional: 3–9 semanas;
     internacional: 2–5 meses), las temporadas altas de Colombia (fin de año, Semana Santa calculada
     con el algoritmo de Pascua, vacaciones de mitad de año) y, en vivo, el `price_insights` de
     Google Flights (bajo, normal o alto, con el rango típico). Dice por qué aconseja y aclara que es
     una orientación, no una garantía.
   - **¿Paquete o por separado?:** el total por separado más barato, como umbral para comparar con
     los paquetes armados de Despegar o Expedia.
   - **Tasa del día:** la equivalencia en dólares o en pesos, con su fuente (ExchangeRate-API) y la
     advertencia de que el banco puede cobrar otra tasa.
6. **Para todos los celulares y todas las personas:**
   - **Letra grande** (botón A+) y textos en lenguaje sencillo.
   - **Ahorro de datos**, que se activa solo con `Save-Data` o en conexiones 2G. No descarga
     ilustraciones, clima, tasa ni sugerencias remotas.
   - Las páginas secundarias se cargan aparte con `React.lazy`, y cada ruta responde 200 en GitHub Pages.

## Consecuencias

- La confianza se gana con hechos visibles y probados: hay e2e del compromiso, del consejo, de los
  avisos de impuestos y maleta, del paquete contra separado, de la letra grande y del ahorro de datos.
- Si algún día se monetiza con afiliados, la declaración ya está en el producto y en las pruebas.
- El consejo de compra es heurístico: se presenta como orientación y nunca promete precios futuros.
