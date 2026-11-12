import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const F = require('../js/formularios.js');

const HOY = new Date(2026, 10, 12); // 12 de noviembre de 2026

test('reconoce correos válidos e inválidos', () => {
	assert.ok(F.esCorreoValido('gloria@correo.com'));
	assert.ok(F.esCorreoValido('  ana.perez@ejemplo.com.co '));
	assert.ok(!F.esCorreoValido('gloria@correo'));
	assert.ok(!F.esCorreoValido('sin-arroba.com'));
	assert.ok(!F.esCorreoValido(''));
	assert.ok(!F.esCorreoValido(undefined));
});

test('parsea fechas dd/mm/aaaa y rechaza fechas que no existen', () => {
	const fecha = F.parsearFecha('15/01/2027');
	assert.equal(fecha.getFullYear(), 2027);
	assert.equal(fecha.getMonth(), 0);
	assert.equal(fecha.getDate(), 15);
	assert.equal(F.parsearFecha('31/02/2027'), null);
	assert.equal(F.parsearFecha('2027-01-15'), null);
	assert.equal(F.parsearFecha('1/1/2027'), null);
});

test('registro: válido con nombre, destino y fecha futura', () => {
	assert.deepEqual(F.validarRegistro({ nombre: 'Gloria', destino: 'cartagena', fecha: '20/12/2026' }, HOY), {});
	assert.deepEqual(F.validarRegistro({ nombre: 'Gloria', destino: 'cartagena', fecha: '12/11/2026' }, HOY), {}, 'hoy es válido');
});

test('registro: errores en español por cada campo', () => {
	const errores = F.validarRegistro({ nombre: ' ', destino: '', fecha: '01/01/2020' }, HOY);
	assert.equal(errores.nombre, 'Escribe tu nombre.');
	assert.equal(errores.destino, 'Elige un destino.');
	assert.match(errores.fecha, /pasado/);
	assert.match(F.validarRegistro({ nombre: 'Ana', destino: 'guatape', fecha: 'mañana' }, HOY).fecha, /dd\/mm\/aaaa/);
});

test('suscripción y contacto', () => {
	assert.deepEqual(F.validarSuscripcion({ correo: 'mateo@correo.com' }), {});
	assert.match(F.validarSuscripcion({ correo: 'mateo' }).correo, /correo válido/);
	assert.deepEqual(F.validarContacto({ nombre: 'Mateo', correo: 'mateo@correo.com', mensaje: 'Quiero ir a Caño Cristales en septiembre.' }), {});
	const errores = F.validarContacto({ nombre: '', correo: 'x', mensaje: 'Hola' });
	assert.deepEqual(Object.keys(errores).sort(), ['correo', 'mensaje', 'nombre']);
	assert.match(errores.mensaje, /al menos 10 caracteres/);
});
