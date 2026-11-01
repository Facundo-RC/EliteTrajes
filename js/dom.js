// Utilidades de interfaz compartidas por las páginas.

import { formatearPrecio } from './catalogo.js';

export async function cargarProductos(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) {
        throw new Error(`No se pudo leer ${ruta} (${respuesta.status})`);
    }
    return respuesta.json();
}

// Crea un elemento con clases, atributos y texto sin pasar por innerHTML,
// así ningún dato se interpreta como HTML.
export function crear(etiqueta, { clase, texto, atributos = {} } = {}, hijos = []) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    for (const [nombre, valor] of Object.entries(atributos)) {
        elemento.setAttribute(nombre, valor);
    }
    elemento.append(...hijos);
    return elemento;
}

export function mostrarError(contenedor, mensaje) {
    contenedor.replaceChildren(
        crear('div', { clase: 'aviso aviso--error', atributos: { role: 'alert' } }, [
            crear('p', { clase: 'aviso__titulo', texto: 'No pudimos cargar el catálogo' }),
            crear('p', { clase: 'aviso__texto', texto: mensaje })
        ])
    );
}

export function precioPorDia(monto) {
    return `${formatearPrecio(monto)} / día`;
}

export function rutaReserva(producto, prefijo = '') {
    return `${prefijo}contacto.html?prenda=${encodeURIComponent(producto.id)}#reserva`;
}
