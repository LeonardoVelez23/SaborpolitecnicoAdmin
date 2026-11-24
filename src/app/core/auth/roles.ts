/** Roles del personal (el backend los deriva del cargo). */
export type StaffRole = 'admin' | 'empleado' | 'cajero' | 'cocinero' | 'mesero';

export const STAFF_ROLES: readonly StaffRole[] = ['admin', 'empleado', 'cajero', 'cocinero', 'mesero'];

export function isStaffRole(rol: unknown): rol is StaffRole {
  return typeof rol === 'string' && (STAFF_ROLES as readonly string[]).includes(rol);
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrador',
  empleado: 'Empleado',
  cajero: 'Cajero',
  cocinero: 'Cocinero',
  mesero: 'Mesero',
};

/** Roles con acceso a reportes, historial y catálogo (DERCAS 8.1). */
export const GESTION: readonly StaffRole[] = ['admin', 'empleado', 'cajero'];

export interface MenuItem {
  readonly path: string;
  readonly label: string;
  readonly roles: readonly StaffRole[];
}

/** Menú del panel. Debe coincidir con los permisos de la API (RNF-14). */
export const MENU: readonly MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', roles: GESTION },
  { path: '/pedidos', label: 'Pedidos', roles: STAFF_ROLES },
  { path: '/historial', label: 'Historial', roles: GESTION },
  { path: '/productos', label: 'Productos', roles: GESTION },
  { path: '/usuarios', label: 'Usuarios', roles: ['admin'] },
];

export const PROFILE_ITEM: MenuItem = { path: '/perfil', label: 'Mi perfil', roles: STAFF_ROLES };

export function menuFor(rol: StaffRole): MenuItem[] {
  return MENU.filter((item) => item.roles.includes(rol));
}

/** Pantalla de inicio de cada rol. */
export function homeFor(rol: StaffRole): string {
  return GESTION.includes(rol) ? '/dashboard' : '/pedidos';
}
