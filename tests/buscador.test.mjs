import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const B = require('../js/buscador.js');

const HOY = new Date(2026, 10, 23); // 23 de noviembre de 2026
const BASE = { origen: 'bog', destino: 'CTG', ida: '2026-12-10', regreso: '2026-12-15', adultos: '2' };

test('valida y normaliza una búsqueda correcta', () => {
	const { datos, errores } = B.validar(BASE, HOY);
	assert.deepEqual(errores, {});
	assert.equal(datos.origen, 'BOG');
	assert.equal(datos.adultos, 2);
	assert.equal(datos.alojamiento, 'Cartagena de Indias');
});

test('rechaza destino igual al origen, fechas pasadas o invertidas y adultos fuera de rango', () => {
	const { errores } = B.validar({ origen: 'BOG', destino: 'bog', ida: '2026-11-01', regreso: '2026-10-30', adultos: '0' }, HOY);
	assert.match(errores.destino, /distinto/);
	assert.match(errores.ida, /pasado/);
	assert.match(errores.regreso, /después/);
	assert.match(errores.adultos, /entre 1 y 9/);
	assert.match(B.validar({ ...BASE, regreso: '2026-12-01' }, HOY).errores.regreso, /después/);
	assert.match(B.validar({ ...BASE, ida: '2026-02-31' }, HOY).errores.ida, /fecha de ida/);
	assert.match(B.validar({ ...BASE, ida: '2027-12-01', regreso: '' }, HOY).errores.ida, /11 meses/);
	assert.match(B.validar({ ...BASE, origen: 'Bogotá' }, HOY).errores.origen, /lista/);
});

test('arma las búsquedas de ida y vuelta en cada página', () => {
	const { datos } = B.validar(BASE, HOY);
	const e = B.construirEnlaces(datos);
	const url = (lista, id) => lista.find((x) => x.id === id).url;
	assert.equal(url(e.vuelos, 'despegar'), 'https://www.despegar.com.co/shop/flights/results/roundtrip/BOG/CTG/2026-12-10/2026-12-15/2/0/0');
	assert.equal(url(e.vuelos, 'kayak'), 'https://www.kayak.com.co/flights/BOG-CTG/2026-12-10/2026-12-15/2adults?sort=bestflight_a');
	assert.match(url(e.vuelos, 'skyscanner'), /\/vuelos\/bog\/ctg\/261210\/261215\/\?adultsv2=2&cabinclass=economy&rtn=1$/);
	assert.match(decodeURIComponent(url(e.vuelos, 'google')), /Flights to CTG from BOG on 2026-12-10 through 2026-12-15/);
	const booking = new URL(url(e.alojamiento, 'booking'));
	assert.equal(booking.searchParams.get('ss'), 'Cartagena de Indias');
	assert.equal(booking.searchParams.get('checkout'), '2026-12-15');
	assert.equal(booking.searchParams.get('group_adults'), '2');
	assert.equal(url(e.alojamiento, 'airbnb'), 'https://www.airbnb.com.co/s/Cartagena-de-Indias/homes?checkin=2026-12-10&checkout=2026-12-15&adults=2');
	assert.equal(e.noches, 5);
});

test('solo ida: vuelos de un trayecto y hotel por una noche', () => {
	const { datos } = B.validar({ ...BASE, regreso: '', alojamiento: 'Guatapé, Antioquia', destino: 'MDE' }, HOY);
	const e = B.construirEnlaces(datos);
	assert.match(e.vuelos[0].url, /\/oneway\/BOG\/MDE\/2026-12-10\/2\/0\/0$/);
	assert.match(e.vuelos[2].url, /\/BOG-MDE\/2026-12-10\/2adults/);
	assert.match(e.vuelos[3].url, /\/261210\/\?.*rtn=0/);
	assert.equal(e.checkout, '2026-12-11');
	assert.match(e.alojamiento[1].url, /\/s\/Guatap%C3%A9--Antioquia\/homes/);
});

test('cada destino del sitio tiene aeropuerto conocido y el clima se describe en español', () => {
	for (const [slug, d] of Object.entries(B.DESTINOS_SITIO)) {
		assert.ok(B.LUGARES[d.iata], `${slug}: ${d.iata} no está en LUGARES`);
	}
	assert.equal(B.describirClima(0), 'Despejado');
	assert.equal(B.describirClima(63), 'Lluvia');
	assert.equal(B.describirClima(95), 'Tormenta');
});
