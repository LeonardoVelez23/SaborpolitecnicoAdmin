import { HttpErrorResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base de la API (`.../api/v1`), sin barra final. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl.replace(/\/+$/, ''),
});

/** Forma de las respuestas de la API: `{success, message, data}`. */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const OFFLINE_MESSAGE = 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
export const UNKNOWN_ERROR_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

/** Mensaje legible de un error HTTP: el del backend o uno genérico. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return OFFLINE_MESSAGE;
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }
  }
  return UNKNOWN_ERROR_MESSAGE;
}
