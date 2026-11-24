import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api';
import { passwordPolicyError } from '../../core/auth/password-policy';
import { SessionStore } from '../../core/auth/session-store';
import { fakeJwt, staffUser } from '../../core/auth/testing';
import { CLIENT_NOT_ALLOWED, Login } from './login';

const API = 'https://api.test/api/v1';

describe('Login', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  async function submit(identifier: string, password: string) {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('#identifier', identifier);
    type('#password', password);
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    return { fixture, el };
  }

  it('el personal entra y va al inicio de su rol', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await submit('laura@example.com', 'Secreta1!');
    const req = backend.expectOne(`${API}/auth/login`);
    expect(req.request.body).toEqual({ email: 'laura@example.com', password: 'Secreta1!' });
    req.flush({ success: true, token: fakeJwt(3600), user: staffUser({ rol: 'cajero' }) });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(true);
  });

  it('un cliente no entra al panel', async () => {
    const { fixture, el } = await submit('cliente@example.com', 'Secreta1!');
    backend
      .expectOne(`${API}/auth/login`)
      .flush({ success: true, token: fakeJwt(1200), user: { ...staffUser(), rol: 'cliente' } });
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.textContent).toContain(CLIENT_NOT_ALLOWED);
    });
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
  });

  it('muestra el error del backend', async () => {
    const { fixture, el } = await submit('laura@example.com', 'mala');
    backend
      .expectOne(`${API}/auth/login`)
      .flush(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.textContent).toContain('Credenciales inválidas');
    });
  });

  it('no envía el formulario vacío', async () => {
    await submit('', '');
    backend.expectNone(`${API}/auth/login`);
  });
});

describe('política de contraseñas (RNF-05)', () => {
  it('exige 8 caracteres, mayúscula, número y carácter especial', () => {
    expect(passwordPolicyError('Ab1!')).toContain('8 caracteres');
    expect(passwordPolicyError('abcdefg1!')).toContain('mayúscula');
    expect(passwordPolicyError('Abcdefgh!')).toContain('número');
    expect(passwordPolicyError('Abcdefg12')).toContain('especial');
    expect(passwordPolicyError('Secreta1!')).toBeUndefined();
  });
});
