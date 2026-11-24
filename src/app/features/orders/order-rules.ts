import { StaffRole } from '../../core/auth/roles';
import { Order, OrderStatus, OrderUpdate, Payment, PaymentMethod, PaymentStatus } from './orders-api';

/**
 * Reglas del tablero, puras y probadas. Reflejan las de la API (RN-01 a RN-04,
 * RN-10, RN-14): el panel solo ofrece lo que el backend va a aceptar.
 */

export const ACTIVE_STATUSES: readonly OrderStatus[] = ['solicitado', 'confirmado', 'en preparación', 'listo'];
export const FINAL_STATUSES: readonly OrderStatus[] = ['entregado', 'cancelado'];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  solicitado: 'Solicitados',
  confirmado: 'Confirmados',
  'en preparación': 'En preparación',
  listo: 'Listos',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const PAYMENT_LABELS: Record<PaymentStatus | 'none', string> = {
  none: 'Sin pago',
  pendiente: 'Pago pendiente',
  aprobado: 'Pagado',
  rechazado: 'Pago rechazado',
  reembolsado: 'Reembolsado',
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

/** Roles que pueden cambiar el estado de un pedido (PUT /pedidos/:id). */
const CAN_UPDATE: readonly StaffRole[] = ['admin', 'empleado', 'cajero', 'cocinero'];
/** Roles que cobran y cancelan. */
const CASHIER: readonly StaffRole[] = ['admin', 'empleado', 'cajero'];
/** Roles que crean pedidos asistidos (POST /pedidos). */
const CAN_CREATE: readonly StaffRole[] = ['admin', 'empleado', 'cajero', 'mesero'];

export function canUpdateOrders(role: StaffRole): boolean {
  return CAN_UPDATE.includes(role);
}

export function canCharge(role: StaffRole): boolean {
  return CASHIER.includes(role);
}

export function canCreateOrders(role: StaffRole): boolean {
  return CAN_CREATE.includes(role);
}

export function isFinal(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export interface StatusAction {
  readonly label: string;
  readonly to: OrderStatus;
}

/** Avances posibles desde cada estado (sin cancelar), en el orden en que se ofrecen. */
export function nextActions(status: OrderStatus): StatusAction[] {
  switch (status) {
    case 'solicitado':
      return [
        { label: 'Confirmar', to: 'confirmado' },
        { label: 'Pasar a preparación', to: 'en preparación' },
      ];
    case 'confirmado':
      return [{ label: 'Iniciar preparación', to: 'en preparación' }];
    case 'en preparación':
      return [{ label: 'Marcar listo', to: 'listo' }];
    case 'listo':
      return [{ label: 'Entregar', to: 'entregado' }];
    default:
      return [];
  }
}

/**
 * Cambios que se envían al avanzar. Desde confirmado el pedido necesita
 * responsable (RN-02): si no tiene, queda quien lo avanza. Al pasar a
 * preparación, un cocinero sin preparador asignado queda como preparador.
 */
export function advanceChanges(order: Order, to: OrderStatus, me: { id: number; rol: StaffRole }): OrderUpdate {
  const changes: OrderUpdate = { estado: to };
  if (to !== 'cancelado' && order.empleado_id === null) changes.empleado_id = me.id;
  if (to === 'en preparación' && order.empleado_preparacion_id === null && me.rol === 'cocinero') {
    changes.empleado_preparacion_id = me.id;
  }
  return changes;
}

export function canCancel(order: Order, role: StaffRole): boolean {
  return CASHIER.includes(role) && !isFinal(order.estado);
}

/** Se cobra en caja desde confirmado, nunca cancelado, si no hay pago aprobado o reembolsado (RN-10). */
export function canChargeOrder(order: Order, payment: Payment | undefined, role: StaffRole): boolean {
  if (!canCharge(role)) return false;
  if (order.estado === 'solicitado' || order.estado === 'cancelado') return false;
  return !payment || payment.estado === 'pendiente' || payment.estado === 'rechazado';
}

/** RN-14: con tarjeta o transferencia el panel exige número de referencia. */
export function referenceRequired(method: PaymentMethod): boolean {
  return method !== 'efectivo';
}

/** Fecha de hoy (AAAA-MM-DD) en la zona del restaurante. */
export function todayIn(timeZone = 'America/Guayaquil', now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Minutos desde que se creó el pedido. */
export function elapsedMinutes(order: Order, now: number): number {
  const created = Date.parse(order.createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now - created) / 60000));
}

export function formatElapsed(minutes: number): string {
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)} d`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Urgencia de un pedido en curso según su espera. */
export function urgency(minutes: number): 'normal' | 'warning' | 'danger' {
  if (minutes >= 40) return 'danger';
  if (minutes >= 20) return 'warning';
  return 'normal';
}

export function personName(person: { nombres?: string; apellidos?: string } | null | undefined): string {
  if (!person) return '';
  return [person.nombres, person.apellidos].filter(Boolean).join(' ');
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
}
