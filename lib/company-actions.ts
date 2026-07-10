"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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

/** Edita los datos de la empresa. Solo admin. */
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
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!prof) return { ok: false, error: "No autenticado." };
  if (prof.role !== "admin")
    return { ok: false, error: "Solo el administrador puede editar la empresa." };

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

  revalidatePath("/empresas");
  return { ok: true };
}
