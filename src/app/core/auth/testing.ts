import { StaffUser } from './session-store';

/** JWT de prueba (firma falsa) que vence en `secondsFromNow`. */
export function fakeJwt(secondsFromNow: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: 1, rol: 'cajero', exp })}.firma`;
}

export function staffUser(overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id: 1,
    identificacion: '0102030405',
    nombres: 'Laura',
    apellidos: 'Díaz',
    correo_electronico: 'laura@example.com',
    cargo: 'cajero',
    restaurante_id: 1,
    sucursal_id: 1,
    rol: 'cajero',
    ...overrides,
  };
}
