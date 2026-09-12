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
 * Divide un string en fragmentos de tamaño seguro para cookies HTTP.
 */
function splitIntoCookieChunks(str: string, chunkSize = 2200): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Obtiene la configuración persistente del sistema (desde cookies / DB) por empresa / tenant.
 */
export async function getSystemConfig(tenantSlug?: string): Promise<SystemConfig> {
  const cookieStore = await cookies();
  const activeSlug =
    tenantSlug ||
    cookieStore.get("m_wallet_active_config_tenant")?.value ||
    "massivo";

  const targetCookieName =
    activeSlug === "massivo"
      ? CONFIG_COOKIE_NAME
      : `${CONFIG_COOKIE_NAME}_${activeSlug}`;

  let cookieConfig: Partial<SystemConfig> = {};
  let hasCookie = false;

  try {
    let fullRaw = "";
    // Leer fragmentos de cookies (hasta 6 chunks para soportar textos largos de términos/condiciones)
    for (let i = 0; i < 6; i++) {
      const chunkName = i === 0 ? targetCookieName : `${targetCookieName}_${i}`;
      const chunkVal = cookieStore.get(chunkName)?.value;
      if (!chunkVal) break;
      try {
        fullRaw += decodeURIComponent(chunkVal);
      } catch {
        fullRaw += chunkVal;
      }
    }

    if (fullRaw) {
      cookieConfig = JSON.parse(fullRaw);
      hasCookie = true;
    }
  } catch (err) {
    console.error("Error al leer configuración de cookies:", err);
  }

  // Prefijo por defecto inteligente según la empresa
  let dynamicDefaultPrefix = "Mas-Corp-";
  let dynamicCompanyName = "Massivo Creativo";
  if (activeSlug === "demo") {
    dynamicDefaultPrefix = "Demo-Corp-";
    dynamicCompanyName = "Empresa Demo";
  } else if (activeSlug !== "massivo") {
    const prefixTag = activeSlug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    dynamicDefaultPrefix = `${prefixTag || "Emp"}-Corp-`;
    dynamicCompanyName = `Empresa ${activeSlug}`;
  }

  const baseConfig: SystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    basePrefix: dynamicDefaultPrefix,
    invoicePrefix: `${dynamicDefaultPrefix}FAC-`,
    expensePrefix: `${dynamicDefaultPrefix}GAS-`,
    employeePrefix: `${dynamicDefaultPrefix}EMP-`,
    servicePrefix: `${dynamicDefaultPrefix}SRV-`,
    pdfCompanyName: dynamicCompanyName,
  };

  const merged: SystemConfig = {
    ...baseConfig,
    ...cookieConfig,
  };

  // Si Supabase está configurado, consultar datos de la empresa para sincronizar nombre, RIF, teléfono y correo
  if (isSupabaseConfigured) {
    try {
      const dbPromise = (async () => {
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
          const finalMerged = { ...merged };
          if (company.name) {
            finalMerged.pdfCompanyName = company.name;
            if (!cookieConfig.pdfInvoiceCompanyName) finalMerged.pdfInvoiceCompanyName = company.name;
            if (!cookieConfig.pdfProformaCompanyName) finalMerged.pdfProformaCompanyName = company.name;
          }
          if (company.rif) {
            finalMerged.pdfCompanyRif = company.rif;
            if (!cookieConfig.pdfInvoiceCompanyRif) finalMerged.pdfInvoiceCompanyRif = company.rif;
            if (!cookieConfig.pdfProformaCompanyRif) finalMerged.pdfProformaCompanyRif = company.rif;
          }
          if (company.email) {
            finalMerged.pdfContactEmail = company.email;
            if (!cookieConfig.pdfInvoiceContactEmail) finalMerged.pdfInvoiceContactEmail = company.email;
            if (!cookieConfig.pdfProformaContactEmail) finalMerged.pdfProformaContactEmail = company.email;
          }
          if (company.phone) {
            finalMerged.pdfContactPhone = company.phone;
            if (!cookieConfig.pdfInvoiceContactPhone) finalMerged.pdfInvoiceContactPhone = company.phone;
            if (!cookieConfig.pdfProformaContactPhone) finalMerged.pdfProformaContactPhone = company.phone;
          }
          if (company.next_invoice_number) {
            finalMerged.invoiceCounter = company.next_invoice_number;
          }
          return finalMerged;
        }
        return merged;
      })();

      const timeoutPromise = new Promise<SystemConfig>((resolve) =>
        setTimeout(() => resolve(merged), 800)
      );

      return await Promise.race([dbPromise, timeoutPromise]);
    } catch {
      return merged;
    }
  }

  return merged;
}

