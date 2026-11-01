// Página de accesorios: dibuja corbatas y calzado, y hace funcionar las pestañas.

import { filtrarProductos } from './catalogo.js';
import { cargarProductos, crear, mostrarError, precioPorDia, rutaReserva } from './dom.js';

const BLOQUES = {
    corbatas: { tipos: ['corbata'], bloque: 'bloque-corbatas', grilla: 'grilla-corbatas' },
    calzado: { tipos: ['calzado'], bloque: 'bloque-calzado', grilla: 'grilla-calzado' }
};

const pestanias = document.querySelectorAll('.subcategorias-tabs__btn');
const divisor = document.getElementById('divider-tabs');

function crearTarjeta(accesorio) {
    return crear('div', { clase: 'col-12 col-md-6' }, [
        crear('article', { clase: 'accesorio-card' }, [
            crear('img', {
                clase: 'accesorio-card__img',
                atributos: { src: accesorio.imagen, alt: accesorio.alt, loading: 'lazy', width: '300', height: '300' }
            }),
            crear('div', { clase: 'accesorio-card__body' }, [
                crear('h3', { clase: 'accesorio-card__titulo', texto: accesorio.nombre }),
                crear('p', { clase: 'accesorio-card__precio', texto: precioPorDia(accesorio.precioDia) }),
                crear('p', { clase: 'accesorio-card__desc', texto: accesorio.descripcion }),
                crear('a', {
                    clase: 'accesorio-card__btn',
                    texto: 'Reservar',
                    atributos: { href: rutaReserva(accesorio), 'aria-label': `Reservar ${accesorio.nombre}` }
                })
            ])
        ])
    ]);
}

function elegirPestania(nombre) {
    for (const pestania of pestanias) {
        const activa = pestania.dataset.tab === nombre;
        pestania.classList.toggle('activo', activa);
        pestania.setAttribute('aria-pressed', String(activa));
    }

    for (const [clave, { bloque }] of Object.entries(BLOQUES)) {
        document.getElementById(bloque).hidden = nombre !== 'todos' && nombre !== clave;
    }
    divisor.hidden = nombre !== 'todos';
}

async function iniciar() {
    let productos;
    try {
        productos = await cargarProductos('../data/productos.json');
    } catch (error) {
        mostrarError(document.getElementById('grilla-corbatas'), 'Revisá tu conexión y volvé a cargar la página.');
        document.getElementById('bloque-calzado').hidden = true;
        divisor.hidden = true;
        return;
    }

    for (const { tipos, grilla } of Object.values(BLOQUES)) {
        const lista = filtrarProductos(productos, { tipos });
        document.getElementById(grilla).replaceChildren(...lista.map(crearTarjeta));
    }

    for (const pestania of pestanias) {
        pestania.addEventListener('click', () => elegirPestania(pestania.dataset.tab));
    }
    elegirPestania('todos');
}

iniciar();
