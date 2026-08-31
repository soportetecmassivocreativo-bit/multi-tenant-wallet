import {
  SUPABASE_URL as DEFAULT_SUPABASE_URL,
  SUPABASE_ANON_KEY as DEFAULT_SUPABASE_ANON_KEY,
} from "@/lib/supabase/config";

export interface TenantConfig {
  slug: string; // ej: "massivo", "empresa-a", "demo"
  name: string; // ej: "Massivo Creativo", "Corporación A C.A."
  supabaseUrl: string; // "https://xyz.supabase.co"
  supabaseAnonKey: string; // "sb_publishable_..."
  supabaseServiceKey?: string;
  customDomain?: string; // ej: "empresa-a.com"
  description?: string;
  isDefault?: boolean;
}

export const TENANT_COOKIE_NAME = "m_wallet_tenant_slug";

/**
 * Tenant predeterminado principal (Massivo Creativo).
 * Utiliza las variables estándar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export const DEFAULT_TENANT: TenantConfig = {
  slug: "massivo",
  name: "Massivo Creativo",
  supabaseUrl: DEFAULT_SUPABASE_URL,
  supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
  description: "Entorno Principal Corporativo",
  isDefault: true,
};

/**
 * Tenants estáticos de ejemplo pre-configurados.
 */
const PRESET_TENANTS: TenantConfig[] = [
  DEFAULT_TENANT,
  {
    slug: "demo",
    name: "Empresa Demo Multi-Tenant",
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
    description: "Espacio de pruebas aislado para demostraciones",
    isDefault: false,
  },
];

/**
 * Lee y parsea la lista completa de tenants desde la variable de entorno TENANTS_CONFIG (JSON)
 * combinada con los tenants predeterminados.
 */
export function getAllTenants(): TenantConfig[] {
  let envTenants: TenantConfig[] = [];
  try {
    const raw = process.env.TENANTS_CONFIG || process.env.NEXT_PUBLIC_TENANTS_CONFIG;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        envTenants = parsed.map((t: Partial<TenantConfig>) => ({
          slug: (t.slug || "").toLowerCase().trim(),
          name: t.name || t.slug || "Empresa",
          supabaseUrl: t.supabaseUrl || DEFAULT_SUPABASE_URL,
          supabaseAnonKey: t.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY,
          supabaseServiceKey: t.supabaseServiceKey,
          customDomain: t.customDomain,
          description: t.description,
          isDefault: Boolean(t.isDefault),
        }));
      }
    }
  } catch (err) {
    console.error("Error parsing TENANTS_CONFIG environment variable:", err);
  }

  const map = new Map<string, TenantConfig>();
  // 1. Agregar presets
  for (const t of PRESET_TENANTS) {
    map.set(t.slug, t);
  }
  // 2. Sobrescribir con env variables si existen
  for (const t of envTenants) {
    if (t.slug) map.set(t.slug, t);
  }

  return Array.from(map.values());
}

/**
 * Resuelve la configuración de un tenant por su slug.
 * Si no se encuentra o no se pasa, devuelve el DEFAULT_TENANT.
 */
export function getTenantBySlug(slug?: string | null): TenantConfig {
  if (!slug) return DEFAULT_TENANT;
  const clean = slug.toLowerCase().trim();
  const all = getAllTenants();
  const found = all.find((t) => t.slug === clean);
  return found || DEFAULT_TENANT;
}

/**
 * Extrae el slug del tenant a partir del hostname de la petición.
 * Soporta:
 * - empresa-a.m-wallet-gamma.vercel.app -> "empresa-a"
 * - empresa-a.localhost:3000 -> "empresa-a"
 * - empresa-a.m-wallet.com -> "empresa-a"
 * - Dominio personalizado exacto
 */
export function getTenantFromHost(host?: string | null): TenantConfig {
  if (!host) return DEFAULT_TENANT;

  const cleanHost = host.split(":")[0].toLowerCase().trim();
  const all = getAllTenants();

  // 1. Verificar si coincide con un customDomain exacto
  const custom = all.find((t) => t.customDomain && t.customDomain.toLowerCase() === cleanHost);
  if (custom) return custom;

  // 2. Extraer subdominio
  const parts = cleanHost.split(".");
  // Si es localhost (ej: tenant.localhost)
  if (cleanHost.endsWith("localhost") && parts.length > 1) {
    const sub = parts[0];
    if (sub && sub !== "www" && sub !== "app") {
      return getTenantBySlug(sub);
    }
  }

  // Si es vercel.app o dominio de varios niveles (ej: tenant.m-wallet.com o tenant.m-wallet-gamma.vercel.app)
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && sub !== "www" && sub !== "app" && sub !== "m-wallet-gamma") {
      return getTenantBySlug(sub);
    }
  }

  return DEFAULT_TENANT;
}
