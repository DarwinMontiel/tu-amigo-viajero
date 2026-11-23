/*
 * Parte de navegador del buscador de viajes (buscar.html).
 *
 * Datos reales, sin claves ni servidor propio:
 *   - Ciudades y aeropuertos del mundo: autocompletado público de Travelpayouts.
 *   - Pronóstico del clima del destino: Open-Meteo.
 *   - Tasa de cambio del día (USD y EUR a COP): ExchangeRate-API (open.er-api.com).
 * Los precios de vuelos y hoteles se ven en cada página enlazada, con la búsqueda ya armada.
 * Si una fuente no responde, el buscador sigue funcionando con la lista de aeropuertos local.
 */
(function (window, document) {
	'use strict';

	var B = window.Buscador;
	var formulario = document.getElementById('form-buscador');
	if (!B || !formulario) {
		return;
	}

	var campos = {
		origen: document.getElementById('bus-origen'),
		destino: document.getElementById('bus-destino'),
		ida: document.getElementById('bus-ida'),
		regreso: document.getElementById('bus-regreso'),
		adultos: document.getElementById('bus-adultos')
	};
	var estado = document.getElementById('bus-estado');
	var resultados = document.getElementById('bus-resultados');
	var TIEMPO_MAXIMO = 8000;

	// Lugares elegidos: texto visible → { code, ciudad, lat, lon }.
	var conocidos = {};
	// Hospedaje del destino del sitio cuando se llega desde una tarjeta (Guatapé vuela a MDE, pero se duerme en Guatapé).
	var preferido = null;

	function etiqueta(code, ciudad, pais) {
		return ciudad + ' (' + code + ')' + (pais ? ' · ' + pais : '');
	}

	Object.keys(B.LUGARES).forEach(function (code) {
		var l = B.LUGARES[code];
		conocidos[etiqueta(code, l.ciudad, 'Colombia')] = { code: code, ciudad: l.ciudad, lat: l.lat, lon: l.lon, alojamiento: l.alojamiento };
	});

	function llenarLista(lista, etiquetas) {
		lista.textContent = '';
		etiquetas.forEach(function (texto) {
			var opcion = document.createElement('option');
			opcion.value = texto;
			lista.appendChild(opcion);
		});
	}

	function conTiempo(url) {
		var control = typeof AbortController === 'function' ? new AbortController() : null;
		var reloj = setTimeout(function () { if (control) { control.abort(); } }, TIEMPO_MAXIMO);
		return fetch(url, control ? { signal: control.signal } : {}).then(function (r) {
			clearTimeout(reloj);
			if (!r.ok) {
				throw new Error('HTTP ' + r.status);
			}
			return r.json();
		}, function (error) {
			clearTimeout(reloj);
			throw error;
		});
	}

	/** Autocompletado: primero la lista local y luego ciudades y aeropuertos del mundo. */
	function autocompletar(campo) {
		var lista = document.getElementById(campo.getAttribute('list'));
		var espera = null;
		var ultimo = '';
		llenarLista(lista, Object.keys(conocidos));
		campo.addEventListener('input', function () {
			var termino = campo.value.trim();
			if (conocidos[campo.value] || termino.length < 2 || termino === ultimo) {
				return;
			}
			clearTimeout(espera);
			espera = setTimeout(function () {
				ultimo = termino;
				var url = 'https://autocomplete.travelpayouts.com/places2?' +
					'term=' + encodeURIComponent(termino) + '&locale=es&types[]=city&types[]=airport';
				conTiempo(url).then(function (lugares) {
					var etiquetas = [];
					(lugares || []).slice(0, 8).forEach(function (l) {
						if (!l.code || !l.coordinates) {
							return;
						}
						var nombre = l.type === 'airport' && l.city_name ? l.name + ', ' + l.city_name : l.name;
						var texto = etiqueta(l.code, nombre, l.country_name);
						conocidos[texto] = { code: l.code, ciudad: l.city_name || l.name, lat: l.coordinates.lat, lon: l.coordinates.lon };
						etiquetas.push(texto);
					});
					if (etiquetas.length > 0) {
						llenarLista(lista, etiquetas);
					}
				}).catch(function () {
					// Sin conexión con el autocompletado: queda la lista local.
				});
			}, 250);
		});
	}

	/** Acepta "Cartagena de Indias (CTG) · Colombia", "CTG" o "ctg". */
	function leerLugar(campo) {
		var valor = campo.value.trim();
		if (conocidos[valor]) {
			return conocidos[valor];
		}
		var m = /\(([A-Za-z]{3})\)/.exec(valor) || /^([A-Za-z]{3})$/.exec(valor);
		if (!m) {
			return null;
		}
		var code = m[1].toUpperCase();
		var local = B.LUGARES[code];
		return local ? { code: code, ciudad: local.ciudad, lat: local.lat, lon: local.lon, alojamiento: local.alojamiento } : { code: code, ciudad: code };
	}

	function mostrarEstado(tipo, mensaje) {
		estado.className = 'estado-formulario estado-' + tipo;
		estado.textContent = mensaje;
	}

	function marcar(errores) {
		Object.keys(campos).forEach(function (clave) {
			if (errores[clave]) {
				campos[clave].setAttribute('aria-invalid', 'true');
			} else {
				campos[clave].removeAttribute('aria-invalid');
			}
		});
	}

	function crear(etiquetaHtml, clase, texto) {
		var el = document.createElement(etiquetaHtml);
		if (clase) {
			el.className = clase;
		}
		if (texto) {
			el.textContent = texto;
		}
		return el;
	}

	function tarjetaEnlace(enlace) {
		var a = crear('a', 'buscador-proveedor proveedor-' + enlace.id);
		a.href = enlace.url;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.appendChild(crear('strong', '', enlace.nombre));
		a.appendChild(crear('span', '', enlace.nota));
		a.appendChild(crear('span', 'buscador-ir', 'Ver precios ↗'));
		a.setAttribute('aria-label', 'Ver precios en ' + enlace.nombre + ' (se abre en otra pestaña)');
		return a;
	}

	function formatearFecha(iso) {
		var f = B.parsearISO(iso);
		if (!f) {
			return iso;
		}
		var t = f.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	function pintarClima(contenedor, destino, ida, regreso) {
		if (typeof destino.lat !== 'number') {
			contenedor.appendChild(crear('p', 'buscador-nota', 'No tenemos coordenadas de este destino para el pronóstico.'));
			return;
		}
		var hoy = B.aISO(new Date());
		var limite = B.aISO(new Date(Date.now() + 15 * 86400000));
		var enRango = ida <= limite;
		var desde = enRango ? ida : hoy;
		var hasta = enRango ? (regreso && regreso <= limite ? regreso : (regreso ? limite : ida)) : B.aISO(new Date(Date.now() + 6 * 86400000));
		var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + destino.lat + '&longitude=' + destino.lon +
			'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
			'&timezone=auto&start_date=' + desde + '&end_date=' + hasta;
		var cargando = crear('p', 'buscador-nota', 'Consultando el pronóstico…');
		contenedor.appendChild(cargando);
		conTiempo(url).then(function (datos) {
			cargando.textContent = enRango ?
				'Pronóstico para las fechas de tu viaje en ' + destino.ciudad + ' (Open-Meteo).' :
				'Tu viaje es en más de 15 días: este es el clima de los próximos días en ' + destino.ciudad + ' como referencia (Open-Meteo).';
			var lista = crear('ul', 'buscador-clima');
			var d = datos.daily;
			for (var i = 0; i < d.time.length; i++) {
				var li = crear('li');
				li.appendChild(crear('span', 'clima-dia', formatearFecha(d.time[i])));
				li.appendChild(crear('span', 'clima-estado', B.describirClima(d.weather_code[i])));
				li.appendChild(crear('span', 'clima-temp', Math.round(d.temperature_2m_max[i]) + '° / ' + Math.round(d.temperature_2m_min[i]) + '°'));
				var lluvia = d.precipitation_probability_max[i];
				li.appendChild(crear('span', 'clima-lluvia', lluvia === null ? '' : 'Lluvia ' + lluvia + ' %'));
				lista.appendChild(li);
			}
			contenedor.appendChild(lista);
		}).catch(function () {
			cargando.textContent = 'El servicio del clima no respondió. Intenta de nuevo en un momento.';
		});
	}

	function pintarCambio(contenedor) {
		var cargando = crear('p', 'buscador-nota', 'Consultando la tasa de cambio…');
		contenedor.appendChild(cargando);
		conTiempo('https://open.er-api.com/v6/latest/USD').then(function (datos) {
			var cop = datos.rates && datos.rates.COP;
			var eur = datos.rates && datos.rates.EUR;
			if (!cop || !eur) {
				throw new Error('sin tasa');
			}
			var fmt = function (n) { return '$ ' + Math.round(n).toLocaleString('es-CO'); };
			var fecha = new Date(datos.time_last_update_unix * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
			cargando.textContent = '1 dólar = ' + fmt(cop) + ' · 1 euro = ' + fmt(cop / eur) + ' (actualizado el ' + fecha + ', ExchangeRate-API). Útil si una página te muestra precios en otra moneda.';
		}).catch(function () {
			cargando.textContent = 'No se pudo consultar la tasa de cambio en este momento.';
		});
	}

	function pintarResultados(datos, origen, destino, lugarClima) {
		var enlaces = B.construirEnlaces(datos);
		resultados.textContent = '';

		var resumen = crear('p', 'buscador-resumen');
		resumen.textContent = origen.ciudad + ' (' + datos.origen + ') → ' + destino.ciudad + ' (' + datos.destino + ') · ' +
			formatearFecha(datos.ida) + (datos.regreso ? ' al ' + formatearFecha(datos.regreso) + ' (' + enlaces.noches + (enlaces.noches === 1 ? ' noche' : ' noches') + ')' : ', solo ida') +
			' · ' + datos.adultos + (datos.adultos === 1 ? ' adulto' : ' adultos');
		resultados.appendChild(resumen);

		var grupos = [
			{ titulo: 'Vuelos', items: enlaces.vuelos },
			{ titulo: 'Alojamiento en ' + datos.alojamiento + (datos.regreso ? '' : ' (1 noche desde la ida)'), items: enlaces.alojamiento }
		];
		grupos.forEach(function (g) {
			var seccion = crear('section', 'buscador-grupo');
			seccion.appendChild(crear('h3', '', g.titulo));
			var rejilla = crear('div', 'buscador-rejilla');
			g.items.forEach(function (e) { rejilla.appendChild(tarjetaEnlace(e)); });
			seccion.appendChild(rejilla);
			resultados.appendChild(seccion);
		});

		var extra = crear('section', 'buscador-grupo');
		extra.appendChild(crear('h3', '', 'Antes de reservar'));
		var bloqueClima = crear('div');
		var bloqueCambio = crear('div');
		extra.appendChild(bloqueClima);
		extra.appendChild(bloqueCambio);
		pintarClima(bloqueClima, lugarClima, datos.ida, datos.regreso);
		pintarCambio(bloqueCambio);
		resultados.appendChild(extra);

		resultados.hidden = false;
	}

	formulario.addEventListener('submit', function (evento) {
		evento.preventDefault();
		var origen = leerLugar(campos.origen);
		var destino = leerLugar(campos.destino);
		var r = B.validar({
			origen: origen ? origen.code : '',
			destino: destino ? destino.code : '',
			ida: campos.ida.value,
			regreso: campos.regreso.value,
			adultos: campos.adultos.value,
			alojamiento: !destino ? '' :
				(preferido && preferido.iata === destino.code ? preferido.alojamiento : (destino.alojamiento || destino.ciudad))
		});
		marcar(r.errores);
		var claves = Object.keys(r.errores);
		if (claves.length > 0) {
			resultados.hidden = true;
			mostrarEstado('error', claves.map(function (c) { return r.errores[c]; }).join(' '));
			campos[claves[0]].focus();
			return;
		}
		mostrarEstado('exito', 'Listo: abre cada página para ver precios reales con tu búsqueda ya armada.');
		// Desde una tarjeta del sitio, el clima es el del pueblo (Guatapé) y no el de la ciudad del aeropuerto (Medellín).
		var lugarClima = preferido && preferido.iata === destino.code ? preferido : destino;
		pintarResultados(r.datos, origen, destino, lugarClima);
		if (window.history && window.history.replaceState) {
			window.history.replaceState(null, '', '?origen=' + r.datos.origen + '&destino=' + r.datos.destino +
				'&ida=' + r.datos.ida + (r.datos.regreso ? '&regreso=' + r.datos.regreso : '') + '&adultos=' + r.datos.adultos);
		}
	});

	// Fechas mínimas: hoy para la ida; la ida para el regreso.
	var hoy = B.aISO(new Date());
	campos.ida.min = hoy;
	campos.regreso.min = hoy;
	campos.ida.addEventListener('change', function () {
		campos.regreso.min = campos.ida.value || hoy;
		if (campos.regreso.value && campos.regreso.value < campos.ida.value) {
			campos.regreso.value = '';
		}
	});

	autocompletar(campos.origen);
	autocompletar(campos.destino);

	// Atajos: ?destino=cartagena (desde las tarjetas) o una búsqueda compartida (?origen=BOG&destino=CTG&ida=…).
	var params = new URLSearchParams(window.location.search);
	function poner(campo, code) {
		var l = B.LUGARES[code];
		campo.value = l ? etiqueta(code, l.ciudad, 'Colombia') : code;
	}
	var dest = params.get('destino');
	if (dest && B.DESTINOS_SITIO[dest]) {
		poner(campos.destino, B.DESTINOS_SITIO[dest].iata);
		preferido = B.DESTINOS_SITIO[dest];
		if (preferido.iata === leerLugar(campos.origen).code) {
			campos.origen.value = ''; // Villa de Leyva vuela a Bogotá: la salida no puede ser Bogotá
		}
	} else if (dest && /^[A-Za-z]{3}$/.test(dest)) {
		poner(campos.destino, dest.toUpperCase());
	}
	if (params.get('origen') && /^[A-Za-z]{3}$/.test(params.get('origen'))) {
		poner(campos.origen, params.get('origen').toUpperCase());
	}
	['ida', 'regreso', 'adultos'].forEach(function (clave) {
		if (params.get(clave)) {
			campos[clave].value = params.get(clave);
		}
	});
	if (params.get('origen') && params.get('ida')) {
		formulario.requestSubmit ? formulario.requestSubmit() : formulario.dispatchEvent(new Event('submit', { cancelable: true }));
	}
}(window, document));
