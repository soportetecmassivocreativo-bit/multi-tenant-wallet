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

  const { error } = await ctx.supabase.from("services").insert({
    company_id: ctx.companyId,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    cycle: input.cycle,
    category: input.category || "Software",
    next_charge_date: input.nextChargeDate,
    active: true,
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

export async function deleteService(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase
    .from("services")
    .delete()
    .eq("id", id);
  if (error) {
    // Si hay restricciones de FK, hacer baja lógica
    await ctx.supabase
      .from("services")
      .update({ active: false })
      .eq("id", id);
  }

  revalidatePath("/servicios");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deactivateService(id: string): Promise<MutationResult> {
  return deleteService(id);
}

function addCycle(iso: string, cycle: string): string {
  if (!iso) iso = new Date().toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d || 1);
  if (cycle === "anual") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export interface PayServiceOptions {
  accountId?: string;
  accountName?: string;
  reference?: string;
  notes?: string;
  status?: "pagado" | "pendiente";
  paymentDate?: string;
}

/**
 * Registra el pago del servicio recurrente en el módulo de Gastos & Egresos
 * y avanza su próxima fecha de vencimiento/cobro.
 */
export async function payService(
  serviceId: string,
  options?: PayServiceOptions
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { data: svc } = await ctx.supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();
  if (!svc) return { ok: false, error: "Servicio no encontrado." };

  const payDate = options?.paymentDate || new Date().toISOString().slice(0, 10);
  const isApproved = options?.status !== "pendiente";
  const cleanAccount = (options?.accountName || "")
    .replace(/Corriente Nacional/gi, "")
    .replace(/Cuenta Corriente/gi, "")
    .replace(/Cuenta Nacional/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  let note = `Servicio · ${svc.name}`;
  const metaParts: string[] = [];
  if (isApproved) {
    if (cleanAccount) metaParts.push(`Pagado desde ${cleanAccount}`);
    else metaParts.push("Pagado y Aprobado");
    if (options?.reference?.trim()) metaParts.push(`Ref: ${options.reference.trim()}`);
  } else {
    metaParts.push("Por Aprobar / Pendiente de Pago");
    if (cleanAccount) metaParts.push(`Previsto: ${cleanAccount}`);
  }
  if (options?.notes?.trim()) metaParts.push(`"${options.notes.trim()}"`);

  if (metaParts.length > 0) {
    note = `${note} [${metaParts.join(" · ")}]`;
  }

  const { error: expError } = await ctx.supabase.from("expenses").insert({
    company_id: ctx.companyId,
    category: svc.category || "Servicios",
    note,
    amount: svc.amount,
    currency: svc.currency,
    spent_on: payDate,
    source: "servicio",
    ref_id: serviceId,
  });

  if (expError) return { ok: false, error: expError.message };

  // Avanzar fecha de próximo cobro según ciclo
  const nextDate = addCycle(svc.next_charge_date || payDate, svc.cycle);
  await ctx.supabase
    .from("services")
    .update({ next_charge_date: nextDate })
    .eq("id", serviceId);

  revalidatePath("/servicios");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  revalidatePath("/reportes");

  return { ok: true };
}
