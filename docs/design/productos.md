# Módulo de administración — Productos y categorías (etapa A4)

Catálogo de la sucursal (RF-09 a RF-12; DERCAS 8.1 `/categorias` y `/productos`). Roles: admin, empleado y cajero; **solo admin elimina**. Usa los tokens de `shell-y-sesion.md` y los diálogos de `pedidos.md`.

## Sucursal

El personal con sucursal trabaja sobre la suya. El admin de restaurante y el superadmin (sin sucursal en la sesión) eligen la sucursal en un selector arriba de la página (`GET /sucursales`, filtradas por su restaurante) y se envía `sucursal_id` al crear.

## Página

```
┌ Productos y categorías ──────────────────────────────────────────────────┐
│ [Sucursal ▾]                                                             │
├ Categorías ─────────────┬ Productos ─────────────────────────────────────┤
│ Todas (22)              │ [Buscar…] [Estado ▾]            [+ Nuevo]      │
│ Bebidas (6)  ✎ 🗑       │ Código Nombre        Categoría Precio Stock Est│
│ Entradas (5) ✎ 🗑       │ P008   Alitas BBQ    Entradas  $6,00  24  ●    │
│ …                       │        [Editar] [Desactivar] [Eliminar]        │
│ [Nueva categoría] [+]   │                                                │
└─────────────────────────┴────────────────────────────────────────────────┘
```

- **Categorías** (columna izquierda, arriba en < 960 px): lista con el número de productos; clic filtra la tabla. Renombrar en línea (Enter guarda, Escape cancela). Eliminar solo admin, con confirmación en la fila; el servidor rechaza si tiene productos.
- **Productos**: búsqueda por nombre o código, filtro por estado (todos, disponibles, no disponibles, sin stock). Stock 0 en **danger** y ≤ 5 en **warning**. Acciones: Editar, Activar/Desactivar (cambia `estado`), Eliminar (admin; el servidor rechaza si está en pedidos).

## Formulario de producto (diálogo)

| Campo | Regla |
|---|---|
| Código | obligatorio, ≤ 50, único en la sucursal |
| Nombre | obligatorio, ≤ 150 |
| Descripción | opcional |
| Categoría | obligatoria, de la sucursal |
| Precio | > 0, dos decimales |
| Cantidad disponible | entero ≥ 0 |
| Estado | disponible / no disponible |
| Código de imagen | opcional, `^[a-z0-9_]{1,60}$`; botón "Generar del nombre" (minúsculas, sin tildes, `_`). Es el archivo WebP de la app (`assets/images/productos/<código>.webp`) |

Errores del servidor (código duplicado, categoría inválida) se muestran en un banner del diálogo.

## Estados y accesibilidad

Carga inicial "Cargando catálogo…", error con "Reintentar", vacío "No hay productos con esos filtros". Tabla con `caption` oculto y encabezados `scope="col"`; acciones con `aria-label` que incluye el nombre del producto.
