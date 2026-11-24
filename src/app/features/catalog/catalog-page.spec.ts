import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api';
import { StaffRole } from '../../core/auth/roles';
import { SessionStore } from '../../core/auth/session-store';
import { fakeJwt, staffUser } from '../../core/auth/testing';
import { CatalogPage } from './catalog-page';

const API = 'https://api.test/api/v1';

const CATEGORIES = [
  { id: 1, nombre: 'Bebidas', sucursal_id: 1 },
  { id: 2, nombre: 'Postres', sucursal_id: 1 },
];
const PRODUCTS = [
  {
    id: 10,
    codigo: 'P010',
    nombre: 'Café Espresso',
    descripcion: null,
    precio: 1.75,
    cantidad_disponible: 3,
    estado: 'disponible',
    categoria_id: 1,
    sucursal_id: 1,
    imagen_codigo: 'cafe_espresso',
  },
  {
    id: 11,
    codigo: 'P011',
    nombre: 'Flan',
    descripcion: null,
    precio: 3.5,
    cantidad_disponible: 0,
    estado: 'no disponible',
    categoria_id: 2,
    sucursal_id: 1,
    imagen_codigo: null,
  },
];

describe('CatalogPage', () => {
  let backend: HttpTestingController;

  function setup() {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  }

  beforeEach(setup);

  async function render(rol: StaffRole, sucursal_id: number | null = 1) {
    TestBed.inject(SessionStore).start(fakeJwt(3600), staffUser({ rol, sucursal_id }));
    const fixture = TestBed.createComponent(CatalogPage);
    if (sucursal_id) {
      backend
        .expectOne(`${API}/categorias?sucursal_id=${sucursal_id}`)
        .flush({ success: true, data: CATEGORIES });
      backend
        .expectOne(`${API}/productos?sucursal_id=${sucursal_id}`)
        .flush({ success: true, data: PRODUCTS });
    }
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const button = (el: HTMLElement, label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label));

  it('lista los productos de la sucursal con sus categorías', async () => {
    const { el } = await render('cajero');
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Café Espresso');
    expect(rows[0].textContent).toContain('Bebidas');
    expect(el.querySelector('.stock--low')?.textContent?.trim()).toBe('3');
    expect(el.querySelector('.stock--out')?.textContent?.trim()).toBe('0');
  });

  it('filtra por categoría al elegirla', async () => {
    const { fixture, el } = await render('cajero');
    button(el, 'Postres')!.click();
    await fixture.whenStable();
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Flan');
  });

  it('el cajero no ve Eliminar', async () => {
    const { el } = await render('cajero');
    expect(el.querySelector('[aria-label="Eliminar Flan"]')).toBeNull();
    expect(el.querySelector('[aria-label="Eliminar Postres"]')).toBeNull();
  });

  it('el admin elimina un producto tras confirmar', async () => {
    const { fixture, el } = await render('admin');
    (el.querySelector('[aria-label="Eliminar Flan"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    button(el, 'Sí')!.click();
    const req = backend.expectOne(`${API}/productos/11`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: null });
    await fixture.whenStable();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('activa un producto no disponible', async () => {
    const { fixture, el } = await render('cajero');
    (el.querySelector('[aria-label="Activar Flan"]') as HTMLButtonElement).click();
    const req = backend.expectOne(`${API}/productos/11`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'disponible' });
    req.flush({ success: true, data: { ...PRODUCTS[1], estado: 'disponible' } });
    await fixture.whenStable();
    expect(el.querySelector('[aria-label="Desactivar Flan"]')).not.toBeNull();
  });

  it('crea una categoría en la sucursal propia sin enviar sucursal_id', async () => {
    const { fixture, el } = await render('cajero');
    const input = el.querySelector<HTMLInputElement>('#nueva-categoria')!;
    input.value = 'Entradas';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector<HTMLFormElement>('.new-category')!.dispatchEvent(new Event('submit'));
    const req = backend.expectOne(`${API}/categorias`);
    expect(req.request.body).toEqual({ nombre: 'Entradas' });
    req.flush({ success: true, data: { id: 3, nombre: 'Entradas', sucursal_id: 1 } });
    await fixture.whenStable();
    expect(el.querySelector('.categories')?.textContent).toContain('Entradas');
  });

  it('sin sucursal propia elige una y la usa', async () => {
    const { fixture, el } = await render('admin', null);
    backend.expectOne(`${API}/sucursales`).flush({
      success: true,
      data: [
        { id: 1, nombre: 'Principal', restaurante_id: 1 },
        { id: 2, nombre: 'Norte', restaurante_id: 1 },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(el.textContent).toContain('Elige una sucursal');
    expect(el.querySelectorAll('#sucursal option').length).toBe(3);
    const select = el.querySelector<HTMLSelectElement>('#sucursal')!;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    backend.expectOne(`${API}/categorias?sucursal_id=2`).flush({ success: true, data: [] });
    backend.expectOne(`${API}/productos?sucursal_id=2`).flush({ success: true, data: [] });
    await fixture.whenStable();
    expect(el.textContent).toContain('Crea una categoría antes de agregar productos.');
  });
});
