import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import {
  getTenantBySlug,
  TENANT_COOKIE_NAME,
  type TenantConfig,
} from "@/lib/supabase/tenants-config";

/**
 * Resuelve y crea una instancia de Supabase Client dinámica para el Tenant correspondiente.
 * 
 * Orden de resolución:
 * 1. `tenantSlugOrId` explícito pasado por argumento.
 * 2. Header `x-tenant-slug` inyectado por el Middleware.
 * 3. Cookie `m_wallet_tenant_slug`.
 * 4. Tenant por defecto ("massivo").
 */
export async function getTenantClient(tenantSlugOrId?: string | null) {
  const cookieStore = await cookies();
  let resolvedSlug = tenantSlugOrId;

  if (!resolvedSlug) {
    try {
      const headerList = await headers();
      resolvedSlug = headerList.get("x-tenant-slug");
    } catch {
      // Si headers() no está disponible en este contexto
    }
  }

  if (!resolvedSlug) {
    resolvedSlug = cookieStore.get(TENANT_COOKIE_NAME)?.value;
  }

  const tenantConfig: TenantConfig = getTenantBySlug(resolvedSlug);

  return createServerClient(tenantConfig.supabaseUrl, tenantConfig.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignorado en Server Components (el middleware refresca la sesión)
        }
      },
    },
  });
}
