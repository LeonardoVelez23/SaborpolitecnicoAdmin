import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirectGuard, roleGuard } from './core/auth/auth.guards';
import { GESTION, STAFF_ROLES } from './core/auth/roles';

const comingSoon = () => import('./features/coming-soon/coming-soon').then((m) => m.ComingSoon);

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · SaborHub',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'recuperar-contrasenia',
    title: 'Recuperar contraseña · SaborHub',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/recover-password').then((m) => m.RecoverPassword),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'dashboard',
        title: 'Dashboard · SaborHub',
        canActivate: [roleGuard],
        data: {
          roles: GESTION,
          title: 'Dashboard',
          stage: 'A5',
          description: 'Pedidos, ingresos aprobados, distribución por estado y modalidad y productos más vendidos, con filtro de fechas (RF-29 a RF-33).',
        },
        loadComponent: comingSoon,
      },
      {
        path: 'pedidos',
        title: 'Pedidos · SaborHub',
        canActivate: [roleGuard],
        data: {
          roles: STAFF_ROLES,
          title: 'Pedidos',
          stage: 'A3',
          description: 'Tablero de pedidos del día con tiempo transcurrido, responsables, cambio de estado, cancelación, pedido asistido y cobro en caja (RF-15 a RF-21, RF-23).',
        },
        loadComponent: comingSoon,
      },
      {
        path: 'historial',
        title: 'Historial · SaborHub',
        canActivate: [roleGuard],
        data: {
          roles: GESTION,
          title: 'Historial de ventas',
          stage: 'A5',
          description: 'Calendario mensual con los días con ventas y los pedidos del día elegido (RF-34).',
        },
        loadComponent: comingSoon,
      },
      {
        path: 'productos',
        title: 'Productos · SaborHub',
        canActivate: [roleGuard],
        data: {
          roles: GESTION,
          title: 'Productos y categorías',
          stage: 'A4',
          description: 'Catálogo de la sucursal: categorías y productos con precio, stock, estado e imagen_codigo (RF-09 a RF-11).',
        },
        loadComponent: comingSoon,
      },
      {
        path: 'usuarios',
        title: 'Usuarios · SaborHub',
        canActivate: [roleGuard],
        data: {
          roles: ['admin'],
          title: 'Usuarios',
          stage: 'A6',
          description: 'Empleados de la sucursal y clientes afiliados al restaurante, con búsqueda exacta, afiliación presencial y bloqueo (RF-07, RF-44).',
        },
        loadComponent: comingSoon,
      },
      {
        path: 'perfil',
        title: 'Mi perfil · SaborHub',
        canActivate: [roleGuard],
        data: {
          roles: STAFF_ROLES,
          title: 'Mi perfil',
          stage: 'A6',
          description: 'Editar tus datos y cambiar la contraseña con el código del correo (RF-06).',
        },
        loadComponent: comingSoon,
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
