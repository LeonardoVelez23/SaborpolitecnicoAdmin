import { homeFor, isStaffRole, menuFor } from './roles';

const paths = (rol: Parameters<typeof menuFor>[0]) => menuFor(rol).map((item) => item.path);

describe('roles y menú (RNF-14)', () => {
  it('el admin ve todo el menú', () => {
    expect(paths('admin')).toEqual(['/dashboard', '/pedidos', '/historial', '/productos', '/usuarios']);
  });

  it('cajero y empleado ven todo menos usuarios', () => {
    for (const rol of ['cajero', 'empleado'] as const) {
      expect(paths(rol)).toEqual(['/dashboard', '/pedidos', '/historial', '/productos']);
    }
  });

  it('cocinero y mesero solo ven pedidos', () => {
    expect(paths('cocinero')).toEqual(['/pedidos']);
    expect(paths('mesero')).toEqual(['/pedidos']);
  });

  it('el inicio depende del rol', () => {
    expect(homeFor('admin')).toBe('/dashboard');
    expect(homeFor('cajero')).toBe('/dashboard');
    expect(homeFor('cocinero')).toBe('/pedidos');
    expect(homeFor('mesero')).toBe('/pedidos');
  });

  it('cliente no es un rol del personal', () => {
    expect(isStaffRole('cliente')).toBe(false);
    expect(isStaffRole('cajero')).toBe(true);
    expect(isStaffRole(undefined)).toBe(false);
  });
});
