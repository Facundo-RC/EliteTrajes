// Página de trajes: dibuja el catálogo y conecta búsqueda, filtro por estilo y orden.

import { filtrarProductos, ordenarProductos, estilosDisponibles, ORDENES } from './catalogo.js';
import { cargarProductos, crear, mostrarError, precioPorDia, rutaReserva } from './dom.js';

const estado = { estilo: 'todos', texto: '', orden: 'destacados' };
let trajes = [];

const grilla = document.getElementById('grilla-trajes');
const grupoEstilos = document.getElementById('filtro-estilos');
const buscador = document.getElementById('buscador-trajes');
const selectorOrden = document.getElementById('orden-trajes');
const contador = document.getElementById('contador-trajes');

function crearTarjeta(traje) {
    const imagen = crear('img', {
        clase: 'traje-card__img',
        atributos: { src: traje.imagen, alt: traje.alt, loading: 'lazy', width: '500', height: '340' }
    });

    return crear('div', { clase: 'col-12 col-sm-6 col-lg-4' }, [
        crear('article', { clase: 'traje-card' }, [
            crear('div', { clase: 'traje-card__img-wrap' }, [
                imagen,
                crear('span', { clase: 'traje-card__badge', texto: traje.estilo })
            ]),
            crear('div', { clase: 'traje-card__body' }, [
                crear('h2', { clase: 'traje-card__titulo', texto: traje.nombre }),
                crear('p', { clase: 'traje-card__precio', texto: precioPorDia(traje.precioDia) }),
                crear('p', { clase: 'traje-card__desc', texto: traje.descripcion }),
                crear('a', {
                    clase: 'traje-card__btn',
                    texto: 'Reservar',
                    atributos: { href: rutaReserva(traje), 'aria-label': `Reservar ${traje.nombre}` }
                })
            ])
        ])
    ]);
}

function crearEstadoVacio() {
    const boton = crear('button', { clase: 'aviso__btn', texto: 'Limpiar filtros', atributos: { type: 'button' } });
    boton.addEventListener('click', limpiarFiltros);

    return crear('div', { clase: 'col-12' }, [
        crear('div', { clase: 'aviso' }, [
            crear('p', { clase: 'aviso__titulo', texto: 'No hay trajes con esos filtros' }),
            crear('p', { clase: 'aviso__texto', texto: 'Probá con otra búsqueda o mirá todo el catálogo.' }),
            boton
        ])
    ]);
}

function dibujar() {
    const visibles = ordenarProductos(filtrarProductos(trajes, estado), estado.orden);

    grilla.replaceChildren(...(visibles.length ? visibles.map(crearTarjeta) : [crearEstadoVacio()]));
    contador.textContent = `Mostrando ${visibles.length} de ${trajes.length} trajes`;

    for (const boton of grupoEstilos.querySelectorAll('button')) {
        const activo = boton.dataset.estilo === estado.estilo;
        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-pressed', String(activo));
    }
}

function dibujarFiltros() {
    const estilos = ['todos', ...estilosDisponibles(trajes)];

    grupoEstilos.replaceChildren(...estilos.map((estilo) => {
        const boton = crear('button', {
            clase: 'filtros-bar__btn',
            texto: estilo === 'todos' ? 'Todos' : estilo,
            atributos: { type: 'button', 'data-estilo': estilo, 'aria-pressed': 'false' }
        });
        boton.addEventListener('click', () => {
            estado.estilo = estilo;
            dibujar();
        });
        return boton;
    }));

    selectorOrden.replaceChildren(...Object.entries(ORDENES).map(([valor, texto]) =>
        crear('option', { texto, atributos: { value: valor } })
    ));
}

function limpiarFiltros() {
    estado.estilo = 'todos';
    estado.texto = '';
    estado.orden = 'destacados';
    buscador.value = '';
    selectorOrden.value = 'destacados';
    dibujar();
}

async function iniciar() {
    try {
        const productos = await cargarProductos('../data/productos.json');
        trajes = filtrarProductos(productos, { tipos: ['traje'] });
    } catch (error) {
        contador.textContent = '';
        mostrarError(grilla, 'Revisá tu conexión y volvé a cargar la página.');
        return;
    }

    dibujarFiltros();
    dibujar();

    buscador.addEventListener('input', () => {
        estado.texto = buscador.value;
        dibujar();
    });

    selectorOrden.addEventListener('change', () => {
        estado.orden = selectorOrden.value;
        dibujar();
    });
}

iniciar();
