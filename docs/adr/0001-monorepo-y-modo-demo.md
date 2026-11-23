# ADR 0001 · Monorepo TypeScript con modo demo de primera clase

- **Estado:** aceptada
- **Fecha:** 2026-11-23

## Contexto

La versión 2.2 era un sitio estático sobre una plantilla de Bootstrap 3 (2022) que solo armaba
enlaces a otras páginas. El objetivo de la 3.0 es mostrar **precios reales dentro de la app**: los 3
más baratos de cada plataforma, de menor a mayor, en vuelos, hoteles y paquetes.

Restricciones:

1. Las claves de las APIs de precios no pueden ir en el navegador.
2. El sitio público (GitHub Pages) y el CI tienen que funcionar **sin claves**.
3. Todo debe costar $0.

## Decisión

Un monorepo con *npm workspaces* y tres paquetes en TypeScript estricto:

| Paquete | Qué contiene | Corre en |
|---|---|---|
| `packages/core` | Dominio puro: validación de búsquedas, enlaces a cada plataforma, ranking «3 más baratos», paquetes, intérprete de lenguaje natural por reglas y **datos de ejemplo** | Navegador, Worker y Node (pruebas) |
| `apps/api` | Hono en Cloudflare Workers: proveedores (SerpApi, Travelpayouts), caché, límites, cuota diaria e IA | Cloudflare Workers |
| `apps/web` | React 19 + Vite: interfaz, accesibilidad, temas | GitHub Pages |

El **modo demo** no es un mock de pruebas: es una implementación completa del mismo contrato
(`RespuestaBusqueda`) que usa la API en vivo, con datos grabados y marcados como «datos de ejemplo».

- Sin `VITE_API_URL`, la web usa el modo demo **en el navegador** (`buscarDemo`, `ofertasDemo`…).
- Con la API desplegada pero sin claves, la API responde en modo demo.
- Con claves, la API responde en vivo y cada respuesta dice `modo: "vivo"`.

Los enlaces del modo demo **sí son reales**: se arman con la búsqueda del usuario y abren la misma
búsqueda en Despegar, Kayak, Booking, etc.

## Consecuencias

- Una sola fuente de verdad para tipos y reglas: la web y la API no pueden divergir.
- El CI prueba la experiencia completa (e2e + axe) sin red ni secretos.
- El dominio se prueba sin DOM ni red (`vitest` en Node, 40+ pruebas).
- Costo: los datos de ejemplo hay que mantenerlos a mano; están en un solo archivo
  (`packages/core/src/demo/datos.ts`) y cubren 10 rutas y 7 ciudades.
