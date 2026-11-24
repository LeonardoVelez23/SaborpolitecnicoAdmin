import { CatalogProduct } from './catalog-api';
import {
  canDelete,
  countByCategory,
  filterProducts,
  IMAGE_CODE_PATTERN,
  imageCodeFrom,
  roundPrice,
  stockLevel,
} from './catalog-rules';

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 1,
    codigo: 'P001',
    nombre: 'Café Espresso',
    descripcion: null,
    precio: 1.75,
    cantidad_disponible: 10,
    estado: 'disponible',
    categoria_id: 1,
    sucursal_id: 1,
    imagen_codigo: null,
    ...overrides,
  };
}

describe('reglas del catálogo', () => {
  it('genera el código de imagen del nombre', () => {
    expect(imageCodeFrom('Café Espresso Doble')).toBe('cafe_espresso_doble');
    expect(imageCodeFrom('  Piña Colada (500 ml) ')).toBe('pina_colada_500_ml');
    expect(imageCodeFrom('Canastitas de Verde con Camarón')).toMatch(IMAGE_CODE_PATTERN);
    expect(imageCodeFrom('a'.repeat(80)).length).toBe(60);
  });

  it('solo el admin elimina', () => {
    expect(canDelete('admin')).toBe(true);
    expect(canDelete('cajero')).toBe(false);
    expect(canDelete('empleado')).toBe(false);
  });

  it('clasifica el stock', () => {
    expect(stockLevel(0)).toBe('out');
    expect(stockLevel(5)).toBe('low');
    expect(stockLevel(6)).toBe('ok');
  });

  it('filtra por texto sin tildes, categoría y estado', () => {
    const list = [
      product({ id: 1, nombre: 'Café Espresso', codigo: 'P001' }),
      product({
        id: 2,
        nombre: 'Té Helado',
        codigo: 'P002',
        categoria_id: 2,
        estado: 'no disponible',
      }),
      product({ id: 3, nombre: 'Flan', codigo: 'P003', categoria_id: 2, cantidad_disponible: 0 }),
    ];
    const ids = (f: Parameters<typeof filterProducts>[1]) =>
      filterProducts(list, f).map((p) => p.id);
    expect(ids({ text: 'cafe', categoryId: null, status: 'todos' })).toEqual([1]);
    expect(ids({ text: 'p00', categoryId: 2, status: 'todos' })).toEqual([2, 3]);
    expect(ids({ text: '', categoryId: null, status: 'no disponible' })).toEqual([2]);
    expect(ids({ text: '', categoryId: null, status: 'sin stock' })).toEqual([3]);
  });

  it('cuenta productos por categoría y redondea precios', () => {
    const counts = countByCategory([
      product(),
      product({ id: 2 }),
      product({ id: 3, categoria_id: 4 }),
    ]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(4)).toBe(1);
    expect(roundPrice(3.456)).toBe(3.46);
    expect(roundPrice(7.5)).toBe(7.5);
  });
});
