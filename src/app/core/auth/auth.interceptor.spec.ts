import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api/api';
import { authInterceptor } from './auth.interceptor';
import { SessionStore } from './session-store';
import { fakeJwt, staffUser } from './testing';

const API = 'https://api.test/api/v1';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
  });

  afterEach(() => backend.verify());

  it('añade el token a las peticiones a la API', () => {
    const token = fakeJwt(3600);
    session.start(token, staffUser());
    void firstValueFrom(http.get(`${API}/pedidos`));
    const req = backend.expectOne(`${API}/pedidos`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ success: true, data: [] });
  });

  it('no envía el token a otros dominios', () => {
    session.start(fakeJwt(3600), staffUser());
    void firstValueFrom(http.get('https://otro.test/x'));
    const req = backend.expectOne('https://otro.test/x');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('un 401 con sesión la cierra como expirada y lleva al login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    session.start(fakeJwt(3600), staffUser());
    const result = firstValueFrom(http.get(`${API}/pedidos`)).catch((e: unknown) => e);
    backend
      .expectOne(`${API}/pedidos`)
      .flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    await result;
    expect(session.isAuthenticated()).toBe(false);
    expect(session.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('un 401 sin sesión (login fallido) no marca vencimiento', async () => {
    const result = firstValueFrom(http.post(`${API}/auth/login`, {})).catch((e: unknown) => e);
    backend
      .expectOne(`${API}/auth/login`)
      .flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    await result;
    expect(session.expired()).toBe(false);
  });
});
