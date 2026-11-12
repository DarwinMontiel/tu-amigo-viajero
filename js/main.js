/*
 * Comportamiento común de las páginas: menú móvil, animaciones al hacer
 * scroll, contadores, selector de fechas, parallax y botón "volver arriba".
 * Basado en el JavaScript de la plantilla de GetTemplates (CC BY 3.0).
 */
;(function () {

	'use strict';

	// Cierra el menú móvil al tocar fuera de él.
	var cerrarMenuAlTocarFuera = function () {
		$(document).click(function (e) {
			var contenedor = $('#gtco-offcanvas, .js-gtco-nav-toggle');
			if (!contenedor.is(e.target) && contenedor.has(e.target).length === 0) {
				$('.js-gtco-nav-toggle').addClass('gtco-nav-white');
				if ($('body').hasClass('offcanvas')) {
					$('body').removeClass('offcanvas');
					$('.js-gtco-nav-toggle').removeClass('active').attr('aria-expanded', 'false');
				}
			}
		});
	};

	// Construye el menú lateral del celular a partir del menú principal.
	var menuMovil = function () {
		$('#page').prepend('<div id="gtco-offcanvas" />');
		$('#page').prepend('<a href="#" class="js-gtco-nav-toggle gtco-nav-toggle gtco-nav-white" aria-label="Abrir menú" aria-expanded="false"><i></i></a>');
		$('#gtco-offcanvas').append($('.menu-1 > ul').clone());

		$('#gtco-offcanvas .has-dropdown').addClass('offcanvas-has-dropdown');
		$('#gtco-offcanvas').find('li').removeClass('has-dropdown');

		$('.offcanvas-has-dropdown').mouseenter(function () {
			$(this).addClass('active').find('ul').slideDown(500, 'easeOutExpo');
		}).mouseleave(function () {
			$(this).removeClass('active').find('ul').slideUp(500, 'easeOutExpo');
		});

		$(window).resize(function () {
			if ($('body').hasClass('offcanvas')) {
				$('body').removeClass('offcanvas');
				$('.js-gtco-nav-toggle').removeClass('active').attr('aria-expanded', 'false');
			}
		});
	};

	var botonHamburguesa = function () {
		$('body').on('click', '.js-gtco-nav-toggle', function (event) {
			var $boton = $(this);
			$('body').toggleClass('overflow offcanvas');
			$boton.toggleClass('active');
			var abierto = $('body').hasClass('offcanvas');
			$boton.attr('aria-expanded', abierto ? 'true' : 'false');
			$boton.attr('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
			event.preventDefault();
		});
	};

	// Anima los bloques .animate-box cuando entran en pantalla.
	var animarAlHacerScroll = function () {
		$('.animate-box').waypoint(function (direction) {
			if (direction === 'down' && !$(this.element).hasClass('animated-fast')) {
				$(this.element).addClass('item-animate');
				setTimeout(function () {
					$('body .animate-box.item-animate').each(function (k) {
						var el = $(this);
						setTimeout(function () {
							var efecto = el.data('animate-effect');
							var permitidos = ['fadeIn', 'fadeInLeft', 'fadeInRight'];
							el.addClass((permitidos.indexOf(efecto) !== -1 ? efecto : 'fadeInUp') + ' animated-fast');
							el.removeClass('item-animate');
						}, k * 200);
					});
				}, 100);
			}
		}, { offset: '85%' });
	};

	var menuDesplegable = function () {
		$('.has-dropdown').mouseenter(function () {
			$(this).find('.dropdown').css('display', 'block').addClass('animated-fast fadeInUpMenu');
		}).mouseleave(function () {
			$(this).find('.dropdown').css('display', 'none').removeClass('animated-fast fadeInUpMenu');
		});
	};

	var volverArriba = function () {
		$('.js-gotop').on('click', function (event) {
			event.preventDefault();
			$('html, body').animate({ scrollTop: $('html').offset().top }, 500, 'easeInOutExpo');
			return false;
		});

		$(window).scroll(function () {
			$('.js-top').toggleClass('active', $(window).scrollTop() > 200);
		});
	};

	var ocultarCargador = function () {
		$('.gtco-loader').fadeOut('slow');
	};

	// Contadores con separador de miles colombiano: 2480 -> "2.480".
	var contadores = function () {
		$('.js-counter').countTo({
			formatter: function (valor) {
				return Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
			}
		});
	};

	var contadoresAlHacerScroll = function () {
		if ($('#gtco-counter').length > 0) {
			$('#gtco-counter').waypoint(function (direction) {
				if (direction === 'down' && !$(this.element).hasClass('animated')) {
					setTimeout(contadores, 400);
					$(this.element).addClass('animated');
				}
			}, { offset: '90%' });
		}
	};

	// Selector de fechas en español (dd/mm/aaaa); no deja elegir días pasados.
	var selectorDeFechas = function () {
		if ($.fn.datepicker && $('#date-start').length > 0) {
			$('#date-start').datepicker({
				language: 'es',
				format: 'dd/mm/yyyy',
				weekStart: 1,
				startDate: new Date(),
				autoclose: true,
				todayHighlight: true
			});
		}
	};

	var parallax = function () {
		$(window).stellar({
			horizontalScrolling: false,
			hideDistantElements: false,
			responsive: true
		});
	};

	$(function () {
		cerrarMenuAlTocarFuera();
		menuMovil();
		botonHamburguesa();
		animarAlHacerScroll();
		menuDesplegable();
		volverArriba();
		ocultarCargador();
		contadoresAlHacerScroll();
		selectorDeFechas();
		parallax();
	});

}());
