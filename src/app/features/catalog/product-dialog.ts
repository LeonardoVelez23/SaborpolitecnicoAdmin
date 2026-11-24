import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  form,
  FormField,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { errorMessage } from '../../core/api/api';
import { CatalogApi, CatalogProduct, Category, ProductInput, ProductStatus } from './catalog-api';
import { IMAGE_CODE_PATTERN, imageCodeFrom, roundPrice } from './catalog-rules';

interface ProductModel {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  cantidad: number;
  estado: ProductStatus;
  imagen: string;
}

/** Crear o editar un producto (RF-10, RF-11). */
@Component({
  selector: 'sh-product-dialog',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-dialog.html',
  styleUrl: '../../core/ui/dialog.css',
})
export class ProductDialog {
  private readonly api = inject(CatalogApi);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Producto a editar; sin él se crea uno nuevo. */
  readonly product = input<CatalogProduct | undefined>(undefined);
  readonly categories = input.required<Category[]>();
  /** Solo para quien no tiene sucursal propia. */
  readonly sucursalId = input<number | undefined>(undefined);
  readonly closed = output<void>();
  readonly saved = output<CatalogProduct>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected readonly model = signal<ProductModel>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    precio: 0,
    cantidad: 0,
    estado: 'disponible',
    imagen: '',
  });

  protected readonly productForm = form(this.model, (path) => {
    required(path.codigo, { message: 'El código es obligatorio.' });
    maxLength(path.codigo, 50, { message: 'Máximo 50 caracteres.' });
    required(path.nombre, { message: 'El nombre es obligatorio.' });
    maxLength(path.nombre, 150, { message: 'Máximo 150 caracteres.' });
    required(path.categoria, { message: 'Elige una categoría.' });
    validate(path.precio, ({ value }) =>
      !(value() > 0) ? { kind: 'precio', message: 'El precio debe ser mayor a 0.' } : undefined,
    );
    validate(path.cantidad, ({ value }) =>
      !Number.isInteger(value()) || value() < 0
        ? { kind: 'cantidad', message: 'Debe ser un número entero, 0 o más.' }
        : undefined,
    );
    pattern(path.imagen, IMAGE_CODE_PATTERN, {
      message: 'Solo minúsculas, números y guion bajo (máximo 60).',
    });
  });

  constructor() {
    afterNextRender(() => {
      const p = this.product();
      if (p) {
        this.model.set({
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          categoria: String(p.categoria_id),
          precio: p.precio,
          cantidad: p.cantidad_disponible,
          estado: p.estado,
          imagen: p.imagen_codigo ?? '',
        });
      }
      this.dialog().nativeElement.showModal();
    });
  }

  protected generateImageCode(): void {
    this.model.update((m) => ({ ...m, imagen: imageCodeFrom(m.nombre) }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.productForm, async () => {
      this.busy.set(true);
      this.error.set(undefined);
      try {
        const m = this.model();
        const input: ProductInput = {
          codigo: m.codigo.trim(),
          nombre: m.nombre.trim(),
          descripcion: m.descripcion.trim() || null,
          categoria_id: Number(m.categoria),
          precio: roundPrice(m.precio),
          cantidad_disponible: m.cantidad,
          estado: m.estado,
          imagen_codigo: m.imagen.trim() || null,
        };
        const existing = this.product();
        const result = existing
          ? await this.api.updateProduct(existing.id, input)
          : await this.api.createProduct(input, this.sucursalId());
        this.saved.emit(result);
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
