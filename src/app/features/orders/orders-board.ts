import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { errorMessage } from '../../core/api/api';
import { SessionStore } from '../../core/auth/session-store';
import { ToastService } from '../../core/ui/toast.service';
import { AssistedOrderDialog } from './assisted-order-dialog';
import { AssignField, OrderCard } from './order-card';
import {
  ACTIVE_STATUSES,
  advanceChanges,
  canCreateOrders,
  STATUS_LABELS,
  StatusAction,
  todayIn,
} from './order-rules';
import { Order, OrdersApi, OrderUpdate, Payment } from './orders-api';
import { PaymentDialog } from './payment-dialog';

const REFRESH_MS = 15_000;
const TICK_MS = 5_000;

/** Tablero de pedidos de la sucursal (RF-15 a RF-21, RF-23). */
@Component({
  selector: 'sh-orders-board',
  imports: [OrderCard, PaymentDialog, AssistedOrderDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-board.html',
  styleUrl: './orders-board.css',
})
export class OrdersBoard {
  private readonly api = inject(OrdersApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  protected readonly role = computed(() => this.session.role()!);
  protected readonly user = computed(() => this.session.user()!);

  protected readonly orders = signal<Order[]>([]);
  protected readonly payments = signal<ReadonlyMap<number, Payment>>(new Map());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly onlyToday = signal(true);
  protected readonly now = signal(Date.now());
  protected readonly lastUpdate = signal<number | undefined>(undefined);
  protected readonly busyId = signal<number | undefined>(undefined);
  protected readonly charging = signal<Order | undefined>(undefined);
  protected readonly creating = signal(false);
  protected readonly showFinished = signal(false);

  protected readonly canCreate = computed(() => canCreateOrders(this.role()));

  private readonly visible = computed(() => {
    const today = todayIn();
    const all = this.orders();
    return this.onlyToday() ? all.filter((o) => o.fecha === today) : all;
  });

  protected readonly columns = computed(() => {
    const visible = this.visible();
    return ACTIVE_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      orders: visible
        .filter((o) => o.estado === status)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    }));
  });

  protected readonly finished = computed(() =>
    this.visible()
      .filter((o) => !ACTIVE_STATUSES.includes(o.estado))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  );

  protected readonly updatedAgo = computed(() => {
    const last = this.lastUpdate();
    if (!last) return '';
    const seconds = Math.max(0, Math.round((this.now() - last) / 1000));
    return seconds < 60 ? `hace ${seconds} s` : `hace ${Math.floor(seconds / 60)} min`;
  });

  constructor() {
    void this.load();
    const timer = setInterval(() => {
      this.now.set(Date.now());
      const last = this.lastUpdate();
      if (
        document.visibilityState === 'visible' &&
        last &&
        Date.now() - last >= REFRESH_MS &&
        !this.busyId()
      ) {
        void this.load(true);
      }
    }, TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected paymentFor(order: Order): Payment | undefined {
    return this.payments().get(order.id);
  }

  protected async load(silent = false): Promise<void> {
    if (!silent) this.loading.set(true);
    try {
      const [orders, payments] = await Promise.all([this.api.orders(), this.api.payments()]);
      this.orders.set(orders);
      this.payments.set(new Map(payments.map((p) => [p.pedido_id, p])));
      this.error.set(undefined);
      this.lastUpdate.set(Date.now());
      this.now.set(Date.now());
    } catch (e) {
      if (!silent) this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected advance(order: Order, action: StatusAction): Promise<void> {
    return this.update(
      order,
      advanceChanges(order, action.to, this.user()),
      `Pedido #${order.id}: ${action.label.toLowerCase()}.`,
    );
  }

  protected cancel(order: Order): Promise<void> {
    return this.update(order, { estado: 'cancelado' }, `Pedido #${order.id} cancelado.`);
  }

  protected assignMe(order: Order, field: AssignField): Promise<void> {
    return this.update(
      order,
      { [field]: this.user().id },
      `Quedaste asignado al pedido #${order.id}.`,
    );
  }

  protected onPaid(payment: Payment): void {
    this.payments.update((map) => new Map(map).set(payment.pedido_id, payment));
    this.toast.success(`Pago del pedido #${payment.pedido_id} registrado.`);
  }

  protected onCreated(order: Order): void {
    this.toast.success(`Pedido #${order.id} creado.`);
    void this.load(true);
  }

  private async update(order: Order, changes: OrderUpdate, message: string): Promise<void> {
    this.busyId.set(order.id);
    try {
      await this.api.updateOrder(order.id, changes);
      this.toast.success(message);
      await this.load(true);
    } catch (e) {
      this.toast.error(errorMessage(e));
    } finally {
      this.busyId.set(undefined);
    }
  }
}
