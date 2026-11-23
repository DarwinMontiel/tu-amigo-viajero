# ADR 0004 · Asistente de viaje con IA gratuita (Workers AI) y respaldo por reglas

- **Estado:** aceptada
- **Fecha:** 2026-11-23

## Contexto

Se quiere IA de verdad, útil para cualquier persona: escribir «playa en diciembre saliendo de
Medellín, 2 adultos, máximo 3 millones» y obtener la búsqueda armada y una recomendación sobre los
resultados. Condición: **no gastar dinero**. Por eso se descartan los modelos de pago (Claude,
GPT, etc.).

## Opciones gratuitas

| Opción | Gratis | Contras |
|---|---|---|
| **Workers AI** (Llama 3.3 70B) | 10 000 neuronas/día en el plan Free; al agotarse falla, no cobra | Modo JSON sin streaming y sin garantía de cumplir el esquema |
| Groq / Gemini | Planes gratuitos con límites | Otra cuenta y otra clave que cuidar |
| Ollama local | Gratis | No sirve para un sitio público |

## Decisión

**Workers AI** con `@cf/meta/llama-3.3-70b-instruct-fp8-fast` en **modo JSON** (`response_format`
con `json_schema`), en el mismo Worker y la misma cuenta gratuita que la API. Una interpretación
cuesta ~50 neuronas: alcanza para ~190 al día.

Dos usos:

1. **Interpretar** (`POST /api/asistente/interpretar`): texto → `Intencion` (módulo, origen,
   destino, fechas, adultos, presupuesto). La salida del modelo se **sanea**: códigos IATA de 3
   letras, fechas futuras dentro de 11 meses, 1–9 adultos. Lo que el modelo deje vacío o invente se
   completa con el **intérprete por reglas** (`interpretarConReglas`).
2. **Recomendar** (`POST /api/asistente/recomendar`): con los 3 resultados por plataforma ya
   cargados, un titular y 2–4 puntos. Para evitar alucinaciones, `recomendacionFiel` extrae cada
   monto citado y lo compara con los precios reales (±1 %); si el modelo inventa un precio, se usa la
   recomendación calculada por reglas.

**Respaldo siempre disponible:** si no hay binding de IA, se agotó la cuota diaria, el modelo tarda
más de 15 s o no cumple el esquema, responde el intérprete por reglas. En el modo demo (GitHub Pages)
el asistente corre por reglas **dentro del navegador**, sin red. La interfaz dice cuál respondió.

## Consecuencias

- IA real en el producto con costo $0 y sin cuentas extra.
- El asistente nunca deja al usuario sin respuesta.
- Las reglas en español (meses, «una semana», «2,5 millones», «playa», «con mi pareja») tienen
  pruebas propias y sirven de red de seguridad del modelo.
