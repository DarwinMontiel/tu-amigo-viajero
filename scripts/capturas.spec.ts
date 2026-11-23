import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));

function fechaEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const BUSQUEDA = `origen=BOG&destino=CTG&ida=${fechaEnDias(20)}&regreso=${fechaEnDias(25)}&adultos=2&moneda=COP`;

/** Lleva la vista al título de resultados y le quita el foco para que la captura no muestre el anillo. */
async function alResultado(page: Page) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    const titulo = document.getElementById('titulo-resultados');
    if (titulo) window.scrollTo({ top: titulo.getBoundingClientRect().top + window.scrollY - 84, behavior: 'instant' });
  });
}

async function tema(page: Page, oscuro: boolean) {
  await page.emulateMedia({ colorScheme: oscuro ? 'dark' : 'light' });
}

test('portada (escritorio, claro)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await tema(page, false);
  await page.goto('/');
  await expect(page.locator('.destacada').first()).toBeVisible();
  await page.screenshot({ path: `${DOCS}portada.png` });
});

test('vista previa para redes (1200×630)', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await tema(page, false);
  await page.goto('/');
  await page.locator('.banner-modo').evaluate((e) => e.remove());
  await page.screenshot({ path: `${DOCS}vista-previa.png` });
});

test('asistente (escritorio, oscuro)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await tema(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: /Playa en diciembre/ }).click();
  await expect(page.getByText('Entendí:')).toBeVisible();
  await page.locator('.asistente').screenshot({ path: `${DOCS}asistente.png` });
});

test('vuelos con vendedores (escritorio, claro)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await tema(page, false);
  await page.goto(`/vuelos?${BUSQUEDA}`);
  await page.getByRole('button', { name: '¿Dónde lo compro más barato?' }).first().click();
  await expect(page.getByRole('list', { name: /Vendedores/ })).toBeVisible();
  await alResultado(page);
  await page.screenshot({ path: `${DOCS}vuelos.png` });
});

test('paquetes (escritorio, oscuro)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await tema(page, true);
  await page.goto(`/paquetes?${BUSQUEDA}&presupuesto=3000000`);
  await expect(page.getByText('Recomendación de tu amigo viajero')).toBeVisible();
  await alResultado(page);
  await page.screenshot({ path: `${DOCS}paquetes.png` });
});

test('compromiso en celular (375 px, oscuro)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await tema(page, true);
  await page.goto('/compromiso');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${DOCS}compromiso.png` });
});

test('hoteles en celular (375 px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await tema(page, false);
  await page.goto(`/hoteles?${BUSQUEDA}`);
  await expect(page.locator('li.plataforma').first()).toBeVisible();
  await alResultado(page);
  await page.screenshot({ path: `${DOCS}celular.png` });
});
