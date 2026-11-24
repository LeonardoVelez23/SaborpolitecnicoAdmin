import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, required, submit, validate } from '@angular/forms/signals';
import { errorMessage } from '../../core/api/api';
import { formatMoney, METHOD_LABELS, referenceRequired } from './order-rules';
import { Order, OrdersApi, Payment, PaymentMethod } from './orders-api';

/** Cobro en caja de un pedido (RF-21, RF-23; RN-11 y RN-14). */
@Component({
  selector: 'sh-payment-dialog',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-dialog.html',
  styleUrl: './dialog.css',
})
export class PaymentDialog {
  private readonly api = inject(OrdersApi);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly order = input.required<Order>();
  readonly payment = input<Payment | undefined>(undefined);
  readonly closed = output<void>();
  readonly paid = output<Payment>();

  protected readonly methods = Object.entries(METHOD_LABELS) as [PaymentMethod, string][];
  protected readonly total = computed(() => formatMoney(this.order().valor_total));
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected readonly model = signal({ metodo: 'efectivo' as PaymentMethod, referencia: '' });
  protected readonly paymentForm = form(this.model, (path) => {
    required(path.metodo);
    validate(path.referencia, ({ value, valueOf }) =>
      referenceRequired(valueOf(path.metodo)) && !value().trim()
        ? { kind: 'reference', message: 'Con tarjeta o transferencia el número de referencia es obligatorio.' }
        : undefined,
    );
  });
  protected readonly needsReference = computed(() => referenceRequired(this.model().metodo));

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.paymentForm, async () => {
      this.busy.set(true);
      this.error.set(undefined);
      try {
        const { metodo, referencia } = this.model();
        const input = { metodo_pago: metodo, numero_referencia: referencia.trim() || null };
        const existing = this.payment();
        const result = existing
          ? await this.api.approvePayment(existing, input)
          : await this.api.registerPayment(this.order(), input);
        this.paid.emit(result);
        this.dialog().nativeElement.close();
      } catch (e) {
        this.error.set(errorMessage(e));
      } finally {
        this.busy.set(false);
      }
    });
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }
}
