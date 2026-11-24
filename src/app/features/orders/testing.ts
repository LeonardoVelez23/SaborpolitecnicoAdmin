import { Order, Payment } from './orders-api';

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 7,
    fecha: '2026-11-24',
    hora: '09:00:00',
    modalidad: 'presencial',
    estado: 'solicitado',
    valor_total: 3.5,
    cliente_id: 1,
    empleado_id: null,
    empleado_preparacion_id: null,
    sucursal_id: 1,
    createdAt: '2026-11-24T14:00:00.000Z',
    cliente: { id: 1, nombres: 'Ana', apellidos: 'Pérez' },
    empleadoResponsable: null,
    empleadoPreparacion: null,
    detalles: [
      {
        id: 1,
        producto_id: 21,
        cantidad: 2,
        precio_unitario: 1.75,
        subtotal: 3.5,
        producto: { id: 21, nombre: 'Café Espresso' },
      },
    ],
    ...overrides,
  };
}

export function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 3,
    pedido_id: 7,
    fecha: '2026-11-24T14:05:00.000Z',
    valor: 3.5,
    metodo_pago: 'efectivo',
    numero_referencia: null,
    estado: 'pendiente',
    ...overrides,
  };
}
