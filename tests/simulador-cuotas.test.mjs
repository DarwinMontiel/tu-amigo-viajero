import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../js/simulador-cuotas.js');

test('parsearNumero entiende el formato colombiano', () => {
	assert.equal(S.parsearNumero('1.250.000'), 1250000);
	assert.equal(S.parsearNumero('$ 890.000'), 890000);
	assert.equal(S.parsearNumero('24,5'), 24.5);
	assert.equal(S.parsearNumero('24.5'), 24.5);
	assert.equal(S.parsearNumero('1.250,75'), 1250.75);
	assert.equal(S.parsearNumero('24 %'), 24);
	assert.equal(S.parsearNumero('890000'), 890000);
	assert.ok(Number.isNaN(S.parsearNumero('')));
	assert.ok(Number.isNaN(S.parsearNumero('abc')));
	assert.ok(Number.isNaN(S.parsearNumero('1.2.3')));
	assert.ok(Number.isNaN(S.parsearNumero('-5')));
	assert.ok(Number.isNaN(S.parsearNumero(null)));
});

test('la tasa mensual compuesta doce veces devuelve la tasa efectiva anual', () => {
	const mensual = S.tasaMensualDesdeEA(0.24);
	assert.ok(Math.abs(Math.pow(1 + mensual, 12) - 1.24) < 1e-12);
	assert.ok(Math.abs(mensual - 0.018087582) < 1e-9);
	assert.equal(S.tasaMensualDesdeEA(0), 0);
});

test('cuota fija conocida: 1.000.000 a 12 meses al 1 % mensual', () => {
	assert.equal(Math.round(S.cuotaFija(1000000, 0.01, 12)), 88849);
});

test('sin intereses la cuota es el valor dividido entre el plazo', () => {
	const sim = S.simular(1200000, 12, 0);
	assert.equal(sim.cuota, 100000);
	assert.equal(sim.totalIntereses, 0);
	assert.equal(sim.totalPagado, 1200000);
	assert.ok(sim.tabla.every((fila) => fila.interes === 0));
});

test('la tabla de amortización cierra en saldo cero y cuadra los totales', () => {
	for (const [monto, plazo, tasa] of [[1290000, 12, 0.24], [2150000, 36, 0.3], [490000, 1, 0.18], [420000, 7, 0.0999]]) {
		const sim = S.simular(monto, plazo, tasa);
		assert.equal(sim.tabla.length, plazo);
		assert.equal(sim.tabla.at(-1).saldo, 0, `saldo final para ${monto}/${plazo}`);
		const abonos = sim.tabla.reduce((s, f) => s + f.abono, 0);
		assert.equal(abonos, monto, 'los abonos a capital suman el valor del viaje');
		assert.equal(sim.totalPagado, monto + sim.totalIntereses);
		for (const fila of sim.tabla) {
			assert.equal(fila.cuota, fila.interes + fila.abono);
			assert.ok(Number.isInteger(fila.cuota) && Number.isInteger(fila.saldo), 'valores en pesos enteros');
		}
		// La última cuota solo difiere unos pesos por redondeo.
		assert.ok(Math.abs(sim.tabla.at(-1).cuota - sim.cuota) <= plazo);
	}
});

test('el interés baja y el abono sube mes a mes (sistema francés)', () => {
	const { tabla } = S.simular(1990000, 18, 0.24);
	for (let i = 1; i < tabla.length - 1; i++) {
		assert.ok(tabla[i].interes <= tabla[i - 1].interes);
		assert.ok(tabla[i].abono >= tabla[i - 1].abono);
	}
});

test('valida los datos y responde en español', () => {
	assert.deepEqual(S.validar(1290000, 12, 0.24), {});
	assert.match(S.validar(50000, 12, 0.24).monto, /entre \$100\.000 y \$50\.000\.000/);
	assert.match(S.validar(1290000.5, 12, 0.24).monto, /sin decimales/);
	assert.match(S.validar(Number.NaN, 12, 0.24).monto, /pesos/);
	assert.match(S.validar(1290000, 0, 0.24).plazo, /1 a 36 meses/);
	assert.match(S.validar(1290000, 37, 0.24).plazo, /1 a 36 meses/);
	assert.match(S.validar(1290000, 12, -0.01).tasa, /entre 0 % y 60 %/);
	assert.match(S.validar(1290000, 12, 0.61).tasa, /entre 0 % y 60 %/);
	assert.throws(() => S.simular(0, 12, 0.24), (error) => error instanceof RangeError && 'monto' in error.errores);
});

test('formatea pesos colombianos y porcentajes', () => {
	assert.equal(S.formatearCOP(1250000), '$ 1.250.000');
	assert.equal(S.formatearCOP(999), '$ 999');
	assert.equal(S.formatearCOP(0), '$ 0');
	assert.equal(S.formatearCOP(-15000.4), '-$ 15.000');
	assert.equal(S.formatearPorcentaje(0.018087), '1,81 %');
	assert.equal(S.formatearPorcentaje(0.24, 0), '24 %');
});
