/*
 * Validación y estados de los formularios del sitio (registro, suscripción y
 * contacto).
 *
 * El sitio es estático: ningún formulario envía ni guarda datos. Al enviar se
 * valida en el navegador y se muestra un mensaje en español que lo dice con
 * claridad. Las funciones de validación no tocan el DOM, así que se prueban
 * con `node --test`.
 */
(function (raiz, fabrica) {
	'use strict';
	var api = fabrica();
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	} else {
		raiz.Formularios = api;
		if (raiz.document) {
			raiz.document.addEventListener('DOMContentLoaded', function () {
				api.iniciar(raiz.document);
			});
		}
	}
}(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

	function texto(valor) {
		return typeof valor === 'string' ? valor.trim() : '';
	}

	function esCorreoValido(correo) {
		return PATRON_CORREO.test(texto(correo));
	}

	/**
	 * Convierte "dd/mm/aaaa" en una fecha local. Devuelve null si el texto no
	 * tiene ese formato o la fecha no existe (por ejemplo, 31/02/2027).
	 */
	function parsearFecha(valor) {
		var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto(valor));
		if (!m) {
			return null;
		}
		var dia = Number(m[1]);
		var mes = Number(m[2]) - 1;
		var anio = Number(m[3]);
		var fecha = new Date(anio, mes, dia);
		if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes || fecha.getDate() !== dia) {
			return null;
		}
		return fecha;
	}

	function inicioDelDia(fecha) {
		return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
	}

	/** Formulario de registro de la portada. `hoy` se puede inyectar en las pruebas. */
	function validarRegistro(datos, hoy) {
		var errores = {};
		var nombre = texto(datos.nombre);
		if (nombre.length < 2) {
			errores.nombre = 'Escribe tu nombre.';
		}
		if (!texto(datos.destino)) {
			errores.destino = 'Elige un destino.';
		}
		var fecha = parsearFecha(datos.fecha);
		if (!fecha) {
			errores.fecha = 'Elige la fecha de viaje en formato dd/mm/aaaa.';
		} else if (fecha < inicioDelDia(hoy || new Date())) {
			errores.fecha = 'La fecha de viaje no puede estar en el pasado.';
		}
		return errores;
	}

	function validarSuscripcion(datos) {
		return esCorreoValido(datos.correo) ? {} : { correo: 'Escribe un correo válido, por ejemplo nombre@correo.com.' };
	}

	function validarContacto(datos) {
		var errores = {};
		if (texto(datos.nombre).length < 2) {
			errores.nombre = 'Escribe tu nombre.';
		}
		if (!esCorreoValido(datos.correo)) {
			errores.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
		}
		if (texto(datos.mensaje).length < 10) {
			errores.mensaje = 'Cuéntanos un poco más: el mensaje debe tener al menos 10 caracteres.';
		}
		return errores;
	}

	var VALIDADORES = {
		registro: {
			validar: validarRegistro,
			exito: function (datos) {
				return '¡Listo, ' + texto(datos.nombre).split(' ')[0] + '! Así se vería tu solicitud para ' + datos.destinoTexto +
					'. Este sitio es una demostración académica: no enviamos ni guardamos tus datos.';
			}
		},
		suscripcion: {
			validar: validarSuscripcion,
			exito: function () {
				return '¡Gracias! En un sitio real te llegarían nuestras promociones. Esta es una demostración: no guardamos tu correo.';
			}
		},
		contacto: {
			validar: validarContacto,
			exito: function (datos) {
				return 'Gracias, ' + texto(datos.nombre).split(' ')[0] + '. Tu mensaje está listo, pero este sitio es una demostración académica y no lo envía a ningún lado.';
			}
		}
	};

	/* ---------- Navegador ---------- */

	function leerDatos(formulario) {
		var datos = {};
		var campos = formulario.querySelectorAll('[data-campo]');
		for (var i = 0; i < campos.length; i++) {
			var campo = campos[i];
			datos[campo.getAttribute('data-campo')] = campo.value;
			if (campo.tagName === 'SELECT' && campo.selectedIndex >= 0) {
				datos[campo.getAttribute('data-campo') + 'Texto'] = campo.options[campo.selectedIndex].text;
			}
		}
		return datos;
	}

	function mostrarEstado(formulario, tipo, mensaje) {
		var estado = formulario.querySelector('.estado-formulario');
		if (!estado) {
			return;
		}
		estado.className = 'estado-formulario estado-' + tipo;
		estado.textContent = mensaje;
	}

	function marcarCampos(formulario, errores) {
		var campos = formulario.querySelectorAll('[data-campo]');
		for (var i = 0; i < campos.length; i++) {
			var nombre = campos[i].getAttribute('data-campo');
			if (errores[nombre]) {
				campos[i].setAttribute('aria-invalid', 'true');
			} else {
				campos[i].removeAttribute('aria-invalid');
			}
		}
	}

	function iniciar(documento) {
		var formularios = documento.querySelectorAll('form[data-formulario]');
		for (var i = 0; i < formularios.length; i++) {
			formularios[i].setAttribute('novalidate', '');
			formularios[i].addEventListener('submit', function (evento) {
				evento.preventDefault();
				var formulario = evento.currentTarget;
				var config = VALIDADORES[formulario.getAttribute('data-formulario')];
				if (!config) {
					return;
				}
				var datos = leerDatos(formulario);
				var errores = config.validar(datos);
				marcarCampos(formulario, errores);
				var claves = Object.keys(errores);
				if (claves.length > 0) {
					mostrarEstado(formulario, 'error', claves.map(function (c) { return errores[c]; }).join(' '));
					var primero = formulario.querySelector('[data-campo="' + claves[0] + '"]');
					if (primero) {
						primero.focus();
					}
					return;
				}
				mostrarEstado(formulario, 'exito', config.exito(datos));
				formulario.reset();
			});
		}
	}

	return {
		esCorreoValido: esCorreoValido,
		parsearFecha: parsearFecha,
		validarRegistro: validarRegistro,
		validarSuscripcion: validarSuscripcion,
		validarContacto: validarContacto,
		iniciar: iniciar
	};
}));
