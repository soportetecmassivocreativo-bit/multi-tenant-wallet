import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { getTenantBySlug, TENANT_COOKIE_NAME } from "@/lib/supabase/tenants-config";

/**
 * Cliente de Supabase para componentes de cliente ("use client").
 * Obtiene las credenciales del tenant activo si se especifica o desde la cookie.
 */
export function createClient(tenantSlug?: string) {
  if (tenantSlug) {
    const t = getTenantBySlug(tenantSlug);
    return createBrowserClient(t.supabaseUrl, t.supabaseAnonKey);
  }

  if (typeof document !== "undefined") {
    const match = document.cookie.match(new RegExp(`(^| )${TENANT_COOKIE_NAME}=([^;]+)`));
    if (match) {
      const activeSlug = decodeURIComponent(match[2]);
      const t = getTenantBySlug(activeSlug);
      return createBrowserClient(t.supabaseUrl, t.supabaseAnonKey);
    }
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

