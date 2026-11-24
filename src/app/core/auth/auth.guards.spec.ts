import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '../ui/toast.service';
import { authGuard, guestGuard, homeRedirectGuard, roleGuard } from './auth.guards';
import { SessionStore } from './session-store';
import { fakeJwt, staffUser } from './testing';

@Component({ template: '' })
class Blank {}

describe('guards', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', canActivate: [guestGuard], component: Blank },
          {
            path: '',
            canActivate: [authGuard],
            children: [
              { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
              {
                path: 'dashboard',
                canActivate: [roleGuard],
                data: { roles: ['admin', 'cajero'] },
                component: Blank,
              },
              {
                path: 'pedidos',
                canActivate: [roleGuard],
                data: { roles: ['admin', 'cajero', 'cocinero'] },
                component: Blank,
              },
              {
                path: 'usuarios',
                canActivate: [roleGuard],
                data: { roles: ['admin'] },
                component: Blank,
              },
            ],
          },
        ]),
      ],
    });
  });

  const url = () => TestBed.inject(Router).url;

  it('sin sesión lleva al login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pedidos');
    expect(url()).toBe('/login');
  });

  it('la raíz lleva al inicio del rol', async () => {
    TestBed.inject(SessionStore).start(fakeJwt(3600), staffUser({ rol: 'cocinero' }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(url()).toBe('/pedidos');
  });

  it('un rol sin permiso vuelve a su inicio con un aviso', async () => {
    TestBed.inject(SessionStore).start(fakeJwt(3600), staffUser({ rol: 'cajero' }));
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/usuarios');
    expect(url()).toBe('/dashboard');
    expect(toast).toHaveBeenCalled();
  });

  it('con sesión, el login lleva al inicio del rol', async () => {
    TestBed.inject(SessionStore).start(fakeJwt(3600), staffUser({ rol: 'admin' }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(url()).toBe('/dashboard');
  });
});
