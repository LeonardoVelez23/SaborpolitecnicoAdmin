import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { StaffRole } from '../../core/auth/roles';
import {
  canCancel,
  canChargeOrder,
  canUpdateOrders,
  elapsedMinutes,
  formatElapsed,
  formatMoney,
  isFinal,
  nextActions,
  PAYMENT_LABELS,
  personName,
  StatusAction,
  urgency,
} from './order-rules';
import { Order, Payment } from './orders-api';

export type AssignField = 'empleado_id' | 'empleado_preparacion_id';

/** Tarjeta de un pedido del tablero con sus acciones según el rol. */
@Component({
  selector: 'sh-order-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-card.html',
  styleUrl: './order-card.css',
})
export class OrderCard {
  readonly order = input.required<Order>();
  readonly payment = input<Payment | undefined>(undefined);
  readonly role = input.required<StaffRole>();
  readonly now = input.required<number>();
  readonly busy = input(false);

  readonly advance = output<StatusAction>();
  readonly cancel = output<void>();
  readonly charge = output<void>();
  readonly assignMe = output<AssignField>();

  protected readonly confirmingCancel = signal(false);

  protected readonly minutes = computed(() => elapsedMinutes(this.order(), this.now()));
  protected readonly elapsed = computed(() => formatElapsed(this.minutes()));
  protected readonly urgency = computed(() => (isFinal(this.order().estado) ? 'normal' : urgency(this.minutes())));
  protected readonly clientName = computed(() => personName(this.order().cliente) || `Cliente #${this.order().cliente_id}`);
  protected readonly responsible = computed(() => personName(this.order().empleadoResponsable));
  protected readonly preparer = computed(() => personName(this.order().empleadoPreparacion));
  protected readonly total = computed(() => formatMoney(this.order().valor_total));
  protected readonly paymentState = computed(() => this.payment()?.estado ?? 'none');
  protected readonly paymentLabel = computed(() => PAYMENT_LABELS[this.paymentState()]);

  protected readonly canUpdate = computed(() => canUpdateOrders(this.role()) && !isFinal(this.order().estado));
  protected readonly actions = computed(() => (this.canUpdate() ? nextActions(this.order().estado) : []));
  protected readonly canCancel = computed(() => canCancel(this.order(), this.role()));
  protected readonly canCharge = computed(() => canChargeOrder(this.order(), this.payment(), this.role()));

  protected requestCancel(): void {
    this.confirmingCancel.set(true);
  }

  protected confirmCancel(): void {
    this.confirmingCancel.set(false);
    this.cancel.emit();
  }
}
