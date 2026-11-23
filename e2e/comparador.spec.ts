import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Fecha de ida dentro del rango válido sin depender del día en que corra el CI. */
function fechaEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const IDA = fechaEnDias(20);
const REGRESO = fechaEnDias(25);
const BUSQUEDA = `origen=BOG&destino=CTG&ida=${IDA}&regreso=${REGRESO}&adultos=2&moneda=COP`;

async function sinViolacionesAxe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const resumen = r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(resumen).toEqual([]);
}

async function sinScrollHorizontal(page: Page) {
  const anchos = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(anchos.documento).toBeLessThanOrEqual(anchos.vista);
}

/** Precios mostrados en una tarjeta de plataforma, como números. */
async function preciosDe(page: Page, plataforma: string): Promise<number[]> {
  const tarjeta = page.locator('li.plataforma', { has: page.getByRole('heading', { name: plataforma, exact: true }) });
  await expect(tarjeta.locator('.oferta').first()).toBeVisible();
  const textos = await tarjeta.locator('.oferta__precio strong').allTextContents();
  return textos.map((t) => Number(t.replace(/[^\d]/g, '')));
}

test.describe('Inicio', () => {
  test('presenta el comparador, el asistente y las ofertas de ejemplo', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tu Amigo Viajero/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Busca una vez');
    await expect(page.getByText('Modo demo', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /vuelos más baratos desde Bogotá/ })).toBeVisible();
    await expect(page.locator('.destacada').first()).toBeVisible();
    await sinScrollHorizontal(page);
  });

  test('el asistente entiende un pedido y lleva a los paquetes con recomendación', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Describe tu viaje' }).fill('Playa saliendo de Medellín con mi pareja, máximo 3 millones, una semana');
    await page.getByRole('button', { name: 'Planear' }).click();
    await expect(page.getByText('Entendí:')).toBeVisible();
    await page.getByRole('button', { name: 'Comparar precios' }).click();
    await expect(page).toHaveURL(/\/paquetes\?.*origen=MDE.*presupuesto=3000000/);
    await expect(page.getByText('Recomendación de tu amigo viajero')).toBeVisible();
    await expect(page.getByText(/presupuesto/).first()).toBeVisible();
  });

  test('el filtro de presupuesto reduce las ofertas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Exterior' }).click();
    await expect(page.locator('.destacada').first()).toBeVisible();
    const antes = await page.locator('.destacada').count();
    await page.getByRole('slider', { name: /presupuesto/ }).fill('1500000');
    await expect.poll(() => page.locator('.destacada').count()).toBeLessThan(antes);
  });

  test('sin violaciones de accesibilidad en tema claro y oscuro', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.destacada').first()).toBeVisible();
    await sinViolacionesAxe(page);
    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await sinViolacionesAxe(page);
  });
});

test.describe('Vuelos', () => {
  test('muestra como máximo 3 precios por plataforma, de menor a mayor, con enlaces reales', async ({ page }) => {
    await page.goto(`/vuelos?${BUSQUEDA}`);
    await expect(page.getByRole('heading', { name: /Bogotá → Cartagena/ })).toBeVisible();
    for (const plataforma of ['Google Flights', 'Aviasales']) {
      const precios = await preciosDe(page, plataforma);
      expect(precios.length).toBeGreaterThan(0);
      expect(precios.length).toBeLessThanOrEqual(3);
      expect(precios).toEqual([...precios].sort((a, b) => a - b));
    }
    const despegar = page.getByRole('link', { name: /Buscar en Despegar/ });
    await expect(despegar).toHaveAttribute('href', `https://www.despegar.com.co/shop/flights/results/roundtrip/BOG/CTG/${IDA}/${REGRESO}/2/0/0`);
    await expect(despegar).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: /Ver en Aviasales/ }).first()).toHaveAttribute('href', /^https:\/\/www\.aviasales\.com\/search\/BOG/);
  });

  test('«¿Dónde lo compro?» lista vendedores ordenados por precio', async ({ page }) => {
    await page.goto(`/vuelos?${BUSQUEDA}`);
    await page.getByRole('button', { name: '¿Dónde lo compro más barato?' }).first().click();
    const lista = page.getByRole('list', { name: /Vendedores de este vuelo/ });
    await expect(lista).toBeVisible();
    const precios = (await lista.locator('strong').allTextContents()).map((t) => Number(t.replace(/[^\d]/g, '')));
    expect(precios.length).toBeGreaterThan(2);
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });

  test('valida el formulario con mensajes claros', async ({ page }) => {
    await page.goto('/vuelos');
    await page.getByRole('button', { name: 'Comparar vuelos' }).click();
    await expect(page.getByText('Elige el destino de la lista.')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Hacia' })).toHaveAttribute('aria-invalid', 'true');
  });

  test('una ruta sin datos de ejemplo conserva los enlaces a las plataformas', async ({ page }) => {
    await page.goto(`/vuelos?origen=BOG&destino=LIM&ida=${IDA}&adultos=1&moneda=COP`);
    await expect(page.getByText(/En el modo demo hay vuelos de ejemplo solo para/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Buscar en Kayak/ })).toHaveAttribute('href', /kayak\.com\.co\/flights\/BOG-LIM/);
  });

  test('sin violaciones de accesibilidad con resultados', async ({ page }) => {
    await page.goto(`/vuelos?${BUSQUEDA}`);
    await expect(page.locator('li.plataforma').first()).toBeVisible();
    await sinViolacionesAxe(page);
    await sinScrollHorizontal(page);
  });
});

