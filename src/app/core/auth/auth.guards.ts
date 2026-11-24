import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../ui/toast.service';
import { homeFor, StaffRole } from './roles';
import { SessionStore } from './session-store';

/** Exige sesión del personal; si no hay, al login. */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  return session.isAuthenticated() ? true : inject(Router).parseUrl('/login');
};

/** Para el login y la recuperación: con sesión, al inicio del rol. */
export const guestGuard: CanActivateFn = () => {
  const role = inject(SessionStore).role();
  return role ? inject(Router).parseUrl(homeFor(role)) : true;
};

/** Exige uno de los roles de `data.roles`; si no, al inicio del rol con un aviso. */
export const roleGuard: CanActivateFn = (route) => {
  const role = inject(SessionStore).role();
  const router = inject(Router);
  if (!role) return router.parseUrl('/login');
  const allowed = (route.data['roles'] as readonly StaffRole[] | undefined) ?? [];
  if (allowed.includes(role)) return true;
  inject(ToastService).error('No tienes permiso para abrir esa sección.');
  return router.parseUrl(homeFor(role));
};

/** Redirige la raíz al inicio del rol. */
export const homeRedirectGuard: CanActivateFn = () => {
  const role = inject(SessionStore).role();
  return inject(Router).parseUrl(role ? homeFor(role) : '/login');
};
