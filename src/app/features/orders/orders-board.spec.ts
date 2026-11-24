import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api';
import { StaffRole } from '../../core/auth/roles';
import { SessionStore } from '../../core/auth/session-store';
import { fakeJwt, staffUser } from '../../core/auth/testing';
import { todayIn } from './order-rules';
import { Order, Payment } from './orders-api';
import { OrdersBoard } from './orders-board';
import { order } from './testing';

const API = 'https://api.test/api/v1';

describe('OrdersBoard', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [OrdersBoard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  async function render(rol: StaffRole, orders: Order[], payments: Payment[] = []) {
    TestBed.inject(SessionStore).start(fakeJwt(3600), staffUser({ id: 5, rol }));
    const fixture = TestBed.createComponent(OrdersBoard);
    backend.expectOne(`${API}/pedidos`).flush({ success: true, data: orders });
    backend.expectOne(`${API}/pagos`).flush({ success: true, data: payments });
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const buttons = (el: HTMLElement) =>
    [...el.querySelectorAll('button')].map((b) => b.textContent?.trim());
  const today = todayIn();

  it('reparte los pedidos de hoy en sus columnas', async () => {
    const { el } = await render('cajero', [
      order({ id: 1, fecha: today, estado: 'solicitado' }),
      order({ id: 2, fecha: today, estado: 'listo' }),
      order({ id: 3, fecha: '2020-01-01', estado: 'solicitado' }),
    ]);
    const columns = [...el.querySelectorAll('section.column')];
    expect(columns[0].textContent).toContain('#1');
    expect(columns[0].textContent).not.toContain('#3');
    expect(columns[3].textContent).toContain('#2');
  });

  it('al confirmar asigna como responsable a quien avanza', async () => {
    const { fixture, el } = await render('cajero', [order({ id: 1, fecha: today })]);
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Confirmar')!.click();
    const req = backend.expectOne(`${API}/pedidos/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'confirmado', empleado_id: 5 });
    req.flush({ success: true, data: order({ id: 1, estado: 'confirmado', empleado_id: 5 }) });
    await fixture.whenStable();
    backend.expectOne(`${API}/pedidos`).flush({ success: true, data: [] });
    backend.expectOne(`${API}/pagos`).flush({ success: true, data: [] });
    backend.verify();
  });

  it('el mesero no ve acciones de estado ni cobro, pero sí crea pedidos', async () => {
    const { el } = await render('mesero', [order({ id: 1, fecha: today, estado: 'confirmado' })]);
    const labels = buttons(el);
    expect(labels).not.toContain('Iniciar preparación');
    expect(labels).not.toContain('Cobrar');
    expect(labels).not.toContain('Cancelar');
    expect(labels).toContain('+ Nuevo pedido');
  });

  it('el cocinero avanza pedidos pero no cancela, cobra ni crea', async () => {
    const { el } = await render('cocinero', [order({ id: 1, fecha: today, estado: 'confirmado' })]);
    const labels = buttons(el);
    expect(labels).toContain('Iniciar preparación');
    expect(labels).not.toContain('Cobrar');
    expect(labels).not.toContain('Cancelar');
    expect(labels).not.toContain('+ Nuevo pedido');
  });

  it('muestra el error del servidor', async () => {
    TestBed.inject(SessionStore).start(fakeJwt(3600), staffUser({ rol: 'cajero' }));
    const fixture = TestBed.createComponent(OrdersBoard);
    backend
      .expectOne(`${API}/pedidos`)
      .flush(
        { success: false, message: 'Fallo del servidor' },
        { status: 500, statusText: 'Error' },
      );
    backend.expectOne(`${API}/pagos`).flush({ success: true, data: [] });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Fallo del servidor');
  });
});
