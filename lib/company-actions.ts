"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logAuditEvent } from "@/lib/audit";
import type { MutationResult } from "@/lib/mutations";

export interface CompanyInput {
  name: string;
  rif: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
}

/** Edita los datos de la empresa. Solo admin o CEO. */
export async function updateCompany(
  input: CompanyInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };
  const { data: prof } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();
  if (!prof) return { ok: false, error: "No autenticado." };
  if (prof.role !== "admin" && prof.role !== "ceo" && prof.role !== "project_manager")
    return { ok: false, error: "Solo el Administrador, CEO o Project Manager puede editar la empresa." };

  const { error } = await supabase
    .from("companies")
    .update({
      name: input.name,
      rif: input.rif,
      default_currency: input.defaultCurrency,
      default_tax_rate: input.defaultTaxRate,
      address: input.address,
      phone: input.phone,
      email: input.email,
      logo_url: input.logoUrl,
    })
    .eq("id", prof.company_id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "actualizar_empresa",
    entityType: "empresa",
    entityId: prof.company_id,
    description: `Actualizó datos fiscales e información de la empresa "${input.name}"`,
    details: { name: input.name, rif: input.rif, currency: input.defaultCurrency },
    customUser: {
      id: user.id,
      name: prof.full_name || "Usuario",
      role: prof.role || "admin",
      companyId: prof.company_id,
    },
  });

  revalidatePath("/empresas");
  return { ok: true };
}
