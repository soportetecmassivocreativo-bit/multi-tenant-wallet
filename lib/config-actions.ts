"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logAuditEvent } from "@/lib/audit";
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from "@/lib/config";
import type { MutationResult } from "@/lib/mutations";

let memoryConfig: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG };

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
 * Obtiene la configuración del sistema (contabilizadores y personalización PDF).
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  if (!isSupabaseConfigured) {
    return memoryConfig;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return memoryConfig;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return memoryConfig;

    const { data: company } = await supabase
      .from("companies")
      .select("name, rif, email, phone, next_invoice_number")
      .eq("id", profile.company_id)
      .single();

    if (company) {
      return {
        ...memoryConfig,
        pdfCompanyName: company.name || memoryConfig.pdfCompanyName,
        pdfCompanyRif: company.rif || memoryConfig.pdfCompanyRif,
        pdfContactEmail: company.email || memoryConfig.pdfContactEmail,
        pdfContactPhone: company.phone || memoryConfig.pdfContactPhone,
        invoiceCounter: company.next_invoice_number || memoryConfig.invoiceCounter,
      };
    }

    return memoryConfig;
  } catch {
    return memoryConfig;
  }
}

/**
 * Guarda los cambios de configuración del sistema.
 * Permitido para CEO, Administrador y Project Manager.
 */
export async function saveSystemConfig(
  newConfig: Partial<SystemConfig>
): Promise<MutationResult> {
  if (!isSupabaseConfigured) {
    memoryConfig = {
      ...memoryConfig,
      ...newConfig,
    };
    await logAuditEvent({
      action: "configuracion_sistema",
      entityType: "empresa",
      description: "Actualizó personalización PDF y contabilizadores Mas-Corp- (Demo)",
    });
    return { ok: true, demo: true };
  }

  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

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
    memoryConfig = {
      ...memoryConfig,
      ...newConfig,
    };

    // Actualizar datos fiscales base en tabla companies
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
