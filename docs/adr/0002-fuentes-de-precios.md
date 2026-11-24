# ADR 0002 · Fuentes de precios: SerpApi + Travelpayouts, sin scraping

- **Estado:** aceptada
- **Fecha:** 2026-11-23 (fuentes revisadas ese día)

## Contexto

Se quiere juntar el mayor número de plataformas (Despegar, Google Flights, Kayak, Skyscanner,
Booking, Expedia, Agoda, Airbnb…) en una búsqueda, con **3 precios por plataforma**. Raspar las
páginas de las agencias va contra sus condiciones de uso, así que solo valen APIs oficiales o de
terceros que lo permitan. Y el presupuesto es **$0**.

## Opciones evaluadas (noviembre de 2026)

| Opción | Estado | Costo | Veredicto |
|---|---|---|---|
| **SerpApi** (Google Flights, Google Hotels, Booking.com, Airbnb) | Vigente. Documenta motores `google_flights`, `google_hotels`, `booking` y `airbnb` | **Plan gratuito: 250 búsquedas/mes**, 50 por hora. Las respuestas en caché de SerpApi no cuentan | ✅ Elegida |
| **Travelpayouts Data API** (Aviasales) | Vigente. `/aviasales/v3/prices_for_dates` devuelve precios en caché de las últimas 48 h con enlace | **Gratis** para afiliados registrados (token del perfil) | ✅ Elegida |
| **Amadeus Self-Service** | **Cerrado el 17 de julio de 2026**: el portal quedó solo para contratos Enterprise y el GitHub de amadeus4dev se archivó | Contrato empresarial | ❌ |
| **Duffel** | Vigente, pero el modo de prueba solo muestra la aerolínea ficticia «Duffel Airways»; datos reales exigen cuenta productiva de pago por uso | Pago por uso | ❌ (no aporta precios reales gratis) |
| **Booking.com / Expedia / Agoda afiliados** | Requieren aprobación como socio y tráfico demostrable | Gratis, pero no accesible para un proyecto nuevo | ❌ (Booking, Expedia y Agoda llegan igual por Google Hotels) |
| **Kayak / Skyscanner / Despegar** | Sus APIs son solo para socios comerciales | — | Solo enlace con la búsqueda armada |
| **Scraping** | Contra las condiciones de uso | — | ❌ Descartado por principio |

## Decisión

1. **Vuelos:** Google Flights vía SerpApi (precio total, aerolínea, horario, escalas) + Aviasales vía
   Travelpayouts. Despegar, Kayak y Skyscanner aparecen como **«Solo enlace»** con la búsqueda armada
   (formatos de URL comprobados en el navegador).
2. **«¿Dónde lo compro?»:** bajo demanda, SerpApi `booking_token` devuelve los vendedores de un vuelo
   (aerolínea, Despegar, Expedia, Kiwi…) con precio. Algunos enlaces de Google son formularios POST:
   la web los envía como `<form method="post">`.
3. **Hoteles:** Google Hotels vía SerpApi trae, por hotel, el precio de cada agencia; la API los
   **reagrupa por agencia** (Booking.com, Expedia, Agoda, Hotels.com, Trip.com…) y se queda con los 3
   más baratos de cada una. Airbnb tiene su propio motor. El motor `booking` es opcional
   (`SERPAPI_MOTORES_HOTELES`) porque Google Hotels ya trae a Booking.com.
4. **Enlace exacto por agencia:** pedir el detalle de cada hotel gastaría cuota en cada búsqueda.
   Por eso el enlace pasa por `/api/hoteles/ir`, que consulta el detalle **solo cuando el usuario hace
   clic** y redirige al enlace de esa agencia con fechas (respaldo: Google Hotels).
5. **Paquetes:** vuelo más barato encontrado + los 3 hoteles más baratos de cada plataforma, con el
   desglose. Despegar y Expedia, que venden paquetes armados, aparecen como «Solo enlace».

## Cuidar la cuota gratuita

- Caché en memoria + KV opcional: vuelos 3 h, hoteles 6 h, ofertas 6 h.
- **Cuota diaria** (`SERPAPI_LIMITE_DIARIO`, por defecto 8): 8 × 30 días = 240 < 250. Al agotarse, la
  plataforma muestra «Se agotó la cuota diaria gratuita» y el resto de la página sigue funcionando.
  - El tope cuenta **búsquedas de SerpApi, no búsquedas de personas**: un paquete gasta 3 y un
    «¿Dónde lo compro?» de ida y vuelta gasta 2.
  - La reserva es atómica dentro de cada isolate (sin `await` entre leer y anotar) y vive en un
    almacén propio, no en la caché, así que llenar la caché no la reinicia.
  - Con KV el uso se comparte entre instancias. KV es eventual, así que puede haber un pequeño
    exceso si dos instancias reservan en el mismo segundo.
  - *(Corregido en 3.1.1: antes las consultas en paralelo de un paquete contaban como una.)*
- **Tokens firmados:** los tokens de «¿Dónde lo compro?» y de `/api/hoteles/ir` llevan una firma
  HMAC atada a la búsqueda. Un token inventado no gasta cuota.
- Límite por IP (Rate Limiting de Workers + ventana en memoria).
- Una búsqueda de vuelos gasta 1; hoteles 2; paquetes 3; «¿Dónde lo compro?» 1 o 2.

## Consecuencias

- 10+ plataformas con precio o enlace en una búsqueda, todo legal y gratis.
- Los precios de Aviasales son de caché (pueden variar); la interfaz lo advierte.
- El tope gratuito limita las búsquedas en vivo a ~8 por día. Subirlo es cambiar una variable si
  algún día se paga un plan.
