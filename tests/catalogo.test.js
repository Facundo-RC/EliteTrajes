import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    filtrarProductos,
    ordenarProductos,
    estilosDisponibles,
    normalizar,
    formatearPrecio
} from '../js/catalogo.js';

const productos = JSON.parse(await readFile(new URL('../data/productos.json', import.meta.url), 'utf8'));

test('los datos del catálogo tienen todos los campos y ids únicos', () => {
    const ids = new Set();
    for (const producto of productos) {
        for (const campo of ['id', 'tipo', 'estilo', 'nombre', 'precio', 'descripcion', 'imagen', 'alt']) {
            assert.ok(producto[campo] !== undefined && producto[campo] !== '', `${producto.id} sin ${campo}`);
        }
        assert.ok(['traje', 'corbata', 'calzado'].includes(producto.tipo), `tipo inválido en ${producto.id}`);
        assert.ok(producto.precio > 0, `precio inválido en ${producto.id}`);
        assert.ok(!ids.has(producto.id), `id repetido: ${producto.id}`);
        ids.add(producto.id);
    }
});

test('sin filtros devuelve todo el catálogo', () => {
    assert.equal(filtrarProductos(productos).length, productos.length);
});

test('filtra por tipo', () => {
    const trajes = filtrarProductos(productos, { tipos: ['traje'] });
    assert.equal(trajes.length, 6);
    assert.ok(trajes.every((p) => p.tipo === 'traje'));
});

test('filtra por varios tipos a la vez', () => {
    const accesorios = filtrarProductos(productos, { tipos: ['corbata', 'calzado'] });
    assert.equal(accesorios.length, 8);
});

test('filtra por estilo', () => {
    const slim = filtrarProductos(productos, { tipos: ['traje'], estilo: 'Slim Fit' });
    assert.deepEqual(slim.map((p) => p.id), ['traje-azul-marino-slim', 'traje-beige-verano']);
});

test('la búsqueda no distingue mayúsculas ni tildes', () => {
    // El esmoquin aparece porque su descripción dice "camisa y moño".
    const esperado = ['esmoquin-negro', 'mono-negro-esmoquin'];
    assert.deepEqual(filtrarProductos(productos, { texto: 'MONO' }).map((p) => p.id), esperado);
    assert.deepEqual(filtrarProductos(productos, { texto: 'moño' }).map((p) => p.id), esperado);
});

test('la búsqueda también mira la descripción', () => {
    const resultado = filtrarProductos(productos, { texto: 'egresados' });
    assert.deepEqual(resultado.map((p) => p.id), ['traje-gris-perla']);
});

test('una búsqueda sin coincidencias devuelve una lista vacía', () => {
    assert.deepEqual(filtrarProductos(productos, { texto: 'zzzz' }), []);
});

test('el precio máximo incluye el valor exacto', () => {
    const resultado = filtrarProductos(productos, { tipos: ['traje'], precioMax: 2000 });
    assert.deepEqual(resultado.map((p) => p.precio).sort(), [1800, 2000, 2000]);
});

test('ordena por precio ascendente y descendente', () => {
    const asc = ordenarProductos(productos, 'precio-asc').map((p) => p.precio);
    const desc = ordenarProductos(productos, 'precio-desc').map((p) => p.precio);
    assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
    assert.deepEqual(desc, [...asc].reverse());
});

test('ordena por nombre respetando el español', () => {
    const nombres = ordenarProductos(productos, 'nombre').map((p) => p.nombre);
    assert.equal(nombres[0], 'Corbata Azul Navy');
});

test('ordenar no modifica la lista original', () => {
    const antes = productos.map((p) => p.id);
    ordenarProductos(productos, 'precio-asc');
    assert.deepEqual(productos.map((p) => p.id), antes);
});

test('lista los estilos sin repetir', () => {
    const estilos = estilosDisponibles(filtrarProductos(productos, { tipos: ['traje'] }));
    assert.deepEqual(estilos, ['Clásico', 'Slim Fit', 'Esmoquin']);
});

test('normaliza y formatea', () => {
    assert.equal(normalizar('  Moño  '), 'mono');
    assert.equal(normalizar(undefined), '');
    assert.equal(formatearPrecio(12000), '$ 12.000');
    assert.equal(formatearPrecio(1800), '$ 1.800');
});
