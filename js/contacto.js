// Página de contacto: formulario de reserva con presupuesto en vivo,
// validación con mensajes por campo y reservas guardadas en el navegador.

import { formatearPrecio } from './catalogo.js';
import {
    calcularDias,
    calcularPresupuesto,
    validarReserva,
    generarCodigo,
    hoyComoTexto,
    RECARGO_DIA_EXTRA
} from './reserva.js';
import { cargarProductos, crear } from './dom.js';

const CLAVE_STORAGE = 'elite-trajes:reservas';
const NOMBRES_TIPO = { traje: 'Trajes', corbata: 'Corbatas y moños', calzado: 'Calzado' };
const CAMPOS = ['nombre', 'email', 'telefono', 'prendas', 'retiro', 'devolucion'];

const formulario = document.getElementById('form-reserva');
const listaPrendas = document.getElementById('lista-prendas');
const campoRetiro = document.getElementById('retiro');
const campoDevolucion = document.getElementById('devolucion');
const confirmacion = document.getElementById('confirmacion');
const seccionReservas = document.getElementById('mis-reservas');
const listaReservas = document.getElementById('lista-reservas');

let productos = [];

// ---------- Almacenamiento ----------

function leerReservas() {
    try {
        const guardadas = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
        return Array.isArray(guardadas) ? guardadas : [];
    } catch {
        return [];
    }
}

function guardarReservas(reservas) {
    try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(reservas));
        return true;
    } catch {
        return false;
    }
}

// ---------- Lectura del formulario ----------

function prendasElegidas() {
    const ids = [...listaPrendas.querySelectorAll('input:checked')].map((casilla) => casilla.value);
    return productos.filter((producto) => ids.includes(producto.id));
}

function leerFormulario() {
    const datos = new FormData(formulario);
    return {
        nombre: datos.get('nombre') ?? '',
        email: datos.get('email') ?? '',
        telefono: datos.get('telefono') ?? '',
        evento: datos.get('evento') ?? '',
        mensaje: (datos.get('mensaje') ?? '').trim(),
        retiro: datos.get('retiro') ?? '',
        devolucion: datos.get('devolucion') ?? '',
        prendas: prendasElegidas()
    };
}

// ---------- Prendas ----------

function dibujarPrendas(preseleccionada) {
    const grupos = Object.entries(NOMBRES_TIPO).map(([tipo, titulo]) => {
        const opciones = productos
            .filter((producto) => producto.tipo === tipo)
            .map((producto) => {
                const casilla = crear('input', {
                    clase: 'form-check-input',
                    atributos: { type: 'checkbox', name: 'prendas', value: producto.id, id: `prenda-${producto.id}` }
                });
                casilla.checked = producto.id === preseleccionada;

                return crear('div', { clase: 'form-check prendas__opcion' }, [
                    casilla,
                    crear('label', { clase: 'form-check-label', atributos: { for: `prenda-${producto.id}` } }, [
                        crear('span', { texto: producto.nombre }),
                        crear('span', { clase: 'prendas__precio', texto: formatearPrecio(producto.precio) })
                    ])
                ]);
            });

        return crear('div', { clase: 'prendas__grupo' }, [
            crear('p', { clase: 'prendas__grupo-titulo', texto: titulo }),
            ...opciones
        ]);
    });

    listaPrendas.replaceChildren(...grupos);
}

// ---------- Presupuesto ----------

function actualizarPresupuesto() {
    const { retiro, devolucion, prendas } = leerFormulario();
    const dias = calcularDias(retiro, devolucion);
    const diasValidos = dias > 0 ? dias : 0;
    const { alquiler, diasExtra, recargo, total } = calcularPresupuesto(prendas, diasValidos);

    document.getElementById('presu-prendas').textContent = prendas.length;
    document.getElementById('presu-dias').textContent = diasValidos ? `${diasValidos}` : '—';
    document.getElementById('presu-alquiler').textContent = formatearPrecio(alquiler);
    document.getElementById('presu-recargo').textContent = recargo
        ? `${formatearPrecio(recargo)} (${diasExtra} ${diasExtra === 1 ? 'día' : 'días'} × ${RECARGO_DIA_EXTRA}%)`
        : formatearPrecio(0);
    document.getElementById('presu-total').textContent = formatearPrecio(total);
}

// La devolución no puede ser antes del retiro: se ajusta el mínimo del calendario.
function ajustarFechas() {
    const hoy = hoyComoTexto();
    campoRetiro.min = hoy;
    campoDevolucion.min = campoRetiro.value || hoy;
}

// ---------- Errores ----------

function mostrarErrores(errores) {
    for (const campo of CAMPOS) {
        const mensaje = errores[campo] ?? '';
        const salida = document.getElementById(`error-${campo}`);
        salida.textContent = mensaje;
        salida.classList.toggle('d-block', Boolean(mensaje));

        if (campo === 'prendas') {
            listaPrendas.classList.toggle('is-invalid', Boolean(mensaje));
        } else {
            const entrada = document.getElementById(campo);
            entrada.classList.toggle('is-invalid', Boolean(mensaje));
            entrada.setAttribute('aria-invalid', String(Boolean(mensaje)));
        }
    }
}

