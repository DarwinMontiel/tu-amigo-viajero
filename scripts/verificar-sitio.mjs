#!/usr/bin/env node
/*
 * Revisión estática del sitio, sin dependencias.
 *
 * Comprueba en las 4 páginas que:
 *   - no queden enlaces ni recursos locales rotos (href, src y url() de estilos);
 *   - todas las imágenes tengan un texto alternativo descriptivo;
 *   - no quede texto de relleno ni restos en inglés de la plantilla;
 *   - las etiquetas Open Graph apunten al sitio publicado;
 *   - se conserve la atribución CC BY 3.0 de la plantilla;
 * y que cada archivo de images/ se use en alguna parte.
 *
 * Uso: node scripts/verificar-sitio.mjs   (sale con código 1 si encuentra problemas)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PAGINAS = ['index.html', 'destination.html', 'pricing.html', 'contact.html'];
export const URL_SITIO = 'https://darwinmontiel.github.io/tu-amigo-viajero/';

// Texto que no debe volver a aparecer en las páginas (relleno o plantilla en inglés).
const PROHIBIDOS = [
	/lorem ipsum/i, /dignissimos/i, /Your Email/, /value="Submit"/, />\s*Travel\s*</, /Get In Touch/,
	/Happy Customer/, /Send Message/, /Contact Information/, /\/mo</, /Basic customer support/,
	/xxxxx/i, /999-9?999/, /alt="Image"/, /El AMIGO VIAJERO/, /\bHotels\b/, /\bDestination\b</,
	/Subscribete|suscribite/i, /\basesibles?\b/i, /\bacpetar\b/i, /\beligas\b/i
];

function sinConsultaNiAncla(ruta) {
	return ruta.split('#')[0].split('?')[0];
}

function esLocal(ruta) {
	return ruta !== '' && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ruta);
}

function listarArchivos(dir) {
	return readdirSync(dir).flatMap((nombre) => {
		const ruta = join(dir, nombre);
		return statSync(ruta).isDirectory() ? listarArchivos(ruta) : [ruta];
	});
}

/** Devuelve la lista de problemas encontrados (vacía si todo está bien). */
export function verificarSitio(raiz) {
	const problemas = [];
	const referenciados = new Set();
	const anotar = (base, ruta) => {
		const absoluta = normalize(resolve(base, decodeURIComponent(ruta)));
		referenciados.add(absoluta);
		return absoluta;
	};

	for (const pagina of PAGINAS) {
		const html = readFileSync(join(raiz, pagina), 'utf8');

		if (!/<html lang="es(-CO)?">/.test(html)) {
			problemas.push(`${pagina}: falta lang="es-CO" en <html>`);
		}

		const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
		for (const [, atributo, valor] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
			if (valor.startsWith('#') && valor.length > 1 && !ids.has(valor.slice(1))) {
				problemas.push(`${pagina}: el ancla ${valor} no existe en la página`);
			}
			if (!esLocal(valor)) {
				continue;
			}
			const ruta = sinConsultaNiAncla(valor);
			if (ruta === '') {
				continue;
			}
			const absoluta = anotar(raiz, ruta);
			if (!existsSync(absoluta)) {
				problemas.push(`${pagina}: ${atributo}="${valor}" apunta a un archivo que no existe`);
				continue;
			}
			// Anclas hacia otra página del sitio: destination.html#cartagena
			const ancla = valor.split('#')[1];
			if (ancla && ruta.endsWith('.html')) {
				const destino = readFileSync(absoluta, 'utf8');
				if (!destino.includes(`id="${ancla}"`)) {
					problemas.push(`${pagina}: ${valor} apunta a un ancla que no existe`);
				}
			}
		}

		for (const [, ruta] of html.matchAll(/url\(([^)]+)\)/g)) {
			const limpia = ruta.replace(/['"]/g, '');
			if (esLocal(limpia) && !existsSync(anotar(raiz, sinConsultaNiAncla(limpia)))) {
				problemas.push(`${pagina}: url(${limpia}) no existe`);
			}
		}

		for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
			const alt = /\salt="([^"]*)"/.exec(img);
			if (!alt || alt[1].trim().length < 15) {
				problemas.push(`${pagina}: imagen sin texto alternativo descriptivo: ${img}`);
			}
		}

		for (const patron of PROHIBIDOS) {
			if (patron.test(html)) {
				problemas.push(`${pagina}: contiene texto de plantilla o con errores (${patron})`);
			}
		}

		const og = (propiedad) => new RegExp(`<meta property="${propiedad}" content="([^"]*)"`).exec(html)?.[1] ?? '';
		if (!og('og:url').startsWith(URL_SITIO)) {
			problemas.push(`${pagina}: og:url debe apuntar a ${URL_SITIO}`);
		}
		const imagen = og('og:image');
		if (!imagen.startsWith(URL_SITIO) || !existsSync(join(raiz, imagen.slice(URL_SITIO.length)))) {
			problemas.push(`${pagina}: og:image debe ser una imagen publicada del sitio`);
		}

		if (!html.includes('GetTemplates.co') || !html.includes('creativecommons.org/licenses/by/3.0')) {
			problemas.push(`${pagina}: falta la atribución CC BY 3.0 de la plantilla`);
		}
		if (!html.includes('Tu Amigo Viajero<em>.</em>')) {
			problemas.push(`${pagina}: el logo no usa la marca "Tu Amigo Viajero"`);
		}
	}

	// url() dentro de las hojas de estilo enlazadas.
	for (const hoja of listarArchivos(join(raiz, 'css')).filter((r) => r.endsWith('.css'))) {
		const css = readFileSync(hoja, 'utf8');
		for (const [, ruta] of css.matchAll(/url\(([^)]+)\)/g)) {
			const limpia = ruta.replace(/['"]/g, '').trim();
			if (!esLocal(limpia) || limpia.startsWith('data:')) {
				continue;
			}
			const absoluta = anotar(dirname(hoja), sinConsultaNiAncla(limpia));
			if (!existsSync(absoluta) && hoja.endsWith(`${sep}style.css`)) {
				problemas.push(`${relative(raiz, hoja)}: url(${limpia}) no existe`);
			}
		}
	}

	// Que no queden imágenes huérfanas de la plantilla.
	for (const archivo of listarArchivos(join(raiz, 'images'))) {
		if (!referenciados.has(normalize(archivo))) {
			problemas.push(`${relative(raiz, archivo)}: no se usa en ninguna página ni hoja de estilos`);
		}
	}

	return problemas;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const problemas = verificarSitio(raiz);
	if (problemas.length > 0) {
		console.error(`Se encontraron ${problemas.length} problemas:`);
		for (const problema of problemas) {
			console.error(`  - ${problema}`);
		}
		process.exit(1);
	}
	console.log(`Sitio verificado: ${PAGINAS.length} páginas sin enlaces rotos, textos de plantilla ni imágenes huérfanas.`);
}
