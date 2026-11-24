/**
 * Desarrollo (`ng serve`): la API se pide al mismo origen y `proxy.conf.json`
 * la reenvía al backend de Railway. Así el navegador no choca con el CORS de
 * producción, que solo acepta los dominios de `CORS_ORIGIN`.
 */
export const environment = {
  apiBaseUrl: '/api/v1',
};
