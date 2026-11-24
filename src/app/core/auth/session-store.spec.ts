import { TestBed } from '@angular/core/testing';
import { jwtExpiresAt } from './jwt';
import { SessionStore } from './session-store';
import { fakeJwt, staffUser } from './testing';

describe('SessionStore', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('lee el vencimiento del JWT', () => {
    const token = fakeJwt(60);
    expect(jwtExpiresAt(token)).toBeGreaterThan(Date.now());
    expect(jwtExpiresAt('no-es-un-jwt')).toBeUndefined();
  });

  it('inicia sesión, guarda en sessionStorage y la restaura', () => {
    const store = TestBed.inject(SessionStore);
    store.start(fakeJwt(3600), staffUser());
    expect(store.isAuthenticated()).toBe(true);
    expect(store.role()).toBe('cajero');
    expect(sessionStorage.getItem('sh_token')).toBeTruthy();

    TestBed.resetTestingModule();
    const restored = TestBed.inject(SessionStore);
    expect(restored.user()?.nombres).toBe('Laura');
  });

  it('no restaura un token vencido', () => {
    sessionStorage.setItem('sh_token', fakeJwt(-10));
    sessionStorage.setItem('sh_user', JSON.stringify(staffUser()));
    const store = TestBed.inject(SessionStore);
    expect(store.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('sh_token')).toBeNull();
  });

  it('no restaura un usuario que no es del personal', () => {
    sessionStorage.setItem('sh_token', fakeJwt(3600));
    sessionStorage.setItem('sh_user', JSON.stringify({ ...staffUser(), rol: 'cliente' }));
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
  });

  it('se cierra sola al vencer el token y marca la sesión como expirada', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(SessionStore);
    store.start(fakeJwt(5), staffUser());
    vi.advanceTimersByTime(6000);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.expired()).toBe(true);
    store.acknowledgeExpired();
    expect(store.expired()).toBe(false);
  });

  it('salir no marca la sesión como expirada', () => {
    const store = TestBed.inject(SessionStore);
    store.start(fakeJwt(3600), staffUser());
    store.end();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.expired()).toBe(false);
  });
});
