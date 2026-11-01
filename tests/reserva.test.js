import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    aFecha,
    calcularDias,
    calcularPresupuesto,
    validarReserva,
    generarCodigo,
    hoyComoTexto,
    DIAS_MAXIMOS
} from '../js/reserva.js';

const HOY = '2026-11-01';
const traje = { id: 'traje', precioDia: 8500 };
const corbata = { id: 'corbata', precioDia: 1200 };

const reservaValida = () => ({
    nombre: 'Facundo',
    email: 'facundo@correo.com',
    telefono: '+598 97 462 216',
    prendas: [traje],
    retiro: '2026-11-10',
    devolucion: '2026-11-12'
});

test('interpreta fechas válidas y rechaza las imposibles', () => {
    assert.ok(aFecha('2026-11-10'));
    assert.equal(aFecha('2026-02-31'), null);
    assert.equal(aFecha('10/11/2026'), null);
    assert.equal(aFecha(''), null);
    assert.equal(aFecha(undefined), null);
});

test('cuenta los días de alquiler', () => {
    assert.equal(calcularDias('2026-11-10', '2026-11-12'), 2);
    assert.equal(calcularDias('2026-11-10', '2026-11-11'), 1);
    assert.equal(calcularDias('2026-11-10', '2026-11-10'), 0);
});

test('cuenta bien los días al cambiar de mes y de año', () => {
    assert.equal(calcularDias('2026-11-30', '2026-12-02'), 2);
    assert.equal(calcularDias('2026-12-31', '2027-01-01'), 1);
});

test('días con una fecha vacía da cero', () => {
    assert.equal(calcularDias('', '2026-11-12'), 0);
});

test('presupuesto sin descuento por debajo de 3 días', () => {
    assert.deepEqual(calcularPresupuesto([traje, corbata], 2), {
        precioPorDia: 9700, subtotal: 19400, descuento: 0, total: 19400
    });
});

test('presupuesto con 10% de descuento desde 3 días', () => {
    assert.deepEqual(calcularPresupuesto([traje], 3), {
        precioPorDia: 8500, subtotal: 25500, descuento: 2550, total: 22950
    });
});

test('presupuesto vacío da cero', () => {
    assert.equal(calcularPresupuesto([], 4).total, 0);
    assert.equal(calcularPresupuesto([traje], 0).total, 0);
});

test('una reserva completa es válida', () => {
    assert.deepEqual(validarReserva(reservaValida(), HOY), {});
});

test('el teléfono es opcional', () => {
    assert.deepEqual(validarReserva({ ...reservaValida(), telefono: '' }, HOY), {});
});

test('exige nombre, email, prendas y fechas', () => {
    const errores = validarReserva({}, HOY);
    assert.deepEqual(Object.keys(errores).sort(), ['devolucion', 'email', 'nombre', 'prendas', 'retiro']);
});

test('rechaza un nombre de una sola letra', () => {
    assert.ok(validarReserva({ ...reservaValida(), nombre: ' F ' }, HOY).nombre);
});

test('rechaza emails mal escritos', () => {
    for (const email of ['facundo', 'facundo@', 'facundo@correo', 'facu ndo@correo.com']) {
        assert.ok(validarReserva({ ...reservaValida(), email }, HOY).email, email);
    }
});

test('rechaza teléfonos con letras', () => {
    assert.ok(validarReserva({ ...reservaValida(), telefono: '097-ABC-216' }, HOY).telefono);
});

test('no permite retirar en una fecha pasada', () => {
    const errores = validarReserva({ ...reservaValida(), retiro: '2026-10-31' }, HOY);
    assert.match(errores.retiro, /anterior a hoy/);
});

test('permite retirar hoy mismo', () => {
    assert.deepEqual(validarReserva({ ...reservaValida(), retiro: HOY, devolucion: '2026-11-02' }, HOY), {});
});

test('la devolución tiene que ser posterior al retiro', () => {
    const mismoDia = validarReserva({ ...reservaValida(), devolucion: '2026-11-10' }, HOY);
    const antes = validarReserva({ ...reservaValida(), devolucion: '2026-11-09' }, HOY);
    assert.ok(mismoDia.devolucion);
    assert.ok(antes.devolucion);
});

test(`acepta hasta ${DIAS_MAXIMOS} días y rechaza uno más`, () => {
    assert.deepEqual(validarReserva({ ...reservaValida(), devolucion: '2026-11-24' }, HOY), {});
    assert.match(validarReserva({ ...reservaValida(), devolucion: '2026-11-25' }, HOY).devolucion, /14 días/);
});

test('genera códigos con el formato esperado', () => {
    assert.match(generarCodigo(), /^ET-[A-HJ-NP-Z2-9]{5}$/);
    assert.equal(generarCodigo(() => 0), 'ET-AAAAA');
});

test('arma la fecha de hoy con el formato de los inputs', () => {
    assert.equal(hoyComoTexto(new Date(2026, 0, 5)), '2026-01-05');
});
