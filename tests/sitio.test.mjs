import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verificarSitio, PAGINAS } from '../scripts/verificar-sitio.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('el sitio publicado no tiene problemas', () => {
	assert.deepEqual(verificarSitio(RAIZ), []);
});

test('el verificador detecta relleno, enlaces rotos, alt pobres e imágenes huérfanas', (t) => {
	const copia = mkdtempSync(join(tmpdir(), 'tav-'));
	t.after(() => rmSync(copia, { recursive: true, force: true }));
	for (const carpeta of ['css', 'images', 'docs', 'fonts']) {
		cpSync(join(RAIZ, carpeta), join(copia, carpeta), { recursive: true });
	}
	for (const pagina of PAGINAS) {
		cpSync(join(RAIZ, pagina), join(copia, pagina));
	}
	mkdirSync(join(copia, 'images', 'viejas'));
	writeFileSync(join(copia, 'images', 'viejas', 'sobrante.jpg'), '');
	writeFileSync(join(copia, 'contact.html'),
		'<html lang="es-CO"><body><p>Dignissimos asperiores</p><img src="no-existe.jpg" alt="Image"><a href="#nada">x</a></body></html>');

	const problemas = verificarSitio(copia).join('\n');
	assert.match(problemas, /contact\.html: contiene texto de plantilla/);
	assert.match(problemas, /no-existe\.jpg" apunta a un archivo que no existe/);
	assert.match(problemas, /imagen sin texto alternativo descriptivo/);
	assert.match(problemas, /el ancla #nada no existe/);
	assert.match(problemas, /sobrante\.jpg: no se usa/);
	assert.match(problemas, /falta la atribución CC BY 3\.0/);
	assert.match(problemas, /og:url debe apuntar/);
});
