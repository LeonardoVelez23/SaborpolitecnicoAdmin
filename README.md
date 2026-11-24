# SaborHub · Módulo de administración (panel del personal)

Panel web del personal de los restaurantes de SaborHub: pedidos, cocina y caja, catálogo, usuarios y reportes (DERCAS 8.1). Los clientes usan solo la app móvil; un cliente que inicia sesión aquí recibe un aviso y no entra.

- **Angular 22** (componentes standalone, signals, Signal Forms, sin zone.js), SPA estática.
- Consume la misma API que la app (contrato en `GET /api/v1/openapi.json` del backend).
- **Sin backend local**: usa el backend de Railway, que trabaja con la base de Supabase.

## Comandos

```bash
npm install
npm start          # ng serve en http://localhost:4200 (con proxy a Railway)
npm test           # ng test (Vitest)
npm run build      # build de producción en dist/saborhub-admin/browser
```

## API y CORS

| Entorno | `apiBaseUrl` | Cómo llega a la API |
|---|---|---|
| Desarrollo (`ng serve`) | `/api/v1` (`src/environments/environment.development.ts`) | `proxy.conf.json` reenvía `/api` a Railway: el navegador no choca con el CORS de producción |
| Producción (`ng build`) | URL de Railway (`src/environments/environment.ts`) | Directo: el dominio donde se publique el panel debe estar en `CORS_ORIGIN` del backend |

## Estructura

```
src/app/
├── core/
│   ├── api/        # API_BASE_URL, forma {success, message, data}, mensajes de error
│   ├── auth/       # sesión (SessionStore), login/OTP (AuthApi), interceptor JWT, guards, roles y menú
│   └── ui/         # toasts
└── features/
    ├── auth/       # /login, /recuperar-contrasenia
    ├── shell/      # menú lateral por rol + cabecera
    └── coming-soon/# secciones de etapas siguientes
```

- **Sesión**: JWT del personal (8 h fijas) en `sessionStorage`; se cierra al vencer, ante un 401 o con "Salir".
- **Roles y menú** (`core/auth/roles.ts`): deben coincidir con los permisos de la API (RNF-14). Inicio: `/dashboard` para admin, empleado y cajero; `/pedidos` para cocinero y mesero.
- **Estilos**: tokens de marca en `src/styles.css` (`--sh-*`, paleta 60/30/10 de la app, claro y oscuro). No usar colores sueltos en los componentes. Diseño en `docs/design/`.
- **Formularios**: Signal Forms (`@angular/forms/signals`).

## Etapas

| Etapa | Contenido | Estado |
|---|---|---|
| A0–A2 | Proyecto, tokens, sesión del personal, login, recuperar contraseña, shell con menú por rol | Hecho (24-11-2026) |
| A3 | Pedidos: tablero, estados, responsables, cancelación, pedido asistido y cobro en caja (RN-14: referencia obligatoria con tarjeta o transferencia; estado `reembolsado`) | Pendiente |
| A4 | Productos y categorías (`imagen_codigo`) | Pendiente |
| A5 | Dashboard e historial de ventas | Pendiente |
| A6 | Usuarios (empleados; clientes afiliados con búsqueda exacta, afiliación presencial y bloqueo) y Mi perfil | Pendiente |
| A7 | Restaurantes y sucursales (superadmin y admin de restaurante) | Pendiente |
| A8 | Publicación en Netlify y dominio en `CORS_ORIGIN` | Pendiente |

## Publicación (Netlify)

`netlify.toml` compila con `npm run build`, publica `dist/saborhub-admin/browser` y redirige todas las rutas a `index.html` (SPA).
