# Módulo de administración — Pedidos (etapa A3)

Tablero de pedidos de la sucursal (RF-15 a RF-21, RF-23; DERCAS 8.1 `/pedidos`). Usa los tokens de `shell-y-sesion.md`.

## Tablero

```
┌ Pedidos ───────────────────────────────────────────────────────────────┐
│ [Hoy | Todos]   Actualizado hace 5 s  [Actualizar]   [+ Nuevo pedido]  │
├─────────────┬─────────────┬────────────────┬─────────────┬─────────────┤
│ Solicitados │ Confirmados │ En preparación │ Listos      │             │
│ ┌─────────┐ │             │                │             │             │
│ │#12 · 8m │ │             │                │             │             │
│ │Ana Pérez│ │             │                │             │             │
│ │2× Café  │ │             │                │             │             │
│ │$3.50    │ │             │                │             │             │
│ │[Confirmar]│             │                │             │             │
│ └─────────┘ │             │                │             │             │
├─────────────┴─────────────┴────────────────┴─────────────┴─────────────┤
│ Finalizados (entregados y cancelados) — lista compacta, plegable       │
└────────────────────────────────────────────────────────────────────────┘
```

- Cuatro columnas para los pedidos en curso (solicitado, confirmado, en preparación, listo), de más antiguo a más nuevo: el que más espera arriba. En pantallas < 960 px las columnas se apilan.
- Filtro **Hoy** (por defecto, fecha del pedido = hoy en America/Guayaquil) o **Todos**.
- Se recarga sola cada 15 s mientras la pestaña está visible; botón "Actualizar".
- Tiempo transcurrido desde la creación ("8 min", "1 h 5 min"); en **warning** desde 20 min y en **danger** desde 40 min si sigue en curso.

## Tarjeta

`#id · modalidad · tiempo`, cliente, líneas `cantidad × producto`, total (`highlight-text`), responsable y preparador, y estado del pago (insignia: pendiente / aprobado / rechazado / reembolsado / sin pago).

### Acciones (mismas reglas que la API)

| Estado | Acción principal | Quién |
|---|---|---|
| solicitado | Confirmar · Pasar a preparación | admin, empleado, cajero, cocinero |
| confirmado | Iniciar preparación | admin, empleado, cajero, cocinero |
| en preparación | Marcar listo | admin, empleado, cajero, cocinero |
| listo | Entregar | admin, empleado, cajero, cocinero |
| no final | Cancelar (pide confirmar en la misma tarjeta) | admin, empleado, cajero |
| confirmado o posterior, no cancelado, sin pago aprobado | Cobrar | admin, empleado, cajero |

- Desde confirmado el pedido necesita responsable (RN-02): si no tiene, quien avanza el pedido queda como responsable. Al iniciar la preparación, si no hay preparador y quien avanza es cocinero, queda como preparador.
- "Asignarme" como responsable o preparador cuando el campo está vacío.
- El mesero solo ve el tablero y crea pedidos asistidos (la API no le permite cambiar estados).

## Cobrar (diálogo)

Total fijo (el pago debe ser igual al total, RN-11). Método: efectivo, tarjeta o transferencia. **Número de referencia obligatorio con tarjeta o transferencia** (RN-14, lo exige el panel). Registra el pago como aprobado (`POST /pagos`); si ya había un pago pendiente, lo actualiza (`PUT /pagos/:id`).

## Nuevo pedido asistido (diálogo)

1. **Cliente**: identificación o correo exactos → `GET /clientes/buscar`. Muestra nombre y estado de afiliación. Bloqueado: no se puede pedir. Sin afiliación o retirada: casilla obligatoria "El cliente aceptó en persona compartir sus datos con el restaurante" (RF-43, `consentimiento_presencial`).
2. **Productos** de la sucursal disponibles con stock: agregar líneas con cantidad (1–50 y hasta el stock).
3. **Modalidad**: presencial (por defecto) o en línea. Total estimado (el definitivo lo calcula el servidor).

## Estados y accesibilidad

- Cargando inicial: texto "Cargando pedidos…"; error: banner con "Reintentar".
- Columnas como `section` con encabezado y contador; tarjetas como `article`.
- Diálogos con `<dialog>` nativo (foco atrapado, Escape cierra) y título enlazado (`aria-labelledby`).
- Los cambios se anuncian con toasts; los botones muestran "Guardando…" mientras esperan.
