/**
 * Lee el vencimiento (`exp`, en segundos) de un JWT sin verificar la firma
 * (la verifica el backend). Devuelve milisegundos o `undefined` si no se puede leer.
 */
export function jwtExpiresAt(token: string): number | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    if (json && typeof json === 'object' && 'exp' in json && typeof json.exp === 'number') {
      return json.exp * 1000;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
