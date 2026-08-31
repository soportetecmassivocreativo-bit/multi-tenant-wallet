"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
import { isAdmin, getCurrentProfile } from "@/lib/data";
import {
  getAllTenants,
  DEFAULT_TENANT,
  type TenantConfig,
} from "@/lib/supabase/tenants-config";

const CUSTOM_TENANTS_COOKIE = "m_wallet_custom_tenants";

export interface CreateTenantInput {
  slug: string;
  name: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  rif?: string;
  adminEmail?: string;
  customDomain?: string;
  description?: string;
}

/**
 * Obtiene la lista completa de tenants para el panel Master
 */
export async function getAdminTenants(): Promise<TenantConfig[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(CUSTOM_TENANTS_COOKIE)?.value;
    let customList: TenantConfig[] = [];
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        customList = parsed;
      }
    }

    const baseList = getAllTenants();
    const map = new Map<string, TenantConfig>();

    for (const t of baseList) {
      map.set(t.slug, t);
    }
    for (const t of customList) {
      map.set(t.slug, t);
    }

    return Array.from(map.values());
  } catch (err) {
    console.error("Error loading admin tenants:", err);
    return getAllTenants();
  }
}

async function saveCustomTenantsToCookie(tenants: TenantConfig[]) {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOM_TENANTS_COOKIE, encodeURIComponent(JSON.stringify(tenants)), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Prueba la conexión en tiempo real a una base de datos de Supabase
 */
export async function testSupabaseConnection(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, "");
    if (!cleanUrl.startsWith("http")) {
      return { ok: false, message: "URL de Supabase inválida.", latencyMs: 0 };
    }

    const response = await fetch(`${cleanUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey.trim(),
        Authorization: `Bearer ${supabaseAnonKey.trim()}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    const latency = Date.now() - start;

    if (response.ok || response.status === 200 || response.status === 401) {
      return {
        ok: true,
        message: `Conexión exitosa (${latency}ms) - Servicio Supabase Activo`,
        latencyMs: latency,
      };
    }

    return {
      ok: false,
      message: `Respuesta inesperada del servidor (HTTP ${response.status})`,
      latencyMs: latency,
    };
  } catch (err: unknown) {
    const latency = Date.now() - start;
    return {
      ok: false,
      message: err instanceof Error ? err.message : "No se pudo conectar con el servidor Supabase.",
      latencyMs: latency,
    };
  }
}

/**
 * Registra una nueva empresa / tenant
 */
export async function createAdminTenant(
  input: CreateTenantInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { ok: false, error: "No tienes permisos de administrador para crear empresas." };
    }

    const cleanSlug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "");

    if (!cleanSlug || cleanSlug.length < 2) {
      return { ok: false, error: "El slug de la empresa debe tener al menos 2 caracteres válidos." };
    }

    if (!input.name.trim()) {
      return { ok: false, error: "El nombre de la empresa es obligatorio." };
    }

    if (!input.supabaseUrl.trim() || !input.supabaseAnonKey.trim()) {
      return { ok: false, error: "Las credenciales de Supabase (URL y Anon Key) son requeridas." };
    }

    const existing = await getAdminTenants();
    if (existing.some((t) => t.slug === cleanSlug)) {
      return { ok: false, error: `Ya existe una empresa registrada con el slug "${cleanSlug}".` };
    }

    const newTenant: TenantConfig = {
      slug: cleanSlug,
      name: input.name.trim(),
      supabaseUrl: input.supabaseUrl.trim().replace(/\/$/, ""),
      supabaseAnonKey: input.supabaseAnonKey.trim(),
      supabaseServiceKey: input.supabaseServiceKey?.trim() || undefined,
      customDomain: input.customDomain?.trim() || undefined,
      description: input.description?.trim() || `Empresa ${input.name.trim()}`,
      isDefault: false,
    };

    const cookieStore = await cookies();
    const raw = cookieStore.get(CUSTOM_TENANTS_COOKIE)?.value;
    let customList: TenantConfig[] = [];
    if (raw) {
      try {
        customList = JSON.parse(decodeURIComponent(raw));
      } catch {}
    }

    customList.push(newTenant);
    await saveCustomTenantsToCookie(customList);

    const prof = await getCurrentProfile();
    await logAuditEvent({
      action: "create_tenant",
      entityType: "tenant",
      entityId: cleanSlug,
      description: `Creó la empresa "${newTenant.name}" (Slug: ${cleanSlug})`,
      details: {
        slug: cleanSlug,
        name: newTenant.name,
        supabaseUrl: newTenant.supabaseUrl,
        adminEmail: input.adminEmail,
      },
      customUser: prof
        ? {
            id: prof.userId,
            name: prof.role,
            role: prof.role,
            companyId: prof.companyId,
          }
        : undefined,
    });

    revalidatePath("/admin/empresas");
    revalidatePath("/empresas");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al crear la empresa." };
  }
}

