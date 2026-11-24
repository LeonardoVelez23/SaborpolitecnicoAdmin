# Módulo de administración — shell, sesión y tokens

Etapa A0–A2 (24-11-2026). Base del panel web del personal (DERCAS 8.1). Las pantallas de trabajo (pedidos, catálogo, usuarios, reportes) se diseñan en sus propias etapas.

## Tokens

Los mismos de la app móvil (`SaborPolitecnico App/docs/design/paleta.md`), como variables CSS en `src/styles.css` (`--sh-*`). Tema claro y oscuro según el sistema (`prefers-color-scheme`). Paleta 60/30/10:

- Crema `#EEE2CB` de fondo; tarjetas, barra superior e inputs en `#F8F2E6`.
- Verde abeto `#1B4532`: botón principal, enlace, ítem activo del menú, foco.
- Tomate `#EE4129`: escaso (insignias). Montos en `#B12A16`. Nunca para errores: error = vino `#9F1D1D`.
- Tipografía Inter; radios 8 / 12 / 16; foco visible de 2 px en verde abeto (crema en oscuro).

## Pantallas públicas (sin sesión)

Tarjeta centrada (máx. 420 px) sobre crema, con el logo sobre blanco arriba (el JPG tiene fondo blanco).

| Ruta | Contenido |
|---|---|
| `/login` | Correo o identificación, contraseña (mostrar/ocultar), "Iniciar sesión", enlace "¿Olvidaste tu contraseña?". Error en un banner vino encima del formulario. Aviso "Tu sesión expiró" si viene de un vencimiento. |
| `/recuperar-contrasenia` | Paso 1: correo → "Enviar código" (respuesta siempre igual, RNF-06). Paso 2: código de 6 dígitos, nueva contraseña y confirmación, con la política (8+, mayúscula, número, carácter especial) visible. Al terminar vuelve al login con un toast de éxito. |

Un **cliente** que inicia sesión no entra: banner "Este panel es solo para el personal. Usa la app SaborHub para hacer pedidos." y no se guarda la sesión.

## Shell (con sesión)

```
┌──────────────┬─────────────────────────────────────────────┐
│ [logo]       │  Título de la sección          Nombre · Rol │
│              ├─────────────────────────────────────────────┤
│ ▸ Dashboard  │                                             │
│ ▸ Pedidos    │   contenido (máx. 1200 px)                  │
│ ▸ Historial  │                                             │
│ ▸ Productos  │                                             │
│ ▸ Usuarios   │                                             │
│ ──────────── │                                             │
│ ▸ Mi perfil  │                                             │
│ ⏻ Salir      │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

- Barra lateral de 240 px en escritorio; en tableta (< 960 px) se oculta tras un botón de menú (`aria-expanded`), como panel superpuesto que se cierra con Escape o al elegir una opción.
- Ítem activo: fondo verde 10 % y texto verde abeto, con `aria-current="page"`.
- Arriba a la derecha: nombre y rol.

### Menú por rol (RNF-14; mismas reglas que la API)

| Ítem | Ruta | Roles |
|---|---|---|
| Dashboard | `/dashboard` | admin, empleado, cajero |
| Pedidos | `/pedidos` | todo el personal |
| Historial | `/historial` | admin, empleado, cajero |
| Productos | `/productos` | admin, empleado, cajero |
| Usuarios | `/usuarios` | admin |
| Mi perfil | `/perfil` | todo el personal |

Inicio según el rol: `/dashboard` para admin, empleado y cajero; `/pedidos` para cocinero y mesero. Una ruta no permitida lleva al inicio del rol con un toast "No tienes permiso para abrir esa sección" (sin `alert`).

## Sesión

- JWT del personal: 8 h fijas (RF-02). Se guarda en `sessionStorage` (se borra al cerrar la pestaña) junto con el usuario.
- Se cierra al vencer el `exp`, ante cualquier 401 con token y con "Salir". Tras un vencimiento o 401 el login muestra "Tu sesión expiró".

## Estados y accesibilidad

- Cargando: botón deshabilitado con texto "Ingresando…"/"Enviando…" (`aria-busy`).
- Errores de campo bajo el input (`aria-describedby`, `aria-invalid`) al tocarlo o al enviar.
- Toasts en una región `role="status"` (éxito, info) o `role="alert"` (error), 4 s, con botón de cerrar.
- Contraste según la tabla de `paleta.md`; todo operable con teclado; `lang="es"`.
