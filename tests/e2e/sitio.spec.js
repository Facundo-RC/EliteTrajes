import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Sin conexión a internet (BOOTSTRAP_LOCAL=1) Bootstrap se sirve desde node_modules
// y las fotos de Unsplash se omiten, para que las pruebas no dependan de la red.
test.beforeEach(async ({ page }) => {
    if (!process.env.BOOTSTRAP_LOCAL) return;
    const dist = fileURLToPath(new URL('../../node_modules/bootstrap/dist/', import.meta.url));
    await page.route('**/cdn.jsdelivr.net/**', (route) => {
        const url = route.request().url();
        if (url.endsWith('bootstrap.min.css')) return route.fulfill({ path: `${dist}css/bootstrap.min.css` });
        if (url.endsWith('bootstrap.bundle.min.js')) return route.fulfill({ path: `${dist}js/bootstrap.bundle.min.js` });
        return route.abort();
    });
    await page.route(/unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
});

function enDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

test.describe('Catálogo de trajes', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('pages/trajes.html');
        await expect(page.locator('.traje-card')).toHaveCount(6);
    });

    test('muestra los 6 trajes y el contador', async ({ page }) => {
        await expect(page.locator('#contador-trajes')).toHaveText('Mostrando 6 de 6 trajes');
    });

    test('filtra por estilo y marca el botón activo', async ({ page }) => {
        const slim = page.getByRole('button', { name: 'Slim Fit' });
        await slim.click();
        await expect(page.locator('.traje-card')).toHaveCount(2);
        await expect(slim).toHaveAttribute('aria-pressed', 'true');
    });

    test('la búsqueda ignora tildes y mayúsculas', async ({ page }) => {
        await page.getByLabel('Buscar trajes').fill('ESMÓQUIN');
        await expect(page.locator('.traje-card')).toHaveCount(1);
        await expect(page.locator('.traje-card__titulo')).toHaveText('Esmoquin Negro');
    });

    test('sin resultados muestra un aviso y permite limpiar los filtros', async ({ page }) => {
        await page.getByLabel('Buscar trajes').fill('zzzz');
        await expect(page.getByText('No hay trajes con esos filtros')).toBeVisible();
        await page.getByRole('button', { name: 'Limpiar filtros' }).click();
        await expect(page.locator('.traje-card')).toHaveCount(6);
        await expect(page.getByLabel('Buscar trajes')).toHaveValue('');
    });

    test('ordena por precio de mayor a menor', async ({ page }) => {
        await page.getByLabel('Ordenar').selectOption('precio-desc');
        await expect(page.locator('.traje-card__precio').first()).toHaveText('$12.000 / día');
        await expect(page.locator('.traje-card__precio').last()).toHaveText('$8.200 / día');
    });

    test('el botón Reservar lleva a la reserva con la prenda elegida', async ({ page }) => {
        await page.getByRole('link', { name: 'Reservar Traje Gris Perla' }).click();
        await expect(page).toHaveURL(/contacto\.html\?prenda=traje-gris-perla/);
        await expect(page.getByLabel(/Traje Gris Perla/)).toBeChecked();
    });

    test('al llegar a la reserva, la barra fija no tapa el formulario', async ({ page }) => {
        await page.goto('pages/contacto.html?prenda=traje-gris-perla#reserva');
        await expect(page.locator('#lista-prendas input')).toHaveCount(14);
        // Vuelve a saltar al ancla ya con todo cargado, como pasa al tocar el enlace.
        await page.evaluate(() => { location.hash = ''; location.hash = 'reserva'; });
        await page.waitForTimeout(800);
        const barra = await page.locator('nav.navbar').boundingBox();
        const formulario = await page.locator('#reserva').boundingBox();
        expect(formulario.y).toBeGreaterThanOrEqual(barra.y + barra.height);
    });
});