/**
 * Modifica la configuración de una empresa
 */
export async function updateAdminTenant(
  slug: string,
  input: Partial<CreateTenantInput>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { ok: false, error: "No tienes permisos para modificar empresas." };
    }

    const cookieStore = await cookies();
    const raw = cookieStore.get(CUSTOM_TENANTS_COOKIE)?.value;
    let customList: TenantConfig[] = [];
    if (raw) {
      try {
        customList = JSON.parse(decodeURIComponent(raw));
      } catch {}
    }

    let found = false;
    customList = customList.map((t) => {
      if (t.slug !== slug) return t;
      found = true;
      return {
        ...t,
        name: input.name !== undefined ? input.name.trim() : t.name,
        supabaseUrl: input.supabaseUrl !== undefined ? input.supabaseUrl.trim().replace(/\/$/, "") : t.supabaseUrl,
        supabaseAnonKey: input.supabaseAnonKey !== undefined ? input.supabaseAnonKey.trim() : t.supabaseAnonKey,
        supabaseServiceKey: input.supabaseServiceKey !== undefined ? input.supabaseServiceKey.trim() : t.supabaseServiceKey,
        customDomain: input.customDomain !== undefined ? input.customDomain.trim() : t.customDomain,
        description: input.description !== undefined ? input.description.trim() : t.description,
      };
    });

    // Si era el default_tenant y se está editando
    if (!found && slug === DEFAULT_TENANT.slug) {
      const updatedDefault: TenantConfig = {
        ...DEFAULT_TENANT,
        name: input.name !== undefined ? input.name.trim() : DEFAULT_TENANT.name,
        supabaseUrl: input.supabaseUrl !== undefined ? input.supabaseUrl.trim().replace(/\/$/, "") : DEFAULT_TENANT.supabaseUrl,
        supabaseAnonKey: input.supabaseAnonKey !== undefined ? input.supabaseAnonKey.trim() : DEFAULT_TENANT.supabaseAnonKey,
      };
      customList.push(updatedDefault);
    }

    await saveCustomTenantsToCookie(customList);

    const prof = await getCurrentProfile();
    await logAuditEvent({
      action: "update_tenant",
      entityType: "tenant",
      entityId: slug,
      description: `Modificó la configuración de la empresa "${input.name || slug}"`,
      details: { slug, updates: input },
      customUser: prof
        ? {
            id: prof.userId,
            name: prof.role,
            role: prof.role,
            companyId: prof.companyId,
          }
        : undefined,
    });

    revalidatePath("/admin/empresas");
    revalidatePath("/empresas");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al actualizar la empresa." };
  }
}

/**
 * Elimina una empresa (protege 'massivo')
 */
export async function deleteAdminTenant(slug: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { ok: false, error: "No tienes permisos para eliminar empresas." };
    }

    if (slug === "massivo") {
      return { ok: false, error: "La empresa principal 'massivo' está protegida y no puede eliminarse." };
    }

    const cookieStore = await cookies();
    const raw = cookieStore.get(CUSTOM_TENANTS_COOKIE)?.value;
    let customList: TenantConfig[] = [];
    if (raw) {
      try {
        customList = JSON.parse(decodeURIComponent(raw));
      } catch {}
    }

    const filtered = customList.filter((t) => t.slug !== slug);
    await saveCustomTenantsToCookie(filtered);

    const prof = await getCurrentProfile();
    await logAuditEvent({
      action: "delete_tenant",
      entityType: "tenant",
      entityId: slug,
      description: `Eliminó la empresa (Slug: ${slug})`,
      details: { slug },
      customUser: prof
        ? {
            id: prof.userId,
            name: prof.role,
            role: prof.role,
            companyId: prof.companyId,
          }
        : undefined,
    });

    revalidatePath("/admin/empresas");
    revalidatePath("/empresas");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al eliminar la empresa." };
  }
}
