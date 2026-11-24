import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api';
import { SessionStore } from './session-store';

/**
 * Añade el JWT a las peticiones a la API y cierra la sesión ante un 401
 * (token vencido, usuario eliminado o rol cambiado; RF-04).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const baseUrl = inject(API_BASE_URL);

  const token = session.token();
  const toApi = req.url.startsWith(baseUrl);
  const request = token && toApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // Solo con token: un 401 del login (credenciales inválidas) no es un vencimiento.
      if (error instanceof HttpErrorResponse && error.status === 401 && token && toApi) {
        session.expire();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