test.describe('Accesorios', () => {
    test('las pestañas muestran cada categoría', async ({ page }) => {
        await page.goto('pages/accesorios.html');
        await expect(page.locator('.accesorio-card')).toHaveCount(8);

        await page.getByRole('button', { name: 'Calzado' }).click();
        await expect(page.locator('#bloque-corbatas')).toBeHidden();
        await expect(page.locator('#bloque-calzado .accesorio-card')).toHaveCount(3);

        await page.getByRole('button', { name: 'Corbatas' }).click();
        await expect(page.locator('#bloque-calzado')).toBeHidden();
        await expect(page.locator('#bloque-corbatas .accesorio-card')).toHaveCount(5);

        await page.getByRole('button', { name: 'Todos' }).click();
        await expect(page.locator('.accesorio-card:visible')).toHaveCount(8);
    });
});

test.describe('Reserva', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('pages/contacto.html');
        await expect(page.locator('#lista-prendas input')).toHaveCount(14);
    });

    test('enviar vacío marca los errores y enfoca el primero', async ({ page }) => {
        await page.getByRole('button', { name: 'Confirmar reserva' }).click();
        await expect(page.locator('#error-nombre')).toBeVisible();
        await expect(page.locator('#error-email')).toBeVisible();
        await expect(page.locator('#error-prendas')).toBeVisible();
        await expect(page.locator('#nombre')).toBeFocused();
        await expect(page.locator('#nombre')).toHaveAttribute('aria-invalid', 'true');
    });

    test('calcula el presupuesto con descuento desde 3 días', async ({ page }) => {
        await page.getByLabel(/Traje Gris Perla/).check();
        await page.getByLabel(/Corbata Negra Clásica/).check();
        await page.getByLabel('Retiro').fill(enDias(2));
        await page.getByLabel('Devolución').fill(enDias(5));
        await expect(page.locator('#presu-dias')).toHaveText('3');
        await expect(page.locator('#presu-subtotal')).toHaveText('$29.700');
        await expect(page.locator('#presu-descuento')).toHaveText('− $2.970 (10%)');
        await expect(page.locator('#presu-total')).toHaveText('$26.730');
    });

    test('no acepta una devolución anterior al retiro', async ({ page }) => {
        await page.getByLabel(/Traje Negro Clásico/).check();
        await page.getByLabel('Retiro').fill(enDias(4));
        await page.getByLabel('Devolución').fill(enDias(2));
        await page.getByRole('button', { name: 'Confirmar reserva' }).click();
        await expect(page.locator('#error-devolucion')).toContainText('después del retiro');
    });

    test('confirma, guarda, sobrevive a la recarga y se puede cancelar', async ({ page }) => {
        await page.getByLabel('Nombre y apellido').fill('Facundo Robaño');
        await page.getByLabel('Email').fill('facundo@correo.com');
        await page.getByLabel(/Esmoquin Negro/).check();
        await page.getByLabel('Retiro').fill(enDias(1));
        await page.getByLabel('Devolución').fill(enDias(2));
        await page.getByRole('button', { name: 'Confirmar reserva' }).click();

        const codigo = page.locator('.confirmacion__codigo');
        await expect(codigo).toHaveText(/^ET-[A-Z0-9]{5}$/);
        const texto = await codigo.textContent();

        await page.reload();
        await expect(page.locator('#lista-reservas')).toContainText(texto);

        await page.getByRole('button', { name: `Cancelar la reserva ${texto}` }).click();
        await expect(page.locator('#mis-reservas')).toBeHidden();
    });
});

test.describe('Todas las páginas', () => {
    for (const ruta of ['index.html', 'pages/trajes.html', 'pages/accesorios.html', 'pages/nosotros.html', 'pages/contacto.html']) {
        test(`${ruta}: sin errores de JavaScript y sin scroll horizontal`, async ({ page }) => {
            const errores = [];
            page.on('pageerror', (error) => errores.push(error.message));
            await page.goto(ruta);
            await page.waitForLoadState('networkidle');
            expect(errores).toEqual([]);
            const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
            expect(desborda).toBe(false);
        });
    }

    test('el primer Tab lleva al enlace para saltar al contenido', async ({ page }) => {
        await page.goto('index.html');
        await page.keyboard.press('Tab');
        await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
    });
});
