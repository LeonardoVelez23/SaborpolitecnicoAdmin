/**
 * Configuración por entorno del módulo de administración.
 *
 * El panel usa el backend publicado en Railway (base de datos en Supabase);
 * no se usa backend local. Al publicar el panel, su dominio debe estar en
 * `CORS_ORIGIN` del backend.
 */
export const environment = {
  apiBaseUrl: 'https://restaurantespambackend-production.up.railway.app/api/v1',
};
