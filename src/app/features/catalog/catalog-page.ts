import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/api/api';
import { SessionStore } from '../../core/auth/session-store';
import { ToastService } from '../../core/ui/toast.service';
import { formatMoney } from '../orders/order-rules';
import { Branch, CatalogApi, CatalogProduct, Category } from './catalog-api';
import {
  canDelete,
  countByCategory,
  filterProducts,
  STATUS_FILTERS,
  StatusFilter,
  stockLevel,
} from './catalog-rules';
import { ProductDialog } from './product-dialog';

type Pending = { kind: 'category' | 'product'; id: number } | undefined;

/** Catálogo de la sucursal: categorías y productos (RF-09 a RF-12). */
@Component({
  selector: 'sh-catalog-page',
  imports: [ProductDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.css',
})
export class CatalogPage {
  private readonly api = inject(CatalogApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  private readonly user = computed(() => this.session.user()!);
  /** Sucursal propia del personal; si no tiene, elige una de su restaurante. */
  protected readonly ownBranch = computed(() => this.user().sucursal_id ?? undefined);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly chosenBranch = signal<number | undefined>(undefined);
  protected readonly branchId = computed(() => this.ownBranch() ?? this.chosenBranch());

  protected readonly categories = signal<Category[]>([]);
  protected readonly products = signal<CatalogProduct[]>([]);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected readonly text = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly status = signal<StatusFilter>('todos');
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly newCategory = signal('');
  protected readonly editingCategory = signal<number | undefined>(undefined);
  protected readonly categoryDraft = signal('');
  protected readonly confirming = signal<Pending>(undefined);
  protected readonly busy = signal<Pending | 'new-category'>(undefined);

  protected readonly editing = signal<CatalogProduct | undefined>(undefined);
  protected readonly creating = signal(false);

  protected readonly canDelete = computed(() => canDelete(this.session.role()!));
  protected readonly counts = computed(() => countByCategory(this.products()));
  protected readonly filtered = computed(() =>
    filterProducts(this.products(), {
      text: this.text(),
      categoryId: this.categoryId(),
      status: this.status(),
    }),
  );
  protected readonly categoryNames = computed(
    () => new Map(this.categories().map((c) => [c.id, c.nombre])),
  );

  protected readonly formatMoney = formatMoney;
  protected readonly stockLevel = stockLevel;

  constructor() {
    if (this.ownBranch()) void this.load();
    else void this.loadBranches();
  }

  protected async load(): Promise<void> {
    const id = this.branchId();
    if (!id) return;
    this.loading.set(true);
    try {
      const [categories, products] = await Promise.all([
        this.api.categories(id),
        this.api.products(id),
      ]);
      this.categories.set(categories);
      this.products.set(products);
      this.error.set(undefined);
      this.loaded.set(true);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected chooseBranch(value: string): void {
    this.chosenBranch.set(value ? Number(value) : undefined);
    this.categoryId.set(null);
    this.loaded.set(false);
    void this.load();
  }

  // ---------------------------------------------------------------- Categorías

  protected async addCategory(event: Event): Promise<void> {
    event.preventDefault();
    const nombre = this.newCategory().trim();
    if (!nombre) return;
    this.busy.set('new-category');
    try {
      const created = await this.api.createCategory(nombre, this.creationBranch());
      this.categories.update((list) => sortByName([...list, created]));
      this.newCategory.set('');
      this.toast.success(`Categoría "${created.nombre}" creada.`);
    } catch (e) {
      this.toast.error(errorMessage(e));
    } finally {
      this.busy.set(undefined);
    }
  }

  protected startRename(category: Category): void {
    this.editingCategory.set(category.id);
    this.categoryDraft.set(category.nombre);
  }

  protected async saveRename(category: Category): Promise<void> {
    if (this.editingCategory() !== category.id) return;
    const nombre = this.categoryDraft().trim();
    if (!nombre || nombre === category.nombre) {
      this.editingCategory.set(undefined);
      return;
    }
    this.busy.set({ kind: 'category', id: category.id });
    try {
      const updated = await this.api.renameCategory(category.id, nombre);
      this.categories.update((list) =>
        sortByName(list.map((c) => (c.id === category.id ? { ...c, nombre: updated.nombre } : c))),
      );
      this.editingCategory.set(undefined);
      this.toast.success('Categoría renombrada.');
    } catch (e) {
      this.toast.error(errorMessage(e));
    } finally {
      this.busy.set(undefined);
    }
  }

  protected onRenameKey(event: KeyboardEvent, category: Category): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.saveRename(category);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.editingCategory.set(undefined);
    }
  }

  protected async deleteCategory(category: Category): Promise<void> {
    this.confirming.set(undefined);
    this.busy.set({ kind: 'category', id: category.id });
    try {
      await this.api.deleteCategory(category.id);
      this.categories.update((list) => list.filter((c) => c.id !== category.id));
      if (this.categoryId() === category.id) this.categoryId.set(null);
      this.toast.success(`Categoría "${category.nombre}" eliminada.`);
    } catch (e) {
      this.toast.error(errorMessage(e));
    } finally {
      this.busy.set(undefined);
    }
  }

  // ----------------------------------------------------------------- Productos

  protected async toggleStatus(product: CatalogProduct): Promise<void> {
    const estado = product.estado === 'disponible' ? 'no disponible' : 'disponible';
    this.busy.set({ kind: 'product', id: product.id });
    try {
      const updated = await this.api.updateProduct(product.id, { estado });
      this.replaceProduct({ ...product, ...updated, categoria: product.categoria });
      this.toast.success(`"${product.nombre}" quedó ${estado}.`);
    } catch (e) {
      this.toast.error(errorMessage(e));
    } finally {
      this.busy.set(undefined);
    }
  }

  protected async deleteProduct(product: CatalogProduct): Promise<void> {
    this.confirming.set(undefined);
    this.busy.set({ kind: 'product', id: product.id });
    try {
      await this.api.deleteProduct(product.id);
      this.products.update((list) => list.filter((p) => p.id !== product.id));
      this.toast.success(`"${product.nombre}" eliminado.`);
    } catch (e) {
      this.toast.error(errorMessage(e));
    } finally {
      this.busy.set(undefined);
    }
  }

  protected onSaved(product: CatalogProduct): void {
    const exists = this.products().some((p) => p.id === product.id);
    if (exists) this.replaceProduct(product);
    else this.products.update((list) => sortByName([...list, product]));
    this.toast.success(exists ? 'Producto actualizado.' : `Producto "${product.nombre}" creado.`);
  }

  protected isBusy(kind: 'category' | 'product', id: number): boolean {
    const b = this.busy();
    return typeof b === 'object' && b.kind === kind && b.id === id;
  }

  protected isConfirming(kind: 'category' | 'product', id: number): boolean {
    const c = this.confirming();
    return !!c && c.kind === kind && c.id === id;
  }

  /** `sucursal_id` para crear: solo si el usuario no tiene sucursal propia. */
  protected creationBranch(): number | undefined {
    return this.ownBranch() ? undefined : this.chosenBranch();
  }

  private replaceProduct(product: CatalogProduct): void {
    this.products.update((list) => list.map((p) => (p.id === product.id ? product : p)));
  }

  private async loadBranches(): Promise<void> {
    try {
      const restaurante = this.user().restaurante_id;
      const all = await this.api.branches();
      this.branches.set(restaurante ? all.filter((b) => b.restaurante_id === restaurante) : all);
      if (this.branches().length === 1) this.chooseBranch(String(this.branches()[0].id));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}

function sortByName<T extends { nombre: string }>(list: T[]): T[] {
  return list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
