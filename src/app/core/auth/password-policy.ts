/**
 * Política de contraseñas del backend (RNF-05): 8+ caracteres, una mayúscula,
 * un número y un carácter especial. Devuelve el primer incumplimiento.
 */
export function passwordPolicyError(value: string): string | undefined {
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-ZÁÉÍÓÚÑ]/.test(value)) return 'La contraseña debe tener al menos una letra mayúscula.';
  if (!/\d/.test(value)) return 'La contraseña debe tener al menos un número.';
  if (!/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(value)) return 'La contraseña debe tener al menos un carácter especial.';
  return undefined;
}
