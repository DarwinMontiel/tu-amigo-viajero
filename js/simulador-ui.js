/*
 * Conecta el formulario "Viaja ahora, paga a cuotas" (pricing.html) con
 * js/simulador-cuotas.js y pinta los estados: vacío, error y resultado.
 */
(function (window, document) {
	'use strict';

	var Simulador = window.SimuladorCuotas;
	var formulario = document.getElementById('form-simulador');
	if (!Simulador || !formulario) {
		return;
	}

	var campoPaquete = document.getElementById('sim-paquete');
	var campoMonto = document.getElementById('sim-monto');
	var campoPlazo = document.getElementById('sim-plazo');
	var campoTasa = document.getElementById('sim-tasa');
	var estado = document.getElementById('sim-estado');
	var resultado = document.getElementById('sim-resultado');
	var cuerpoTabla = document.getElementById('sim-tabla-cuerpo');

	function poner(id, valor) {
		document.getElementById(id).textContent = valor;
	}

	function marcar(campo, error) {
		if (error) {
			campo.setAttribute('aria-invalid', 'true');
		} else {
			campo.removeAttribute('aria-invalid');
		}
	}

	function mostrarEstado(tipo, mensaje) {
		estado.className = 'estado-formulario estado-' + tipo;
		estado.textContent = mensaje;
	}

	// Al elegir un paquete se copia su precio de referencia en el campo de valor.
	campoPaquete.addEventListener('change', function () {
		var precio = campoPaquete.value;
		if (precio) {
			campoMonto.value = Simulador.formatearCOP(Number(precio)).replace('$ ', '');
		}
	});

	function calcular() {
		var monto = Simulador.parsearNumero(campoMonto.value);
		var plazo = Number(campoPlazo.value);
		var tasa = Simulador.parsearNumero(campoTasa.value) / 100;

		var errores = Simulador.validar(monto, plazo, tasa);
		marcar(campoMonto, errores.monto);
		marcar(campoTasa, errores.tasa);
		var claves = Object.keys(errores);
		if (claves.length > 0) {
			resultado.hidden = true;
			mostrarEstado('error', claves.map(function (c) { return errores[c]; }).join(' '));
			return;
		}

		var sim = Simulador.simular(monto, plazo, tasa);
		poner('sim-cuota', Simulador.formatearCOP(sim.cuota));
		poner('sim-plazo-texto', plazo === 1 ? '1 cuota' : plazo + ' cuotas mensuales');
		poner('sim-tasa-mensual', Simulador.formatearPorcentaje(sim.tasaMensual) + ' mes vencido');
		poner('sim-intereses', Simulador.formatearCOP(sim.totalIntereses));
		poner('sim-total', Simulador.formatearCOP(sim.totalPagado));

		var filas = document.createDocumentFragment();
		sim.tabla.forEach(function (fila) {
			var tr = document.createElement('tr');
			[String(fila.periodo), Simulador.formatearCOP(fila.cuota), Simulador.formatearCOP(fila.interes),
				Simulador.formatearCOP(fila.abono), Simulador.formatearCOP(fila.saldo)].forEach(function (valor) {
				var td = document.createElement('td');
				td.textContent = valor;
				tr.appendChild(td);
			});
			filas.appendChild(tr);
		});
		cuerpoTabla.textContent = '';
		cuerpoTabla.appendChild(filas);

		resultado.hidden = false;
		mostrarEstado('exito', 'Simulación lista: ' + plazo + (plazo === 1 ? ' cuota de ' : ' cuotas de ') + Simulador.formatearCOP(sim.cuota) + '.');
	}

	formulario.addEventListener('submit', function (evento) {
		evento.preventDefault();
		calcular();
	});

	// Si la página ya trae un valor (el paquete de ejemplo), muestra la simulación de una vez.
	if (campoMonto.value.trim() !== '') {
		calcular();
	}
}(window, document));
