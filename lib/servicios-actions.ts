"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { MutationResult } from "@/lib/mutations";
import type { CurrencyCode } from "@/lib/currency";
import { getNextCode } from "@/lib/config-actions";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { supabase, companyId: profile.company_id as string };
}

export interface ServiceInput {
  name: string;
  amount: number;
  currency: CurrencyCode;
  cycle: string; // mensual | anual
  category: string;
  nextChargeDate: string;
}

export async function addService(input: ServiceInput): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  // Genera el código correlativo automáticamente (ej: Mas-Corp-0003)
  const code = await getNextCode("service");

  const { error } = await ctx.supabase.from("services").insert({
    company_id: ctx.companyId,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    cycle: input.cycle,
    category: input.category || "Software",
    next_charge_date: input.nextChargeDate,
    active: true,
    code,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/servicios");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase
    .from("services")
    .update({
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      cycle: input.cycle,
      category: input.category || "Software",
      next_charge_date: input.nextChargeDate,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/servicios");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deactivateService(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase
    .from("services")
    .update({ active: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/servicios");
  revalidatePath("/dashboard");
  return { ok: true };
}
