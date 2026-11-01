// Lógica del catálogo: filtrar, ordenar y formatear. No toca el DOM,
// así se puede usar desde el navegador y testear con Node.

export const ORDENES = {
    destacados: 'Destacados',
    'precio-asc': 'Precio: menor a mayor',
    'precio-desc': 'Precio: mayor a menor',
    nombre: 'Nombre (A-Z)'
};

// Quita tildes y pasa a minúsculas para que "moño" encuentre "Mono" y viceversa.
export function normalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

export function filtrarProductos(productos, { tipos = [], estilo = 'todos', texto = '', precioMax = Infinity } = {}) {
    const busqueda = normalizar(texto);

    return productos.filter((producto) => {
        const coincideTipo = tipos.length === 0 || tipos.includes(producto.tipo);
        const coincideEstilo = estilo === 'todos' || producto.estilo === estilo;
        const coincidePrecio = producto.precioDia <= precioMax;
        const coincideTexto = busqueda === ''
            || normalizar(`${producto.nombre} ${producto.descripcion}`).includes(busqueda);

        return coincideTipo && coincideEstilo && coincidePrecio && coincideTexto;
    });
}

export function ordenarProductos(productos, criterio = 'destacados') {
    const copia = [...productos];

    switch (criterio) {
        case 'precio-asc':
            return copia.sort((a, b) => a.precioDia - b.precioDia);
        case 'precio-desc':
            return copia.sort((a, b) => b.precioDia - a.precioDia);
        case 'nombre':
            return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        default:
            return copia;
    }
}

export function estilosDisponibles(productos) {
    return [...new Set(productos.map((producto) => producto.estilo))];
}

export function formatearPrecio(monto) {
    return `$${Math.round(monto).toLocaleString('es-AR')}`;
}
