// Reglas de negocio de la reserva: días, precio y validación.
// No toca el DOM ni el almacenamiento, así se puede testear con Node.

export const DIAS_MAXIMOS = 14;
export const DIAS_PARA_DESCUENTO = 3;
export const PORCENTAJE_DESCUENTO = 10;

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATRON_TELEFONO = /^\+?[\d\s-]{8,20}$/;

// Las fechas viajan como "AAAA-MM-DD" (lo que devuelve un <input type="date">).
// Se interpretan en UTC para que la zona horaria no corra un día.
export function aFecha(texto) {
    if (!PATRON_FECHA.test(texto ?? '')) return null;
    const [anio, mes, dia] = texto.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    // Rechaza fechas imposibles como 2026-02-31.
    return fecha.getUTCDate() === dia ? fecha : null;
}

export function hoyComoTexto(ahora = new Date()) {
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// Días de alquiler: del día de retiro al de devolución. Retirar el 10 y devolver el 12 son 2 días.
export function calcularDias(retiro, devolucion) {
    const desde = aFecha(retiro);
    const hasta = aFecha(devolucion);
    if (!desde || !hasta) return 0;
    return Math.round((hasta - desde) / MS_POR_DIA);
}

export function calcularPresupuesto(prendas, dias) {
    const precioPorDia = prendas.reduce((total, prenda) => total + prenda.precioDia, 0);
    const subtotal = precioPorDia * Math.max(dias, 0);
    const descuento = dias >= DIAS_PARA_DESCUENTO
        ? Math.round(subtotal * PORCENTAJE_DESCUENTO / 100)
        : 0;

    return { precioPorDia, subtotal, descuento, total: subtotal - descuento };
}

// Devuelve un objeto { campo: mensaje }. Vacío = la reserva es válida.
export function validarReserva(datos, hoy = hoyComoTexto()) {
    const errores = {};
    const nombre = (datos.nombre ?? '').trim();

    if (nombre.length < 2) {
        errores.nombre = 'Ingresá tu nombre (al menos 2 letras).';
    }

    if (!PATRON_EMAIL.test((datos.email ?? '').trim())) {
        errores.email = 'Ingresá un email válido, por ejemplo nombre@correo.com.';
    }

    const telefono = (datos.telefono ?? '').trim();
    if (telefono !== '' && !PATRON_TELEFONO.test(telefono)) {
        errores.telefono = 'El teléfono sólo puede tener números, espacios, guiones y un + al inicio.';
    }

    if (!datos.prendas || datos.prendas.length === 0) {
        errores.prendas = 'Elegí al menos una prenda.';
    }

    const retiro = aFecha(datos.retiro);
    const devolucion = aFecha(datos.devolucion);

    if (!retiro) {
        errores.retiro = 'Elegí la fecha de retiro.';
    } else if (datos.retiro < hoy) {
        errores.retiro = 'La fecha de retiro no puede ser anterior a hoy.';
    }

    if (!devolucion) {
        errores.devolucion = 'Elegí la fecha de devolución.';
    } else if (retiro) {
        const dias = calcularDias(datos.retiro, datos.devolucion);
        if (dias < 1) {
            errores.devolucion = 'La devolución tiene que ser al menos un día después del retiro.';
        } else if (dias > DIAS_MAXIMOS) {
            errores.devolucion = `El alquiler no puede superar los ${DIAS_MAXIMOS} días.`;
        }
    }

    return errores;
}

// Código corto y legible para mostrarle al cliente, por ejemplo "ET-7K2QX".
export function generarCodigo(aleatorio = Math.random) {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 5; i++) {
        codigo += caracteres[Math.floor(aleatorio() * caracteres.length)];
    }
    return `ET-${codigo}`;
}
