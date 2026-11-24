import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { jwtExpiresAt } from './jwt';
import { isStaffRole, StaffRole } from './roles';

/** Usuario del personal tal como lo devuelve `POST /auth/login` (sin secretos). */
export interface StaffUser {
  id: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  correo_electronico: string;
  telefono?: string | null;
  cargo?: string | null;
  turno_trabajo?: string | null;
  restaurante_id?: number | null;
  sucursal_id?: number | null;
  rol: StaffRole;
}

const TOKEN_KEY = 'sh_token';
const USER_KEY = 'sh_user';

/**
 * Sesión del personal. El JWT dura 8 h fijas (RF-02); se guarda en
 * `sessionStorage` (se borra al cerrar la pestaña) y se cierra sola al vencer.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore implements OnDestroy {
  private readonly tokenState = signal<string | undefined>(undefined);
  private readonly userState = signal<StaffUser | undefined>(undefined);
  private readonly expiredState = signal(false);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  /** `true` si la última sesión terminó por vencimiento o por un 401. */
  readonly expired = this.expiredState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== undefined);
  readonly role = computed(() => this.userState()?.rol);

  constructor() {
    this.restore();
  }

  start(token: string, user: StaffUser): void {
    const expiresAt = jwtExpiresAt(token);
    if (expiresAt !== undefined && expiresAt <= Date.now()) return;
    storage()?.setItem(TOKEN_KEY, token);
    storage()?.setItem(USER_KEY, JSON.stringify(user));
    this.tokenState.set(token);
    this.userState.set(user);
    this.expiredState.set(false);
    this.scheduleExpiry(expiresAt);
  }

  /** Cierre voluntario ("Salir"). */
  end(): void {
    this.clear();
    this.expiredState.set(false);
  }

  /** Cierre por vencimiento o por un 401 del servidor. */
  expire(): void {
    if (!this.isAuthenticated()) return;
    this.clear();
    this.expiredState.set(true);
  }

  /** Quita el aviso de sesión vencida una vez mostrado. */
  acknowledgeExpired(): void {
    this.expiredState.set(false);
  }

  ngOnDestroy(): void {
    clearTimeout(this.expiryTimer);
  }

  private restore(): void {
    const token = storage()?.getItem(TOKEN_KEY);
    const rawUser = storage()?.getItem(USER_KEY);
    if (!token || !rawUser) return;
    const user = parseUser(rawUser);
    const expiresAt = jwtExpiresAt(token);
    if (!user || (expiresAt !== undefined && expiresAt <= Date.now())) {
      this.clear();
      return;
    }
    this.tokenState.set(token);
    this.userState.set(user);
    this.scheduleExpiry(expiresAt);
  }

  private scheduleExpiry(expiresAt: number | undefined): void {
    clearTimeout(this.expiryTimer);
    if (expiresAt === undefined) return;
    // setTimeout admite hasta ~24,8 días; el token del personal dura 8 h.
    this.expiryTimer = setTimeout(() => this.expire(), Math.max(0, expiresAt - Date.now()));
  }

  private clear(): void {
    clearTimeout(this.expiryTimer);
    storage()?.removeItem(TOKEN_KEY);
    storage()?.removeItem(USER_KEY);
    this.tokenState.set(undefined);
    this.userState.set(undefined);
  }
}

function storage(): Storage | undefined {
  return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
}

function parseUser(raw: string): StaffUser | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && 'rol' in value && isStaffRole(value.rol)) {
      return value as StaffUser;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
