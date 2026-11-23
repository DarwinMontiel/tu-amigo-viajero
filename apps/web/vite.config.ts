import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * GitHub Pages no sabe de rutas de una SPA: copiar index.html como 404.html
 * hace que /tu-amigo-viajero/vuelos?... cargue la app y el enrutador resuelva.
 */
function respaldo404(): Plugin {
  return {
    name: 'respaldo-404-github-pages',
    apply: 'build',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/tu-amigo-viajero/') : '/',
  plugins: [react(), respaldo404()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
