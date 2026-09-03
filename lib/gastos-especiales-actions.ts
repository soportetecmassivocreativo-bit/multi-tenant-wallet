"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatEntityCode } from "@/lib/config";
import { logAuditEvent } from "@/lib/audit";
import type { CurrencyCode } from "@/lib/currency";
import type { MutationResult } from "@/lib/mutations";

export interface DeferredCharge {
  id: string;
  code?: string;
  description: string;
  category: string;
  amount: number;
  currency: CurrencyCode;
  chargedOn: string;
  status: "pendiente" | "pagado";
  paidOn?: string;
  paidFrom?: string;
  paidAccountId?: string;
  reference?: string;
  expenseId?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateDeferredChargeInput {
  description: string;
  category: string;
  amount: number;
  currency: CurrencyCode;
  chargedOn: string;
  notes?: string;
}

export interface SettleDeferredChargeInput {
  chargeId: string;
  accountId: string;
  accountName: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
}

const DEFERRED_CHARGES_COOKIE = "m_wallet_deferred_charges";

export async function getDeferredCharges(): Promise<DeferredCharge[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(DEFERRED_CHARGES_COOKIE)?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

async function saveDeferredCharges(charges: DeferredCharge[]) {
  const cookieStore = await cookies();
  cookieStore.set(DEFERRED_CHARGES_COOKIE, encodeURIComponent(JSON.stringify(charges)), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function addDeferredCharge(
  input: CreateDeferredChargeInput
): Promise<MutationResult> {
  if (!input.description?.trim() || input.amount <= 0) {
    return { ok: false, error: "Descripción y monto válido son requeridos." };
  }

  const charges = await getDeferredCharges();
  const nextNum = charges.length + 1;
  const code = formatEntityCode("Mas-Corp-TJM-", nextNum, 4);

  const newCharge: DeferredCharge = {
    id: `tjm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    code,
    description: input.description.trim(),
    category: input.category?.trim() || "Servicios",
    amount: input.amount,
    currency: input.currency || "USD",
    chargedOn: input.chargedOn || new Date().toISOString().slice(0, 10),
    status: "pendiente",
    notes: input.notes?.trim() || "",
    createdAt: new Date().toISOString(),
  };

  charges.unshift(newCharge);
  await saveDeferredCharges(charges);

  await logAuditEvent({
    action: "cargo_tarjeta_jose_miguel",
    entityType: "gasto",
    entityId: newCharge.id,
    description: `Registró cargo diferido en Tarjeta José Miguel: ${newCharge.description} (${newCharge.amount.toFixed(2)} ${newCharge.currency})`,
    details: {
      code,
      description: newCharge.description,
      amount: newCharge.amount,
      currency: newCharge.currency,
      chargedOn: newCharge.chargedOn,
    },
  });

  revalidatePath("/gastos");
  return { ok: true, id: newCharge.id };
}

export async function settleDeferredCharge(
  input: SettleDeferredChargeInput
): Promise<MutationResult> {
  const charges = await getDeferredCharges();
  const chargeIndex = charges.findIndex((c) => c.id === input.chargeId);
  if (chargeIndex === -1) {
    return { ok: false, error: "Cargo diferido no encontrado." };
  }

  const charge = charges[chargeIndex];
  if (charge.status === "pagado") {
    return { ok: false, error: "Este cargo ya ha sido liquidado." };
  }

  const cleanAccount = (input.accountName || "")
    .replace(/Corriente Nacional/gi, "")
    .replace(/Cuenta Corriente/gi, "")
    .replace(/Cuenta Nacional/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const metaParts: string[] = [];
  if (cleanAccount) metaParts.push(`Liquidación Tarjeta José Miguel · ${cleanAccount}`);
  else metaParts.push("Liquidación Tarjeta José Miguel");
  if (input.reference?.trim()) metaParts.push(`Ref: ${input.reference.trim()}`);
  if (input.notes?.trim()) metaParts.push(`"${input.notes.trim()}"`);

  const expenseNote = `${charge.description} [${metaParts.join(" · ")}]`;
  const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);

  let createdExpenseId = `exp_tjm_${Date.now()}`;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (profile?.company_id) {
          const { data: expData, error: expError } = await supabase
            .from("expenses")
            .insert({
              company_id: profile.company_id,
              category: charge.category || "Servicios",
              note: expenseNote,
              amount: charge.amount,
              currency: charge.currency,
              spent_on: paymentDate,
              source: "tarjeta_jm",
              ref_id: charge.id,
            })
            .select("id")
            .single();

          if (expError) {
            console.error("Error al insertar egreso en Supabase:", expError);
          } else if (expData?.id) {
            createdExpenseId = expData.id;
          }
        }
      }
    } catch (e) {
      console.error("Excepción al liquidar cargo en Supabase:", e);
    }
  }

  charges[chargeIndex] = {
    ...charge,
    status: "pagado",
    paidOn: paymentDate,
    paidFrom: cleanAccount || input.accountName,
    paidAccountId: input.accountId,
    reference: input.reference?.trim(),
    expenseId: createdExpenseId,
    notes: input.notes?.trim() || charge.notes,
  };

  await saveDeferredCharges(charges);

  await logAuditEvent({
    action: "liquidacion_tarjeta_jose_miguel",
    entityType: "gasto",
    entityId: createdExpenseId,
    description: `Liquidó cargo de Tarjeta José Miguel (${charge.description}) desde ${cleanAccount} por ${charge.amount.toFixed(2)} ${charge.currency}`,
    details: {
      chargeId: charge.id,
      paidFrom: cleanAccount,
      paidOn: paymentDate,
      reference: input.reference,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  revalidatePath("/reportes");
  return { ok: true };
}

export async function deleteDeferredCharge(id: string): Promise<MutationResult> {
  const charges = await getDeferredCharges();
  const charge = charges.find((c) => c.id === id);
  if (!charge) return { ok: false, error: "Cargo no encontrado." };

  if (charge.expenseId && isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      await supabase.from("expenses").delete().eq("id", charge.expenseId);
    } catch {}
  }

  const updated = charges.filter((c) => c.id !== id);
  await saveDeferredCharges(updated);

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}
