import { StaffRole } from '../../core/auth/roles';
import { CatalogProduct } from './catalog-api';

/** Reglas puras del catálogo (RF-09 a RF-12). */

export const IMAGE_CODE_PATTERN = /^[a-z0-9_]{1,60}$/;
export const LOW_STOCK = 5;

export type StatusFilter = 'todos' | 'disponible' | 'no disponible' | 'sin stock';

export const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'disponible', label: 'Disponibles' },
  { value: 'no disponible', label: 'No disponibles' },
  { value: 'sin stock', label: 'Sin stock' },
];

/** Solo el admin elimina categorías y productos. */
export function canDelete(role: StaffRole): boolean {
  return role === 'admin';
}

/** Código de imagen a partir del nombre: minúsculas, sin tildes, palabras unidas con `_`. */
export function imageCodeFrom(nombre: string): string {
  return normalize(nombre)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
    .replace(/_+$/, '');
}

export function stockLevel(cantidad: number): 'out' | 'low' | 'ok' {
  if (cantidad <= 0) return 'out';
  if (cantidad <= LOW_STOCK) return 'low';
  return 'ok';
}

export interface ProductFilters {
  text: string;
  categoryId: number | null;
  status: StatusFilter;
}

export function filterProducts(
  products: readonly CatalogProduct[],
  filters: ProductFilters,
): CatalogProduct[] {
  const text = normalize(filters.text.trim());
  return products.filter((p) => {
    if (filters.categoryId !== null && p.categoria_id !== filters.categoryId) return false;
    if (filters.status === 'sin stock' && p.cantidad_disponible > 0) return false;
    if (
      (filters.status === 'disponible' || filters.status === 'no disponible') &&
      p.estado !== filters.status
    ) {
      return false;
    }
    return !text || normalize(p.nombre).includes(text) || normalize(p.codigo).includes(text);
  });
}

/** Productos por categoría, para los contadores de la lista. */
export function countByCategory(products: readonly CatalogProduct[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const p of products) counts.set(p.categoria_id, (counts.get(p.categoria_id) ?? 0) + 1);
  return counts;
}

/** Precio redondeado a centavos. */
export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Minúsculas sin tildes (la ñ queda como n). */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
