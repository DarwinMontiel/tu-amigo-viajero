/**
 * Activa los datos en vivo de Tu Amigo Viajero en un solo comando:
 *
 *   npm run activar
 *
 * 1. Inicia sesión en Cloudflare (si hace falta).
 * 2. Crea el KV para la caché y la cuota compartidas, y lo anota en wrangler.toml.
 * 3. Pide las claves de SerpApi y Travelpayouts, revisa su forma y las guarda
 *    como secretos del Worker (nunca en archivos ni en el repositorio).
 * 4. Despliega la API y comprueba /api/salud.
 * 5. Si `gh` está disponible, guarda API_URL en el repositorio y vuelve a
 *    publicar la web, que pasa de modo demo a datos en vivo.
 *
 * No hace nada que cueste dinero: todo usa planes gratuitos.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { activarKvEnToml, idDeKv, tieneKv, urlDelDespliegue, validarClave } from './activar-lib.ts';

const API = fileURLToPath(new URL('../apps/api/', import.meta.url));
const TOML = `${API}wrangler.toml`;
const REPO = 'DarwinMontiel/tu-amigo-viajero';
// Wrangler se ejecuta con el mismo Node, sin pasar por la shell (más seguro y sin avisos en Windows).
const WRANGLER = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));

function ejecutar(comando: string, args: string[], opciones: { entrada?: string; mostrar?: boolean } = {}) {
  const r = spawnSync(comando, args, {
    cwd: API,
    encoding: 'utf8',
    input: opciones.entrada,
    stdio: opciones.mostrar ? 'inherit' : ['pipe', 'pipe', 'pipe'],
  });
  return { ok: r.status === 0, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const wrangler = (args: string[], opciones?: { entrada?: string; mostrar?: boolean }) => ejecutar(process.execPath, [WRANGLER, ...args], opciones);

function paso(n: number, texto: string) {
  console.log(`\n\x1b[1m${n}. ${texto}\x1b[0m`);
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const preguntar = async (texto: string) => (await rl.question(texto)).trim();

  console.log('Tu Amigo Viajero · activar datos en vivo (todo con planes gratuitos)');

  paso(1, 'Sesión en Cloudflare');
  if (!wrangler(['whoami']).salida.includes('You are logged in')) {
    console.log('Se abrirá el navegador para que inicies sesión en Cloudflare.');
    if (!wrangler(['login'], { mostrar: true }).ok) throw new Error('No se pudo iniciar sesión en Cloudflare.');
  }
  console.log('✓ Sesión lista.');

  paso(2, 'Caché y cuota compartidas (KV)');
  const toml = readFileSync(TOML, 'utf8');
  if (tieneKv(toml)) {
    console.log('✓ El KV ya estaba configurado.');
  } else {
    const r = wrangler(['kv', 'namespace', 'create', 'CACHE']);
    const id = idDeKv(r.salida);
    if (!id) throw new Error(`No se pudo crear el KV:\n${r.salida}`);
    writeFileSync(TOML, activarKvEnToml(toml, id));
    console.log(`✓ KV creado (${id}) y anotado en apps/api/wrangler.toml.`);
  }

  paso(3, 'Claves de las fuentes de precios');
  const pedirClave = async (nombre: 'SERPAPI_KEY' | 'TRAVELPAYOUTS_TOKEN' | 'TRAVELPAYOUTS_MARKER', ayuda: string) => {
    for (;;) {
      const valor = await preguntar(`${ayuda}: `);
      const error = validarClave(nombre, valor);
      if (!error) return valor;
      console.log(`  ✗ ${error}`);
      // El formato puede cambiar algún día: si solo difiere la forma, se puede usar igual.
      if (/hexadecimales/.test(error) && (await preguntar('  ¿Usarla de todos modos? (s/n): ')).toLowerCase() === 's') return valor;
    }
  };
  const secretos: Array<[string, string]> = [
    ['SERPAPI_KEY', await pedirClave('SERPAPI_KEY', 'Clave de SerpApi (serpapi.com → Dashboard → Your Private API Key)')],
  ];
  const tokenTp = await pedirClave('TRAVELPAYOUTS_TOKEN', 'Token de Travelpayouts (opcional: Enter para omitir; suma Aviasales y ofertas del Inicio)');
  if (tokenTp) {
    secretos.push(['TRAVELPAYOUTS_TOKEN', tokenTp]);
    const marcador = await pedirClave('TRAVELPAYOUTS_MARKER', 'Partner ID de Travelpayouts (opcional, Enter para omitir)');
    if (marcador) secretos.push(['TRAVELPAYOUTS_MARKER', marcador]);
  } else {
    console.log('  Sin Travelpayouts: los vuelos usan Google Flights y el Inicio muestra destinos para comparar.');
  }
  rl.close();

  for (const [nombre, valor] of secretos) {
    // El valor va por la entrada estándar: no queda en el historial ni en archivos.
    const r = wrangler(['secret', 'put', nombre], { entrada: `${valor}\n` });
    if (!r.ok && !r.salida.includes('Success')) throw new Error(`No se pudo guardar ${nombre}:\n${r.salida}`);
    console.log(`✓ ${nombre} guardado como secreto del Worker.`);
  }

  paso(4, 'Despliegue de la API');
  const despliegue = wrangler(['deploy']);
  const url = urlDelDespliegue(despliegue.salida);
  if (!despliegue.ok || !url) throw new Error(`El despliegue falló:\n${despliegue.salida}`);
  console.log(`✓ API publicada en ${url}`);
  const salud = (await (await fetch(`${url}/api/salud`)).json()) as { modo?: string; fuentes?: Record<string, boolean> };
  console.log(`✓ /api/salud → modo ${salud.modo}, fuentes ${JSON.stringify(salud.fuentes)}`);

  paso(5, 'Conectar la web publicada con la API');
  const gh = ejecutar('gh', ['variable', 'set', 'API_URL', '--repo', REPO, '--body', url]);
  if (gh.ok && ejecutar('gh', ['workflow', 'run', 'pages.yml', '--repo', REPO]).ok) {
    console.log('✓ API_URL guardada en GitHub y la web se está publicando de nuevo (1-2 minutos).');
  } else {
    console.log(`Falta un paso manual: en GitHub, Settings → Secrets and variables → Actions → Variables, crea API_URL = ${url}`);
    console.log('y vuelve a ejecutar el flujo «Publicar en GitHub Pages».');
  }
  console.log('\nListo. Si cambiaste apps/api/wrangler.toml, haz commit de ese archivo (el id del KV no es secreto).');
}

main().catch((e: unknown) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
