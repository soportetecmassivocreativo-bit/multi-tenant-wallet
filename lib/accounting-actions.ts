"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { getNextCode } from "@/lib/config-actions";

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

  const code = await getNextCode("expense");

  await supabase.from("expenses").insert({
    company_id: period.company_id,
    category: "Nómina",
    note: `Nómina ${period.label}`,
    amount: period.total,
    currency: "USD",
    spent_on: period.pay_date,
    source: "nomina",
    ref_id: periodId,
    code,
  });
  await supabase
    .from("payroll_periods")
    .update({ status: "pagada" })
    .eq("id", periodId);

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

import { addDeferredCharge } from "@/lib/gastos-especiales-actions";

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
  const code = await getNextCode("expense");

  await supabase.from("expenses").insert({
    company_id: svc.company_id,
    category: svc.category,
    note: `Servicio · ${svc.name} [Pagado y Aprobado · Tarjeta José Miguel]`,
    amount: svc.amount,
    currency: svc.currency,
    spent_on: today,
    source: "servicio",
    ref_id: serviceId,
    code,
  });

  try {
    await addDeferredCharge({
      description: `Servicio · ${svc.name}`,
      category: svc.category || "Servicios",
      amount: svc.amount,
      currency: svc.currency,
      chargedOn: today,
      notes: `Pago recurrente de ${svc.name}`,
    });
  } catch (err) {
    console.error("Error al registrar cargo diferido:", err);
  }

  await supabase
    .from("services")
    .update({ next_charge_date: addCycle(svc.next_charge_date, svc.cycle) })
    .eq("id", serviceId);

  revalidatePath("/servicios");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}
