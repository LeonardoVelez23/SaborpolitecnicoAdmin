import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api/api';
import { isStaffRole } from './roles';
import { StaffUser } from './session-store';

interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  user: Omit<StaffUser, 'rol'> & { rol: string };
}

interface MessageResponse {
  success: boolean;
  message: string;
}

export type LoginResult =
  | { kind: 'staff'; token: string; user: StaffUser }
  | { kind: 'client' };

/** Endpoints públicos de autenticación (`/auth/*`). */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Inicia sesión con correo o identificación. Un cliente no entra al panel. */
  async login(identifier: string, password: string): Promise<LoginResult> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, {
        email: identifier.trim(),
        password,
      }),
    );
    const { rol, ...rest } = response.user;
    if (!isStaffRole(rol)) return { kind: 'client' };
    return { kind: 'staff', token: response.token, user: { ...rest, rol } };
  }

  /** Pide el código OTP. La respuesta es la misma exista o no el correo (RNF-06). */
  async requestCode(email: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<MessageResponse>(`${this.baseUrl}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      }),
    );
    return response.message;
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<MessageResponse>(`${this.baseUrl}/auth/reset-password`, {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      }),
    );
    return response.message;
  }
}