function enfocarPrimerError(errores) {
    const primero = CAMPOS.find((campo) => errores[campo]);
    if (!primero) return;
    const destino = primero === 'prendas' ? listaPrendas.querySelector('input') : document.getElementById(primero);
    destino?.focus();
}

// ---------- Reservas guardadas ----------

function describirFecha(texto) {
    const [anio, mes, dia] = texto.split('-');
    return `${dia}/${mes}/${anio}`;
}

function dibujarReservas() {
    const reservas = leerReservas();
    seccionReservas.hidden = reservas.length === 0;

    listaReservas.replaceChildren(...reservas.map((reserva) => {
        const cancelar = crear('button', {
            clase: 'mis-reservas__cancelar',
            texto: 'Cancelar',
            atributos: { type: 'button', 'aria-label': `Cancelar la reserva ${reserva.codigo}` }
        });
        cancelar.addEventListener('click', () => {
            guardarReservas(leerReservas().filter((r) => r.codigo !== reserva.codigo));
            dibujarReservas();
        });

        return crear('li', { clase: 'mis-reservas__item' }, [
            crear('div', {}, [
                crear('p', { clase: 'mis-reservas__codigo', texto: reserva.codigo }),
                crear('p', { clase: 'mis-reservas__detalle', texto: reserva.prendas.join(', ') }),
                crear('p', {
                    clase: 'mis-reservas__detalle',
                    texto: `${describirFecha(reserva.retiro)} al ${describirFecha(reserva.devolucion)} · ${formatearPrecio(reserva.total)}`
                })
            ]),
            cancelar
        ]);
    }));
}

function mostrarConfirmacion(reserva, guardada) {
    const nuevaReserva = crear('button', { clase: 'confirmacion__btn', texto: 'Hacer otra reserva', atributos: { type: 'button' } });
    nuevaReserva.addEventListener('click', () => {
        confirmacion.hidden = true;
        formulario.hidden = false;
        document.getElementById('nombre').focus();
    });

    confirmacion.replaceChildren(
        crear('p', { clase: 'confirmacion__eyebrow', texto: 'Reserva confirmada' }),
        crear('p', { clase: 'confirmacion__codigo', texto: reserva.codigo }),
        crear('p', {
            clase: 'confirmacion__texto',
            texto: `Gracias, ${reserva.nombre}. Te esperamos el ${describirFecha(reserva.retiro)} para retirar tu pedido. Total: ${formatearPrecio(reserva.total)}.`
        }),
        ...(guardada ? [] : [crear('p', {
            clase: 'confirmacion__texto',
            texto: 'Tu navegador no permitió guardar la reserva: anotá el código.'
        })]),
        nuevaReserva
    );

    formulario.hidden = true;
    confirmacion.hidden = false;
    confirmacion.focus();
}

// ---------- Envío ----------

function enviar(evento) {
    evento.preventDefault();
    const datos = leerFormulario();
    const errores = validarReserva(datos);
    mostrarErrores(errores);

    if (Object.keys(errores).length > 0) {
        enfocarPrimerError(errores);
        return;
    }

    const dias = calcularDias(datos.retiro, datos.devolucion);
    const reserva = {
        codigo: generarCodigo(),
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        telefono: datos.telefono.trim(),
        evento: datos.evento,
        mensaje: datos.mensaje,
        retiro: datos.retiro,
        devolucion: datos.devolucion,
        dias,
        prendas: datos.prendas.map((prenda) => prenda.nombre),
        total: calcularPresupuesto(datos.prendas, dias).total,
        creada: new Date().toISOString()
    };

    const guardada = guardarReservas([reserva, ...leerReservas()]);
    formulario.reset();
    ajustarFechas();
    actualizarPresupuesto();
    mostrarConfirmacion(reserva, guardada);
    dibujarReservas();
}

// ---------- Inicio ----------

async function iniciar() {
    ajustarFechas();
    dibujarReservas();

    try {
        productos = await cargarProductos('../data/productos.json');
    } catch {
        listaPrendas.replaceChildren(crear('p', {
            clase: 'prendas__cargando',
            texto: 'No pudimos cargar las prendas. Volvé a cargar la página.'
        }));
        return;
    }

    const preseleccionada = new URLSearchParams(location.search).get('prenda');
    dibujarPrendas(preseleccionada);
    actualizarPresupuesto();

    formulario.addEventListener('input', (evento) => {
        if (evento.target === campoRetiro) ajustarFechas();
        actualizarPresupuesto();
    });
    formulario.addEventListener('change', actualizarPresupuesto);
    formulario.addEventListener('submit', enviar);
}

iniciar();
