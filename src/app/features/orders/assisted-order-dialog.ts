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
import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from '../../core/api/api';
import { formatMoney, personName } from './order-rules';
import { ClientMatch, Modality, Order, OrdersApi, Product } from './orders-api';

interface Line {
  product: Product;
  cantidad: number;
}

const MAX_QTY = 50;

/** Pedido asistido: el personal registra un pedido para un cliente (RF-16, RF-43). */
@Component({
  selector: 'sh-assisted-order-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assisted-order-dialog.html',
  styleUrl: '../../core/ui/dialog.css',
})
export class AssistedOrderDialog {
  private readonly api = inject(OrdersApi);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly sucursalId = input<number | null | undefined>(undefined);
  readonly closed = output<void>();
  readonly created = output<Order>();

  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | undefined>(undefined);
  protected readonly client = signal<ClientMatch | undefined>(undefined);
  protected readonly consent = signal(false);

  protected readonly products = signal<Product[]>([]);
  protected readonly productsLoading = signal(true);
  protected readonly productsError = signal<string | undefined>(undefined);
  protected readonly selectedProductId = signal<number | null>(null);
  protected readonly qty = signal(1);
  protected readonly lines = signal<Line[]>([]);
  protected readonly modalidad = signal<Modality>('presencial');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected readonly available = computed(() =>
    this.products().filter((p) => p.estado === 'disponible' && p.cantidad_disponible > 0),
  );
  protected readonly clientName = computed(() => personName(this.client()));
  protected readonly blocked = computed(() => this.client()?.afiliacion === 'bloqueado');
  protected readonly needsConsent = computed(() => {
    const c = this.client();
    return !!c && c.afiliacion !== 'activo' && c.afiliacion !== 'bloqueado';
  });
  protected readonly maxSelected = computed(() => this.maxFor(this.selectedProductId()));
  protected readonly total = computed(() =>
    formatMoney(this.lines().reduce((sum, l) => sum + l.product.precio * l.cantidad, 0)),
  );
  protected readonly canSubmit = computed(
    () =>
      !!this.client() &&
      !this.blocked() &&
      (!this.needsConsent() || this.consent()) &&
      this.lines().length > 0 &&
      !this.busy(),
  );

  protected readonly formatMoney = formatMoney;

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      void this.loadProducts();
    });
  }

  protected async search(event: Event): Promise<void> {
    event.preventDefault();
    const q = this.query().trim();
    if (!q) {
      this.searchError.set('Escribe la identificación o el correo del cliente.');
      return;
    }
    this.searching.set(true);
    this.searchError.set(undefined);
    this.client.set(undefined);
    this.consent.set(false);
    try {
      this.client.set(await this.api.findClient(q));
    } catch (e) {
      this.searchError.set(
        e instanceof HttpErrorResponse && e.status === 404
          ? 'No hay un cliente con esa identificación o correo. Debe registrarse en la app.'
          : errorMessage(e),
      );
    } finally {
      this.searching.set(false);
    }
  }

  /** Unidades que aún se pueden agregar del producto (tope 50 y stock). */
  protected maxFor(productId: number | null): number {
    const product = this.available().find((p) => p.id === productId);
    const already = this.lines().find((l) => l.product.id === productId)?.cantidad ?? 0;
    return product ? Math.min(MAX_QTY, product.cantidad_disponible) - already : 0;
  }

  protected addLine(): void {
    const product = this.available().find((p) => p.id === this.selectedProductId());
    if (!product) return;
    const qty = Math.floor(this.qty());
    if (!Number.isFinite(qty) || qty < 1 || qty > this.maxFor(product.id)) return;
    this.lines.update((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      return existing
        ? lines.map((l) => (l === existing ? { ...l, cantidad: l.cantidad + qty } : l))
        : [...lines, { product, cantidad: qty }];
    });
    this.selectedProductId.set(null);
    this.qty.set(1);
  }

  protected removeLine(productId: number): void {
    this.lines.update((lines) => lines.filter((l) => l.product.id !== productId));
  }

  protected onProduct(value: string): void {
    this.selectedProductId.set(value ? Number(value) : null);
  }

  protected onQty(value: string): void {
    this.qty.set(Number(value));
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const client = this.client();
    if (!client || !this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(undefined);
    try {
      const order = await this.api.createAssistedOrder({
        cliente_id: client.id,
        modalidad: this.modalidad(),
        detalles: this.lines().map((l) => ({ producto_id: l.product.id, cantidad: l.cantidad })),
        consentimiento_presencial: this.consent(),
      });
      this.created.emit(order);
      this.dialog().nativeElement.close();
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.error?.codigo === 'afiliacion_requerida') {
        this.client.update((c) => (c ? { ...c, afiliacion: null } : c));
        this.error.set(
          'El cliente no está afiliado a este restaurante: confirma su consentimiento presencial.',
        );
      } else {
        this.error.set(errorMessage(e));
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  private async loadProducts(): Promise<void> {
    try {
      this.products.set(await this.api.products(this.sucursalId()));
    } catch (e) {
      this.productsError.set(errorMessage(e));
    } finally {
      this.productsLoading.set(false);
    }
  }
}
