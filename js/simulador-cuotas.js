/*
 * Simulador "Viaja ahora, paga a cuotas".
 *
 * Calcula una cuota fija mensual (sistema francés) a partir del valor del
 * paquete, el plazo en meses y una tasa efectiva anual (E.A.), y arma la tabla
 * de amortización en pesos colombianos enteros.
 *
 * Es JavaScript puro, sin dependencias: en el navegador queda disponible como
 * `window.SimuladorCuotas` y en Node se importa como módulo CommonJS, lo que
 * permite probarlo con `node --test`.
 *
 * Simulación con fines académicos: no es una oferta de crédito.
 */
(function (raiz, fabrica) {
	'use strict';
	var api = fabrica();
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	} else {
		raiz.SimuladorCuotas = api;
	}
}(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var LIMITES = Object.freeze({
		montoMinimo: 100000,
		montoMaximo: 50000000,
		plazoMinimo: 1,
		plazoMaximo: 36,
		tasaMaximaEA: 0.6
	});

	/**
	 * Convierte un texto escrito al estilo colombiano en número.
	 * "1.250.000" -> 1250000, "24,5" -> 24.5, "$ 890.000" -> 890000.
	 * Devuelve NaN si el texto no es un número.
	 */
	function parsearNumero(texto) {
		if (typeof texto === 'number') {
			return texto;
		}
		if (typeof texto !== 'string') {
			return NaN;
		}
		var limpio = texto.replace(/[\s$ %]/g, '');
		if (limpio === '' || !/^[0-9.,]+$/.test(limpio)) {
			return NaN;
		}
		if (limpio.indexOf(',') !== -1) {
			// Con coma decimal, los puntos solo pueden separar miles: "1.250,5".
			if (!/^\d{1,3}(\.\d{3})*,\d+$/.test(limpio) && !/^\d+,\d+$/.test(limpio)) {
				return NaN;
			}
			return Number(limpio.replace(/\./g, '').replace(',', '.'));
		}
		if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
			// "1.250.000": puntos de miles.
			return Number(limpio.replace(/\./g, ''));
		}
		// "24.5" o "890000": número simple, el punto (si hay uno) es decimal.
		return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : NaN;
	}

	/** Tasa mensual equivalente a una tasa efectiva anual (ambas en decimal). */
	function tasaMensualDesdeEA(tasaEA) {
		return Math.pow(1 + tasaEA, 1 / 12) - 1;
	}

	/** Cuota fija del sistema francés, sin redondear. */
	function cuotaFija(monto, tasaMensual, plazoMeses) {
		if (tasaMensual === 0) {
			return monto / plazoMeses;
		}
		return monto * tasaMensual / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
	}

	/**
	 * Revisa los datos de entrada. Devuelve un objeto { campo: mensaje } con los
	 * errores encontrados; si no hay errores, el objeto queda vacío.
	 */
	function validar(monto, plazoMeses, tasaEA) {
		var errores = {};
		if (!Number.isFinite(monto) || Math.round(monto) !== monto) {
			errores.monto = 'Escribe el valor del viaje en pesos, sin decimales.';
		} else if (monto < LIMITES.montoMinimo || monto > LIMITES.montoMaximo) {
			errores.monto = 'El valor debe estar entre $100.000 y $50.000.000.';
		}
		if (!Number.isInteger(plazoMeses) || plazoMeses < LIMITES.plazoMinimo || plazoMeses > LIMITES.plazoMaximo) {
			errores.plazo = 'El plazo debe ser de 1 a 36 meses.';
		}
		if (!Number.isFinite(tasaEA) || tasaEA < 0 || tasaEA > LIMITES.tasaMaximaEA) {
			errores.tasa = 'La tasa efectiva anual debe estar entre 0 % y 60 %.';
		}
		return errores;
	}

	/**
	 * Arma la simulación completa.
	 * @param {number} monto      Valor del viaje en pesos (entero).
	 * @param {number} plazoMeses Número de cuotas mensuales.
	 * @param {number} tasaEA     Tasa efectiva anual en decimal (0.24 = 24 % E.A.).
	 * @returns {{cuota:number, tasaMensual:number, totalPagado:number, totalIntereses:number, tabla:Array}}
	 * @throws {RangeError} con un mensaje en español si los datos no son válidos.
	 */
	function simular(monto, plazoMeses, tasaEA) {
		var errores = validar(monto, plazoMeses, tasaEA);
		var campos = Object.keys(errores);
		if (campos.length > 0) {
			var error = new RangeError(errores[campos[0]]);
			error.errores = errores;
			throw error;
		}

		var tasaMensual = tasaMensualDesdeEA(tasaEA);
		var cuota = Math.round(cuotaFija(monto, tasaMensual, plazoMeses));
		var saldo = monto;
		var tabla = [];
		var totalPagado = 0;
		var totalIntereses = 0;

		for (var periodo = 1; periodo <= plazoMeses; periodo++) {
			var interes = Math.round(saldo * tasaMensual);
			var abono = cuota - interes;
			var cuotaDelMes = cuota;
			// La última cuota absorbe la diferencia de redondeo para cerrar en cero.
			if (periodo === plazoMeses) {
				abono = saldo;
				cuotaDelMes = interes + abono;
			}
			saldo -= abono;
			totalPagado += cuotaDelMes;
			totalIntereses += interes;
			tabla.push({
				periodo: periodo,
				cuota: cuotaDelMes,
				interes: interes,
				abono: abono,
				saldo: saldo
			});
		}

		return {
			cuota: cuota,
			tasaMensual: tasaMensual,
			totalPagado: totalPagado,
			totalIntereses: totalIntereses,
			tabla: tabla
		};
	}

	/** Formatea un valor en pesos colombianos: 1250000 -> "$ 1.250.000". */
	function formatearCOP(valor) {
		var entero = Math.round(Math.abs(valor)).toString();
		var conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
		return (valor < 0 ? '-' : '') + '$ ' + conPuntos;
	}

	/** Formatea una tasa en decimal como porcentaje: 0.021 -> "2,10 %". */
	function formatearPorcentaje(tasa, decimales) {
		var d = typeof decimales === 'number' ? decimales : 2;
		return (tasa * 100).toFixed(d).replace('.', ',') + ' %';
	}

	return {
		LIMITES: LIMITES,
		parsearNumero: parsearNumero,
		tasaMensualDesdeEA: tasaMensualDesdeEA,
		cuotaFija: cuotaFija,
		validar: validar,
		simular: simular,
		formatearCOP: formatearCOP,
		formatearPorcentaje: formatearPorcentaje
	};
}));
