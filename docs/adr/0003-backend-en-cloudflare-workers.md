# ADR 0003 · Backend en Cloudflare Workers con Hono

- **Estado:** aceptada
- **Fecha:** 2026-11-23

## Contexto

Las claves de SerpApi y Travelpayouts necesitan un servidor. Debe ser gratis, siempre encendido
(sin arranques en frío largos), con caché y límite de peticiones, y fácil de desplegar desde CI.

## Opciones

| Opción | Plan gratuito | Contras |
|---|---|---|
| **Cloudflare Workers** | 100 000 peticiones/día, KV, Rate Limiting e IA (Workers AI) incluidos | Runtime de Workers (no Node completo) |
| Render | Servicio web gratis | Se duerme tras 15 min: la primera búsqueda tarda ~50 s |
| Fly.io | Ya no tiene plan gratuito para cuentas nuevas | Tarjeta obligatoria |
| Vercel Functions | Plan Hobby gratis | Sin KV ni IA en el mismo plan; uso comercial restringido |

## Decisión

**Cloudflare Workers + Hono.** Hono es pequeño, tipado y corre igual en Workers y en Node, lo que
permite probar toda la API con `app.request()` en Vitest, sin levantar servidor.

Seguridad y robustez:

- Claves como **secretos de Wrangler**, nunca en el repositorio ni en el navegador.
- CORS limitado a `ORIGENES_PERMITIDOS`; cabeceras seguras (`hono/secure-headers`).
- Validación de cada búsqueda con las mismas reglas del frontend (`validarConsulta`).
- `Promise.allSettled`: si una fuente falla, las demás responden y la tarjeta caída lo explica.
- Tiempo límite por fuente (12–20 s) y mensajes de error que no filtran claves.
- `/api/hoteles/ir` solo redirige a URLs `https://` que vienen de la fuente o al respaldo de Google.

## Consecuencias

- $0 y sin arranques en frío.
- Sin KV la caché vive por isolate; con `wrangler kv namespace create CACHE` se comparte.
- El despliegue desde GitHub Actions es opcional: solo corre si existe `CLOUDFLARE_API_TOKEN`.
