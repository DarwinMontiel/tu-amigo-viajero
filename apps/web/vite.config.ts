import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const RUTAS = ['vuelos', 'hoteles', 'paquetes', 'compromiso', 'contacto'];

/**
 * GitHub Pages no sabe de rutas de una SPA. Cada ruta conocida recibe su
 * propio index.html (responde 200, bueno para compartir enlaces) y 404.html
 * cubre cualquier otra para que el enrutador muestre «Esta ruta no existe».
 */
function rutasGithubPages(): Plugin {
  return {
    name: 'rutas-github-pages',
    apply: 'build',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      const indice = resolve(dist, 'index.html');
      copyFileSync(indice, resolve(dist, '404.html'));
      for (const ruta of RUTAS) {
        mkdirSync(resolve(dist, ruta), { recursive: true });
        copyFileSync(indice, resolve(dist, ruta, 'index.html'));
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/tu-amigo-viajero/') : '/',
  plugins: [react(), rutasGithubPages()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
