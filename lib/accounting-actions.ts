"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface ActionResult {
  ok: boolean;
  demo?: boolean;
}

function addCycle(iso: string, cycle: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (cycle === "anual") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Paga un período de nómina: registra el egreso y marca el período como pagado. */
export async function payPayroll(periodId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };

  const supabase = await createClient();
  const { data: period } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();
  if (!period) return { ok: false };

  await supabase.from("expenses").insert({
    company_id: period.company_id,
    category: "Nómina",
    note: `Nómina ${period.label}`,
    amount: period.total,
    currency: "USD",
    spent_on: period.pay_date,
    source: "nomina",
    ref_id: periodId,
  });
  await supabase
    .from("payroll_periods")
    .update({ status: "pagada" })
    .eq("id", periodId);

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Registra el pago de un servicio recurrente y avanza su próxima fecha de cobro. */
export async function payService(serviceId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };

  const supabase = await createClient();
  const { data: svc } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();
  if (!svc) return { ok: false };

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("expenses").insert({
    company_id: svc.company_id,
    category: svc.category,
    note: svc.name,
    amount: svc.amount,
    currency: svc.currency,
    spent_on: today,
    source: "servicio",
    ref_id: serviceId,
  });
  await supabase
    .from("services")
    .update({ next_charge_date: addCycle(svc.next_charge_date, svc.cycle) })
    .eq("id", serviceId);

  revalidatePath("/servicios");
  revalidatePath("/dashboard");
  return { ok: true };
}
