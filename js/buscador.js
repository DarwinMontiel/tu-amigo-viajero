/*
 * Buscador de viajes: arma, con los mismos datos, las búsquedas reales de
 * varias páginas de vuelos y alojamiento (Despegar, Google Flights, Kayak,
 * Skyscanner, Booking y Airbnb) para comparar precios en un solo lugar.
 *
 * Este módulo no toca el DOM ni la red: valida y construye URLs, así que se
 * prueba con `node --test`. La parte de navegador vive en js/buscador-ui.js.
 */
(function (raiz, fabrica) {
	'use strict';
	var api = fabrica();
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	} else {
		raiz.Buscador = api;
	}
}(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	/**
	 * Aeropuertos de los destinos del sitio y de las ciudades de salida más comunes.
	 * Coordenadas del destino turístico (no del aeropuerto) para el pronóstico del clima.
	 */
	var LUGARES = {
		BOG: { ciudad: 'Bogotá', lat: 4.711, lon: -74.072 },
		MDE: { ciudad: 'Medellín', lat: 6.244, lon: -75.581 },
		CLO: { ciudad: 'Cali', lat: 3.452, lon: -76.532 },
		BAQ: { ciudad: 'Barranquilla', lat: 10.964, lon: -74.796 },
		BGA: { ciudad: 'Bucaramanga', lat: 7.119, lon: -73.123 },
		PEI: { ciudad: 'Pereira', lat: 4.813, lon: -75.696 },
		CTG: { ciudad: 'Cartagena de Indias', lat: 10.391, lon: -75.479 },
		SMR: { ciudad: 'Santa Marta', lat: 11.241, lon: -74.199 },
		ADZ: { ciudad: 'San Andrés', lat: 12.584, lon: -81.701 },
		AXM: { ciudad: 'Armenia', lat: 4.534, lon: -75.681 },
		LMC: { ciudad: 'La Macarena', lat: 2.180, lon: -73.786 },
		VVC: { ciudad: 'Villavicencio', lat: 4.142, lon: -73.627 },
		LET: { ciudad: 'Leticia', lat: -4.215, lon: -69.940 }
	};

	/** Destinos de las tarjetas del sitio → aeropuerto y lugar de hospedaje. */
	var DESTINOS_SITIO = {
		'cartagena': { iata: 'CTG', alojamiento: 'Cartagena de Indias', ciudad: 'Cartagena de Indias', lat: 10.423, lon: -75.548 },
		'cano-cristales': { iata: 'LMC', alojamiento: 'La Macarena, Meta', ciudad: 'Caño Cristales', lat: 2.264, lon: -73.795 },
		'valle-de-cocora': { iata: 'AXM', alojamiento: 'Salento, Quindío', ciudad: 'Salento', lat: 4.637, lon: -75.570 },
		'guatape': { iata: 'MDE', alojamiento: 'Guatapé, Antioquia', ciudad: 'Guatapé', lat: 6.233, lon: -75.159 },
		'san-andres': { iata: 'ADZ', alojamiento: 'San Andrés', ciudad: 'San Andrés', lat: 12.584, lon: -81.701 },
		// Villa de Leyva no tiene aeropuerto: se vuela a Bogotá y se sigue por tierra (unas 3 horas).
		'villa-de-leyva': { iata: 'BOG', alojamiento: 'Villa de Leyva, Boyacá', ciudad: 'Villa de Leyva', lat: 5.634, lon: -73.524 }
	};

	var PATRON_IATA = /^[A-Z]{3}$/;
	var PATRON_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

	function texto(valor) {
		return typeof valor === 'string' ? valor.trim() : '';
	}

	/** "2026-12-10" → fecha local; null si no existe (2026-02-31). */
	function parsearISO(valor) {
		var m = PATRON_ISO.exec(texto(valor));
		if (!m) {
			return null;
		}
		var anio = Number(m[1]);
		var mes = Number(m[2]) - 1;
		var dia = Number(m[3]);
		var fecha = new Date(anio, mes, dia);
		if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes || fecha.getDate() !== dia) {
			return null;
		}
		return fecha;
	}

	function aISO(fecha) {
		var mm = String(fecha.getMonth() + 1);
		var dd = String(fecha.getDate());
		return fecha.getFullYear() + '-' + (mm.length < 2 ? '0' + mm : mm) + '-' + (dd.length < 2 ? '0' + dd : dd);
	}

	function inicioDelDia(fecha) {
		return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
	}

	/** Noches entre dos fechas ISO válidas. */
	function noches(ida, regreso) {
		var a = parsearISO(ida);
		var b = parsearISO(regreso);
		if (!a || !b) {
			return 0;
		}
		return Math.round((b - a) / 86400000);
	}

	/**
	 * Normaliza y valida la búsqueda. Devuelve { datos, errores }.
	 * `hoy` se puede inyectar en las pruebas.
	 */
	function validar(entrada, hoy) {
		var errores = {};
		var datos = {
			origen: texto(entrada.origen).toUpperCase(),
			destino: texto(entrada.destino).toUpperCase(),
			ida: texto(entrada.ida),
			regreso: texto(entrada.regreso),
			adultos: Number(entrada.adultos),
			alojamiento: texto(entrada.alojamiento)
		};

		if (!PATRON_IATA.test(datos.origen)) {
			errores.origen = 'Elige la ciudad de salida de la lista.';
		}
		if (!PATRON_IATA.test(datos.destino)) {
			errores.destino = 'Elige la ciudad de destino de la lista.';
		} else if (datos.destino === datos.origen) {
			errores.destino = 'El destino debe ser distinto de la ciudad de salida.';
		}

		var ida = parsearISO(datos.ida);
		var limite = inicioDelDia(hoy || new Date());
		if (!ida) {
			errores.ida = 'Elige la fecha de ida.';
		} else if (ida < limite) {
			errores.ida = 'La fecha de ida no puede estar en el pasado.';
		} else if (ida - limite > 330 * 86400000) {
			errores.ida = 'Las aerolíneas venden con unos 11 meses de anticipación: elige una fecha más cercana.';
		}

		if (datos.regreso) {
			var regreso = parsearISO(datos.regreso);
			if (!regreso) {
				errores.regreso = 'La fecha de regreso no es válida.';
			} else if (ida && regreso < ida) {
				errores.regreso = 'El regreso debe ser el mismo día de la ida o después.';
			}
		}

		if (!(datos.adultos >= 1 && datos.adultos <= 9 && Math.floor(datos.adultos) === datos.adultos)) {
			errores.adultos = 'Pueden viajar entre 1 y 9 adultos por búsqueda.';
		}

		if (!datos.alojamiento) {
			var lugar = LUGARES[datos.destino];
			datos.alojamiento = lugar ? (lugar.alojamiento || lugar.ciudad) : datos.destino;
		}
		return { datos: datos, errores: errores };
	}

	function consulta(parametros) {
		return Object.keys(parametros).map(function (clave) {
			return encodeURIComponent(clave) + '=' + encodeURIComponent(parametros[clave]);
		}).join('&');
	}

	/** "2026-12-10" → "261210" (formato de Skyscanner). */
	function aAAMMDD(iso) {
		return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
	}

	/**
	 * Construye las búsquedas en cada página a partir de datos ya validados.
	 * Devuelve dos listas: vuelos y alojamiento, con nombre, url y nota.
	 */
	function construirEnlaces(d) {
		var idaYVuelta = Boolean(d.regreso);
		var o = d.origen;
		var de = d.destino;

		var despegar = 'https://www.despegar.com.co/shop/flights/results/' +
			(idaYVuelta ? 'roundtrip/' + o + '/' + de + '/' + d.ida + '/' + d.regreso : 'oneway/' + o + '/' + de + '/' + d.ida) +
			'/' + d.adultos + '/0/0';

		var google = 'https://www.google.com/travel/flights?' + consulta({
			q: 'Flights to ' + de + ' from ' + o + ' on ' + d.ida + (idaYVuelta ? ' through ' + d.regreso : ' oneway'),
			hl: 'es-419',
			gl: 'CO',
			curr: 'COP'
		});

		var kayak = 'https://www.kayak.com.co/flights/' + o + '-' + de + '/' + d.ida +
			(idaYVuelta ? '/' + d.regreso : '') + '/' + d.adultos + 'adults?sort=bestflight_a';

		var skyscanner = 'https://www.skyscanner.com.co/transporte/vuelos/' + o.toLowerCase() + '/' + de.toLowerCase() + '/' +
			aAAMMDD(d.ida) + '/' + (idaYVuelta ? aAAMMDD(d.regreso) + '/' : '') + '?' +
			consulta({ adultsv2: d.adultos, cabinclass: 'economy', rtn: idaYVuelta ? 1 : 0 });

		var vuelos = [
			{ id: 'despegar', nombre: 'Despegar', url: despegar, nota: 'Agencia con vuelos, hoteles y paquetes; cobra en pesos.' },
			{ id: 'google', nombre: 'Google Flights', url: google, nota: 'Compara aerolíneas y muestra si el precio está alto o bajo.' },
			{ id: 'kayak', nombre: 'Kayak', url: kayak, nota: 'Metabuscador: reúne precios de aerolíneas y agencias.' },
			{ id: 'skyscanner', nombre: 'Skyscanner', url: skyscanner, nota: 'Metabuscador con alertas de precio.' }
		];

		var alojamiento = [];
		// Sin regreso no hay noches: se buscan hoteles para una noche desde la fecha de ida.
		var salida = idaYVuelta && noches(d.ida, d.regreso) > 0 ? d.regreso : aISO(new Date(parsearISO(d.ida).getTime() + 86400000));
		alojamiento.push({
			id: 'booking',
			nombre: 'Booking.com',
			url: 'https://www.booking.com/searchresults.es.html?' + consulta({
				ss: d.alojamiento,
				checkin: d.ida,
				checkout: salida,
				group_adults: d.adultos,
				no_rooms: 1,
				group_children: 0,
				selected_currency: 'COP'
			}),
			nota: 'Hoteles y hostales, muchos con cancelación gratis.'
		});
		alojamiento.push({
			id: 'airbnb',
			nombre: 'Airbnb',
			url: 'https://www.airbnb.com.co/s/' + encodeURIComponent(d.alojamiento.replace(/,\s*/g, '--').replace(/\s+/g, '-')) +
				'/homes?' + consulta({ checkin: d.ida, checkout: salida, adults: d.adultos }),
			nota: 'Apartamentos y casas completas, útil para familias.'
		});
		alojamiento.push({
			id: 'despegar-paquetes',
			nombre: 'Despegar: vuelo + hotel',
			url: 'https://www.despegar.com.co/paquetes/',
			nota: 'Arma el paquete con los mismos datos: suele salir más barato que por separado.'
		});

		return { vuelos: vuelos, alojamiento: alojamiento, noches: idaYVuelta ? noches(d.ida, d.regreso) : 0, checkout: salida };
	}

	/** Etiqueta legible de un código de clima de Open-Meteo (WMO). */
	function describirClima(codigo) {
		if (codigo === 0) { return 'Despejado'; }
		if (codigo <= 2) { return 'Parcialmente nublado'; }
		if (codigo === 3) { return 'Nublado'; }
		if (codigo === 45 || codigo === 48) { return 'Niebla'; }
		if (codigo >= 51 && codigo <= 57) { return 'Llovizna'; }
		if (codigo >= 61 && codigo <= 67) { return 'Lluvia'; }
		if (codigo >= 80 && codigo <= 82) { return 'Aguaceros'; }
		if (codigo >= 95) { return 'Tormenta'; }
		return 'Variable';
	}

	return {
		LUGARES: LUGARES,
		DESTINOS_SITIO: DESTINOS_SITIO,
		parsearISO: parsearISO,
		aISO: aISO,
		noches: noches,
		validar: validar,
		construirEnlaces: construirEnlaces,
		describirClima: describirClima
	};
}));
