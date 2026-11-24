import { describe, expect, it } from 'vitest';
import { activarKvEnToml, idDeKv, tieneKv, urlDelDespliegue, validarClave } from './activar-lib.ts';

// Fragmento con el bloque de KV comentado, como queda wrangler.toml antes de activar.
const TOML = '[vars]\nIA_MODELO = "x"\n\n# [[kv_namespaces]]\n# binding = "CACHE"\n# id = "PEGA_AQUI_EL_ID"\n';
const ID = '0123456789abcdef0123456789abcdef';

describe('npm run activar', () => {
  it('lee el id del KV en los formatos que imprime wrangler', () => {
    expect(idDeKv(`[[kv_namespaces]]\nbinding = "CACHE"\nid = "${ID}"`)).toBe(ID);
    expect(idDeKv(`{ "binding": "CACHE", "id": "${ID.toUpperCase()}" }`)).toBe(ID);
    expect(idDeKv('Error: not authenticated')).toBeNull();
  });

  it('activa el bloque de KV del wrangler.toml real y es idempotente', () => {
    expect(tieneKv(TOML)).toBe(false);
    const activado = activarKvEnToml(TOML, ID);
    expect(tieneKv(activado)).toBe(true);
    expect(activado).toContain(`[[kv_namespaces]]\nbinding = "CACHE"\nid = "${ID}"`);
    expect(activarKvEnToml(activado, ID)).toBe(activado);
  });

  it('encuentra la URL del Worker en la salida del despliegue', () => {
    expect(urlDelDespliegue('Deployed tu-amigo-viajero-api triggers\n  https://tu-amigo-viajero-api.darwin.workers.dev\nCurrent Version ID')).toBe(
      'https://tu-amigo-viajero-api.darwin.workers.dev',
    );
    expect(urlDelDespliegue('sin url')).toBeNull();
  });

  it('atrapa claves mal pegadas antes de guardarlas', () => {
    expect(validarClave('SERPAPI_KEY', 'a'.repeat(64))).toBeNull();
    expect(validarClave('SERPAPI_KEY', 'abc')).toMatch(/64/);
    expect(validarClave('SERPAPI_KEY', `${'a'.repeat(32)} ${'a'.repeat(31)}`)).toMatch(/espacios/);
    expect(validarClave('TRAVELPAYOUTS_TOKEN', 'f'.repeat(32))).toBeNull();
    expect(validarClave('TRAVELPAYOUTS_TOKEN', '')).toBeNull();
    expect(validarClave('SERPAPI_KEY', '')).toMatch(/vacía/);
    expect(validarClave('TRAVELPAYOUTS_MARKER', '')).toBeNull();
    expect(validarClave('TRAVELPAYOUTS_MARKER', 'abc')).toMatch(/números/);
  });
});
