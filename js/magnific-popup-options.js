/*
 * Galería de destinos con Magnific Popup, con los textos del visor en español.
 */
$(function () {
	'use strict';

	$.extend(true, $.magnificPopup.defaults, {
		tClose: 'Cerrar (Esc)',
		tLoading: 'Cargando…',
		gallery: {
			tPrev: 'Anterior (flecha izquierda)',
			tNext: 'Siguiente (flecha derecha)',
			tCounter: '%curr% de %total%'
		},
		image: {
			tError: '<a href="%url%">La imagen</a> no se pudo cargar.'
		}
	});

	$('.image-popup').magnificPopup({
		type: 'image',
		removalDelay: 300,
		mainClass: 'mfp-with-zoom',
		gallery: {
			enabled: true
		},
		zoom: {
			enabled: true,
			duration: 300,
			easing: 'ease-in-out',
			// Hace el zoom desde la imagen de la tarjeta que se tocó.
			opener: function (elemento) {
				return elemento.is('img') ? elemento : elemento.find('img');
			}
		}
	});
});
