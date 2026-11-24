import {
  advanceChanges,
  canCancel,
  canChargeOrder,
  canCreateOrders,
  canUpdateOrders,
  formatElapsed,
  nextActions,
  referenceRequired,
  todayIn,
  urgency,
} from './order-rules';
import { order, payment } from './testing';

describe('reglas del tablero de pedidos', () => {
  it('ofrece los avances de cada estado y ninguno en los finales', () => {
    expect(nextActions('solicitado').map((a) => a.to)).toEqual(['confirmado', 'en preparación']);
    expect(nextActions('confirmado').map((a) => a.to)).toEqual(['en preparación']);
    expect(nextActions('en preparación').map((a) => a.to)).toEqual(['listo']);
    expect(nextActions('listo').map((a) => a.to)).toEqual(['entregado']);
    expect(nextActions('entregado')).toEqual([]);
    expect(nextActions('cancelado')).toEqual([]);
  });

  it('asigna como responsable a quien avanza si el pedido no tiene (RN-02)', () => {
    expect(advanceChanges(order(), 'confirmado', { id: 5, rol: 'cajero' })).toEqual({
      estado: 'confirmado',
      empleado_id: 5,
    });
    expect(advanceChanges(order({ empleado_id: 2 }), 'confirmado', { id: 5, rol: 'cajero' })).toEqual({
      estado: 'confirmado',
    });
  });

  it('el cocinero que inicia la preparación queda como preparador', () => {
    expect(advanceChanges(order({ empleado_id: 2 }), 'en preparación', { id: 9, rol: 'cocinero' })).toEqual({
      estado: 'en preparación',
      empleado_preparacion_id: 9,
    });
    expect(advanceChanges(order({ empleado_id: 2 }), 'en preparación', { id: 5, rol: 'cajero' })).toEqual({
      estado: 'en preparación',
    });
  });

  it('respeta los permisos por rol', () => {
    expect(canUpdateOrders('cocinero')).toBe(true);
    expect(canUpdateOrders('mesero')).toBe(false);
    expect(canCreateOrders('mesero')).toBe(true);
    expect(canCreateOrders('cocinero')).toBe(false);
    expect(canCancel(order(), 'cocinero')).toBe(false);
    expect(canCancel(order(), 'cajero')).toBe(true);
    expect(canCancel(order({ estado: 'entregado' }), 'admin')).toBe(false);
  });

  it('se cobra desde confirmado y sin pago aprobado (RN-10)', () => {
    expect(canChargeOrder(order(), undefined, 'cajero')).toBe(false);
    expect(canChargeOrder(order({ estado: 'confirmado' }), undefined, 'cajero')).toBe(true);
    expect(canChargeOrder(order({ estado: 'listo' }), payment(), 'cajero')).toBe(true);
    expect(canChargeOrder(order({ estado: 'listo' }), payment({ estado: 'aprobado' }), 'cajero')).toBe(false);
    expect(canChargeOrder(order({ estado: 'listo' }), payment({ estado: 'reembolsado' }), 'admin')).toBe(false);
    expect(canChargeOrder(order({ estado: 'cancelado' }), undefined, 'admin')).toBe(false);
    expect(canChargeOrder(order({ estado: 'listo' }), undefined, 'cocinero')).toBe(false);
  });

  it('exige referencia con tarjeta o transferencia (RN-14)', () => {
    expect(referenceRequired('efectivo')).toBe(false);
    expect(referenceRequired('tarjeta')).toBe(true);
    expect(referenceRequired('transferencia')).toBe(true);
  });

  it('formatea el tiempo transcurrido y la urgencia', () => {
    expect(formatElapsed(0)).toBe('ahora');
    expect(formatElapsed(8)).toBe('8 min');
    expect(formatElapsed(60)).toBe('1 h');
    expect(formatElapsed(65)).toBe('1 h 5 min');
    expect(urgency(19)).toBe('normal');
    expect(urgency(20)).toBe('warning');
    expect(urgency(40)).toBe('danger');
  });

  it('calcula el día en la zona del restaurante', () => {
    // 03:00 UTC del 25 es aún el 24 en Guayaquil (UTC-5).
    expect(todayIn('America/Guayaquil', new Date('2026-11-25T03:00:00Z'))).toBe('2026-11-24');
  });
});