/**
 * Guarda los cambios de configuración del sistema para una empresa / tenant específico.
 * Permitido para CEO, Administrador y Project Manager.
 */
export async function saveSystemConfig(
  newConfig: Partial<SystemConfig>,
  tenantSlug?: string
): Promise<MutationResult> {
  const cookieStore = await cookies();
  const activeSlug =
    tenantSlug ||
    cookieStore.get("m_wallet_active_config_tenant")?.value ||
    "massivo";

  const targetCookieName =
    activeSlug === "massivo"
      ? CONFIG_COOKIE_NAME
      : `${CONFIG_COOKIE_NAME}_${activeSlug}`;

  // 1. Guardar en Cookie persistente de la empresa usando chunking seguro (1 año de vigencia)
  try {
    const current = await getSystemConfig(activeSlug);
    const merged = { ...current, ...newConfig };

    // Sanitizar: NO almacenar archivos base64 pesados (PDFs/logos data: URLs) en cookies HTTP para evitar errores de tamaño 431
    const safeCookieConfig: Partial<SystemConfig> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === "string" && v.startsWith("data:")) {
        continue;
      }
      if (v !== undefined && v !== null) {
        (safeCookieConfig as any)[k] = v;
      }
    }

    const rawJson = JSON.stringify(safeCookieConfig);
    const chunks = splitIntoCookieChunks(rawJson, 2200);

    // 1. Escribir nuevos chunks directamente (sobreescribe los existentes sin conflicto)
    chunks.forEach((chunk, i) => {
      const chunkName = i === 0 ? targetCookieName : `${targetCookieName}_${i}`;
      cookieStore.set(chunkName, encodeURIComponent(chunk), {
        maxAge: 60 * 60 * 24 * 365, // 1 año
        path: "/",
        sameSite: "lax",
      });
    });

    // 2. Limpiar únicamente los chunks sobrantes que ya no se usan (i >= chunks.length)
    for (let i = chunks.length; i < 8; i++) {
      const chunkName = i === 0 ? targetCookieName : `${targetCookieName}_${i}`;
      try {
        cookieStore.delete(chunkName);
      } catch {}
    }
  } catch (err) {
    console.error("Error setting config cookie chunks:", err);
  }

  if (!isSupabaseConfigured) {
    await logAuditEvent({
      action: "configuracion_sistema",
      entityType: "empresa",
      description: `Actualizó personalización PDF y contabilizadores ${newConfig.basePrefix || "Corp-"} (Empresa: ${activeSlug})`,
    });
    revalidatePath("/", "layout");
    revalidatePath("/configuracion");
    revalidatePath("/proformas");
    revalidatePath("/proforma");
    revalidatePath("/factura");
    revalidatePath("/nomina");
    revalidatePath("/servicios");
    revalidatePath("/cobros");
    revalidatePath("/gastos");
    revalidatePath("/dashboard");
    return { ok: true, demo: true };
  }

  try {
    const ctx = await getContext();
    if (ctx?.companyId) {
      const updatePayload: Record<string, any> = {};
      const companyName = newConfig.pdfProformaCompanyName || newConfig.pdfInvoiceCompanyName || newConfig.pdfCompanyName;
      if (companyName) updatePayload.name = companyName;

      const companyRif = newConfig.pdfProformaCompanyRif || newConfig.pdfInvoiceCompanyRif || newConfig.pdfCompanyRif;
      if (companyRif) updatePayload.rif = companyRif;

      const companyEmail = newConfig.pdfProformaContactEmail || newConfig.pdfInvoiceContactEmail || newConfig.pdfContactEmail;
      if (companyEmail) updatePayload.email = companyEmail;

      const companyPhone = newConfig.pdfProformaContactPhone || newConfig.pdfInvoiceContactPhone || newConfig.pdfContactPhone;
      if (companyPhone) updatePayload.phone = companyPhone;

      if (newConfig.invoiceCounter !== undefined) updatePayload.next_invoice_number = newConfig.invoiceCounter;

      if (Object.keys(updatePayload).length > 0) {
        try {
          await ctx.supabase
            .from("companies")
            .update(updatePayload)
            .eq("id", ctx.companyId);
        } catch (dbErr) {
          console.warn("Could not sync company table fields directly (non-fatal):", dbErr);
        }
      }
    }

    if (ctx) {
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
    }
  } catch (err) {
    console.warn("DB audit or company update warning:", err);
  }

  revalidatePath("/", "layout");
  revalidatePath("/configuracion");
  revalidatePath("/proformas");
  revalidatePath("/proforma");
  revalidatePath("/factura");
  revalidatePath("/nomina");
  revalidatePath("/servicios");
  revalidatePath("/cobros");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}
