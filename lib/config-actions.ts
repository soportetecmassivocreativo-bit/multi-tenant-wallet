"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logAuditEvent } from "@/lib/audit";
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from "@/lib/config";
import type { MutationResult } from "@/lib/mutations";

const CONFIG_COOKIE_NAME = "m_wallet_system_config";

/** Devuelve el siguiente código correlativo para un módulo dado (sin incrementar).
 * Si Supabase está configurado, cuenta los registros activos para determinar el número.
 * Si no, usa el contador de la configuración activa.
 */
export async function getNextCode(
  module: "invoice" | "expense" | "employee" | "service",
): Promise<string> {
  const tableMap = {
    invoice: "invoices",
    expense: "expenses",
    employee: "employees",
    service: "services",
  } as const;

  const config = await getSystemConfig();

  const counterKey = `${module}Counter` as keyof SystemConfig;
  const prefixKey = `${module}Prefix` as keyof SystemConfig;

  const prefix = String(config[prefixKey] ?? config.basePrefix ?? "Mas-Corp-");
  const digits = config.codeDigits ?? 4;

  if (!isSupabaseConfigured) {
    const counter = Number(config[counterKey] ?? 1);
    return `${prefix}${String(counter).padStart(digits, "0")}`;
  }

  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from(tableMap[module])
      .select("id", { count: "exact", head: true });

    const nextNum = (count ?? 0) + 1;
    return `${prefix}${String(nextNum).padStart(digits, "0")}`;
  } catch {
    const counter = Number(config[counterKey] ?? 1);
    return `${prefix}${String(counter).padStart(digits, "0")}`;
  }
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return {
    supabase,
    userId: user.id,
    userName: profile.full_name || "Usuario",
    companyId: profile.company_id as string,
    role: profile.role as string,
  };
}

/**
 * Obtiene la configuración persistente del sistema (desde cookies / DB).
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  let cookieConfig: Partial<SystemConfig> = {};
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(CONFIG_COOKIE_NAME)?.value;
    if (raw) {
      cookieConfig = JSON.parse(decodeURIComponent(raw));
    }
  } catch {}

  let merged: SystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...cookieConfig,
  };

  if (!isSupabaseConfigured) {
    return merged;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return merged;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return merged;

    const { data: company } = await supabase
      .from("companies")
      .select("name, rif, email, phone, next_invoice_number")
      .eq("id", profile.company_id)
      .single();

    if (company) {
      return {
        ...merged,
        pdfCompanyName: company.name || merged.pdfCompanyName,
        pdfCompanyRif: company.rif || merged.pdfCompanyRif,
        pdfContactEmail: company.email || merged.pdfContactEmail,
        pdfContactPhone: company.phone || merged.pdfContactPhone,
        invoiceCounter: company.next_invoice_number || merged.invoiceCounter,
      };
    }

    return merged;
  } catch {
    return merged;
  }
}

/**
 * Guarda los cambios de configuración del sistema (en cookie de larga duración + base de datos).
 * Permitido para CEO, Administrador y Project Manager.
 */
export async function saveSystemConfig(
  newConfig: Partial<SystemConfig>
): Promise<MutationResult> {
  // 1. Guardar siempre en Cookie persistente (1 año de vigencia)
  try {
    const current = await getSystemConfig();
    const merged = { ...current, ...newConfig };
    const cookieStore = await cookies();
    cookieStore.set(CONFIG_COOKIE_NAME, encodeURIComponent(JSON.stringify(merged)), {
      maxAge: 60 * 60 * 24 * 365, // 1 año
      path: "/",
      sameSite: "lax",
    });
  } catch (err) {
    console.error("Error setting config cookie:", err);
  }

  if (!isSupabaseConfigured) {
    await logAuditEvent({
      action: "configuracion_sistema",
      entityType: "empresa",
      description: `Actualizó personalización PDF y contabilizadores ${newConfig.basePrefix || "Mas-Corp-"} (Demo)`,
    });
    revalidatePath("/", "layout");
    revalidatePath("/configuracion");
    return { ok: true, demo: true };
  }

  const ctx = await getContext();
  if (!ctx) {
    // Si no tiene sesión en Supabase pero está configurado, la cookie ya guardó los datos
    revalidatePath("/", "layout");
    revalidatePath("/configuracion");
    return { ok: true };
  }

  if (
    ctx.role !== "admin" &&
    ctx.role !== "ceo" &&
    ctx.role !== "project_manager"
  ) {
    return {
      ok: false,
      error: "Solo el CEO, Administrador o Project Manager pueden guardar la configuración.",
    };
  }

  try {
    // Actualizar datos fiscales base en tabla companies si existe
    if (ctx.companyId) {
      await ctx.supabase
        .from("companies")
        .update({
          name: newConfig.pdfCompanyName,
          rif: newConfig.pdfCompanyRif,
          email: newConfig.pdfContactEmail,
          phone: newConfig.pdfContactPhone,
          next_invoice_number: newConfig.invoiceCounter,
        })
        .eq("id", ctx.companyId);
    }

    await logAuditEvent({
      action: "configuracion_sistema",
      entityType: "empresa",
      description: `Actualizó configuración del sistema: nomenclatura ${newConfig.basePrefix || "Mas-Corp-"} y personalización PDF`,
      details: newConfig as Record<string, unknown>,
      customUser: {
        id: ctx.userId,
        name: ctx.userName,
        role: ctx.role,
        companyId: ctx.companyId,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/configuracion");
    revalidatePath("/nomina");
    revalidatePath("/servicios");
    revalidatePath("/cobros");
    revalidatePath("/gastos");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al guardar configuración.";
    return { ok: false, error: msg };
  }
}
