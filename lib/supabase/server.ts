import { getTenantClient } from "@/lib/supabase/getTenantClient";

/**
 * Cliente de Supabase para componentes de servidor, server actions y route handlers.
 * Conecta automáticamente a la base de datos de Supabase del Tenant activo
 * (o a la del tenant especificado por parámetro).
 */
export async function createClient(tenantSlugOrId?: string | null) {
  return getTenantClient(tenantSlugOrId);
}

export { getTenantClient };