test.describe('Hoteles y paquetes', () => {
  test('busca hoteles eligiendo el destino en el autocompletado', async ({ page }) => {
    await page.goto('/hoteles');
    const destino = page.getByRole('combobox', { name: '¿A dónde vas?' });
    await destino.fill('Cartag');
    await page.getByRole('option', { name: /Cartagena/ }).first().click();
    await page.getByRole('button', { name: 'Comparar hoteles' }).click();
    await expect(page).toHaveURL(/\/hoteles\?destino=CTG/);
    await expect(page.getByRole('heading', { name: 'Booking.com', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Airbnb', exact: true })).toBeVisible();
    const precios = await preciosDe(page, 'Booking.com');
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
    await sinViolacionesAxe(page);
  });

  test('paquetes suma vuelo y hotel y muestra el desglose', async ({ page }) => {
    await page.goto(`/paquetes?${BUSQUEDA}`);
    const desglose = page.getByRole('group', { name: 'Desglose del paquete' }).first();
    await expect(desglose).toBeVisible();
    const [vuelo, hotel] = (await desglose.locator('strong').allTextContents()).map((t) => Number(t.replace(/[^\d]/g, '')));
    const total = Number((await page.locator('.oferta__precio strong').first().textContent())?.replace(/[^\d]/g, ''));
    expect(total).toBe((vuelo ?? 0) + (hotel ?? 0));
    await expect(page.getByRole('link', { name: /Buscar en Despegar: paquetes/ })).toBeVisible();
  });
});

test.describe('Servicio para la comunidad', () => {
  test('el compromiso es público, claro y accesible', async ({ page }) => {
    await page.goto('/compromiso');
    await expect(page.getByRole('heading', { level: 1, name: 'Por qué existe Tu Amigo Viajero' })).toBeVisible();
    for (const titulo of ['Gratis, sin registro y sin publicidad', 'Ordenado solo por precio', 'Si algún enlace nos da comisión, lo decimos']) {
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    }
    await sinViolacionesAxe(page);
    await sinScrollHorizontal(page);
  });

  test('los resultados aconsejan cuándo comprar y avisan impuestos y maleta', async ({ page }) => {
    await page.goto(`/vuelos?${BUSQUEDA}`);
    await expect(page.getByText('¿Conviene comprar ahora?')).toBeVisible();
    await expect(page.locator('#titulo-consejo')).not.toBeEmpty();
    await expect(page.getByText('Impuestos incluidos').first()).toBeVisible();
    await expect(page.getByText(/Bajo costo: la maleta de bodega/).first()).toBeVisible();
    await expect(page.getByText(/Ordenadas solo por precio/)).toBeVisible();
  });

  test('paquetes compara contra comprar por separado', async ({ page }) => {
    await page.goto(`/paquetes?${BUSQUEDA}`);
    const tarjeta = page.getByRole('region', { name: '¿Paquete o por separado?' });
    await expect(tarjeta).toBeVisible();
    const total = (await page.locator('.dato--destacado strong').textContent()) ?? '';
    await expect(tarjeta).toContainText(total.trim());
  });

  test('letra grande y ahorro de datos se recuerdan y ahorran descargas', async ({ page }) => {
    await page.goto('/');
    const tamano = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const antes = await tamano();
    await page.getByRole('button', { name: 'Letra grande' }).click();
    expect(await tamano()).toBeGreaterThan(antes);

    await page.goto('/compromiso');
    await page.getByLabel(/Ahorrar datos/).check();
    await page.goto('/');
    await expect(page.locator('.heroe__ilustracion')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Letra grande' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Navegación y contacto', () => {
  test('contacto solo ofrece LinkedIn y GitHub, sin datos sensibles', async ({ page }) => {
    await page.goto('/contacto');
    await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', /linkedin\.com\/in\//);
    await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/DarwinMontiel');
    const texto = (await page.locator('main').textContent()) ?? '';
    expect(texto).not.toMatch(/tel[eé]fono|\+57|calle|carrera \d|@gmail/i);
    await expect(page.getByText(/Andrés, Jhon y Martín/).first()).toBeVisible();
    await sinViolacionesAxe(page);
  });

  test('las rutas funcionan al entrar directo y hay página 404', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');
    await expect(page.getByRole('heading', { name: 'Esta ruta no existe' })).toBeVisible();
    await page.getByRole('link', { name: 'Ir al inicio', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('el menú del celular abre y navega', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Solo en celular');
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Hoteles' }).click();
    await expect(page).toHaveURL(/\/hoteles$/);
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('el tema elegido se recuerda al recargar', async ({ page }) => {
    await page.goto('/');
    const inicial = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(inicial);
  });
});
