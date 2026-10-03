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

export interface DeferredAbono {
  id: string;
  code?: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  paidOn: string;
  paidFrom: string;
  paidAccountId?: string;
  reference?: string;
  notes?: string;
  expenseId?: string;
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

export interface CreateDeferredAbonoInput {
  description: string;
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  accountName: string;
  paidOn: string;
  reference?: string;
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

export interface DeferredCardClosure {
  id: string;
  code: string;
  period: string;
  closedAt: string;
  closedBy?: string;
  initialDebt: number;
  totalCharges: number;
  totalAbonos: number;
  finalBalance: number;
  currency: CurrencyCode;
  notes?: string;
  charges: DeferredCharge[];
  abonos: DeferredAbono[];
  createdAt: string;
}

const DEFERRED_CHARGES_COOKIE = "m_wallet_deferred_charges";
const DEFERRED_ABONOS_COOKIE = "m_wallet_deferred_abonos";
const DEFERRED_CARD_LIMIT_COOKIE = "m_wallet_deferred_card_limit";
const DEFERRED_CARD_CLOSURES_COOKIE = "m_wallet_deferred_card_closures";
const DEFERRED_LAST_CLOSURE_COOKIE = "m_wallet_deferred_last_closure_at";

const DEFAULT_CHARGES: DeferredCharge[] = [
  {
    id: "tjm_supabase",
    code: "Mas-Corp-TJM-0001",
    description: "Servicio · Supabase",
    category: "Base de Datos",
    amount: 216.18,
    currency: "USD",
    chargedOn: "2026-08-29",
    status: "pendiente",
    notes: "Suscripción Base de Datos Cloud",
    createdAt: "2026-08-29T10:00:00.000Z",
  },
  {
    id: "tjm_claude",
    code: "Mas-Corp-TJM-0002",
    description: "Servicio · Claude",
    category: "IA",
    amount: 217.75,
    currency: "USD",
    chargedOn: "2026-09-01",
    status: "pendiente",
    notes: "Suscripción Inteligencia Artificial Pro",
    createdAt: "2026-09-01T10:00:00.000Z",
  },
];

const DEFAULT_ABONOS: DeferredAbono[] = [
  {
    id: "abono_albanil_jm",
    code: "Mas-Corp-ABN-0001",
    description: "Pago Albañil Jose Miguel Arias",
    amount: 39.00,
    currency: "USD",
    paidOn: "2026-09-03",
    paidFrom: "Banesco Corriente Nacional",
    reference: "67689643",
    notes: "Abono parcial descontado de deuda de tarjeta",
    createdAt: "2026-09-03T12:00:00.000Z",
  },
];

export async function getDeferredCardLimit(): Promise<number> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(DEFERRED_CARD_LIMIT_COOKIE)?.value;
    if (raw !== undefined && raw !== null && raw !== "") {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    const lastClosure = cookieStore.get(DEFERRED_LAST_CLOSURE_COOKIE)?.value;
    if (lastClosure) {
      return 0;
    }
  } catch {}
  return 539.12;
}

export async function updateDeferredCardLimit(limit: number): Promise<MutationResult> {
  if (isNaN(limit) || limit < 0) {
    return { ok: false, error: "Ingresa un límite válido." };
  }
  const cookieStore = await cookies();
  cookieStore.set(DEFERRED_CARD_LIMIT_COOKIE, String(limit), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/gastos");
  return { ok: true };
}

export async function increaseDeferredCardDebt(amountToAdd: number, reason?: string): Promise<MutationResult> {
  if (isNaN(amountToAdd) || amountToAdd <= 0) {
    return { ok: false, error: "Ingresa un monto válido mayor a 0 para aumentar la deuda." };
  }
  const current = await getDeferredCardLimit();
  const newLimit = Math.round((current + amountToAdd) * 100) / 100;
  
  const cookieStore = await cookies();
  cookieStore.set(DEFERRED_CARD_LIMIT_COOKIE, String(newLimit), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  await logAuditEvent({
    action: "aumento_deuda_tarjeta_jose_miguel",
    entityType: "gasto",
    description: `Aumentó la deuda de Tarjeta José Miguel en +${amountToAdd.toFixed(2)} USD (Nueva deuda: ${newLimit.toFixed(2)} USD)${reason ? ` - ${reason}` : ""}`,
    details: {
      amountAdded: amountToAdd,
      previousDebt: current,
      newDebt: newLimit,
      reason,
    },
  });

  revalidatePath("/gastos");
  return { ok: true };
}

export async function getDeferredCharges(): Promise<DeferredCharge[]> {
  let charges: DeferredCharge[] = [];
  let lastClosureTime = 0;
  try {
    const cookieStore = await cookies();
    const lastClosure = cookieStore.get(DEFERRED_LAST_CLOSURE_COOKIE)?.value;
    if (lastClosure) lastClosureTime = new Date(lastClosure).getTime();

    const raw = cookieStore.get(DEFERRED_CHARGES_COOKIE)?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        charges = parsed.filter((c) => {
          if (!lastClosureTime) return true;
          const cTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
          return cTime > lastClosureTime;
        });
      }
    }
  } catch {}

  if (charges.length === 0 && lastClosureTime === 0) {
    charges = [...DEFAULT_CHARGES];
  }

  // Sincronizar automáticamente con gastos de servicios registrados en Supabase
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: svcExpenses } = await supabase
        .from("expenses")
        .select("id, category, note, amount, currency, spent_on, created_at, source, ref_id, code")
        .or("source.eq.servicio,source.eq.tarjeta_jm_consumo,source.eq.tarjeta_jm,note.ilike.%servicio%")
        .order("created_at", { ascending: false });

      if (svcExpenses && svcExpenses.length > 0) {
        for (const exp of svcExpenses) {
          const expDateStr = exp.created_at || (exp.spent_on ? `${exp.spent_on}T23:59:59.999Z` : "");
          const expTime = expDateStr ? new Date(expDateStr).getTime() : 0;
          if (lastClosureTime > 0 && expTime > 0 && expTime <= lastClosureTime) {
            continue;
          }

          const rawNote = exp.note || "Servicio";
          const lowerNote = rawNote.toLowerCase();
          // Excluir abonos/pagos de nómina o abonos a tarjeta
          if (lowerNote.includes("nomina") || lowerNote.includes("nómina") || lowerNote.includes("abono a tarjeta") || lowerNote.includes("abono a la deuda")) {
            continue;
          }
          const cleanDesc = rawNote.replace(/\s*\[.*?\]\s*/g, "").trim();

          const alreadyExists = charges.some(
            (c) =>
              c.expenseId === exp.id ||
              c.id === `tjm_exp_${exp.id}` ||
              (c.amount === Number(exp.amount) &&
                c.chargedOn === (exp.spent_on || exp.created_at?.slice(0, 10)) &&
                (c.description.toLowerCase().includes(cleanDesc.toLowerCase()) ||
                  cleanDesc.toLowerCase().includes(c.description.toLowerCase())))
          );

          if (!alreadyExists) {
            const nextNum = charges.length + 1;
            const code = exp.code || formatEntityCode("Mas-Corp-TJM-", nextNum, 4);
            charges.unshift({
              id: `tjm_exp_${exp.id}`,
              code,
              description: cleanDesc.startsWith("Servicio") ? cleanDesc : `Servicio · ${cleanDesc}`,
              category: exp.category || "Servicios",
              amount: Number(exp.amount),
              currency: exp.currency || "USD",
              chargedOn: exp.spent_on || (exp.created_at ? exp.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
              status: "pendiente",
              expenseId: exp.id,
              notes: rawNote,
              createdAt: exp.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error("Error al sincronizar cargos de servicios en Tarjeta José Miguel:", e);
    }
  }

  return charges;
}

export async function getDeferredAbonos(): Promise<DeferredAbono[]> {
  let abonos: DeferredAbono[] = [];
  let lastClosureTime = 0;
  try {
    const cookieStore = await cookies();
    const lastClosure = cookieStore.get(DEFERRED_LAST_CLOSURE_COOKIE)?.value;
    if (lastClosure) lastClosureTime = new Date(lastClosure).getTime();

    const raw = cookieStore.get(DEFERRED_ABONOS_COOKIE)?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        abonos = parsed.filter((a) => {
          if (!lastClosureTime) return true;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return aTime > lastClosureTime;
        });
      }
    }
  } catch {}

  if (abonos.length === 0 && lastClosureTime === 0) {
    abonos = [...DEFAULT_ABONOS];
  }

  // Sincronizar automáticamente con gastos de abonos/pagos registrados en Supabase
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: expRows } = await supabase
        .from("expenses")
        .select("id, category, note, amount, currency, spent_on, created_at, source, ref_id, code")
        .order("created_at", { ascending: false });

      if (expRows && expRows.length > 0) {
        for (const exp of expRows) {
          const expDateStr = exp.created_at || (exp.spent_on ? `${exp.spent_on}T23:59:59.999Z` : "");
          const expTime = expDateStr ? new Date(expDateStr).getTime() : 0;
          if (lastClosureTime > 0 && expTime > 0 && expTime <= lastClosureTime) {
            continue;
          }

          const rawNote = exp.note || "";
          const lowerNote = rawNote.toLowerCase();
          const lowerCat = (exp.category || "").toLowerCase();
          const src = (exp.source || "").toLowerCase();

          // Identificar si es un abono o pago a la deuda de José Miguel / Tarjeta
          const isAbono =
            src === "tarjeta_jm_abono" ||
            src === "tarjeta_jm_pago" ||
            src === "tarjeta_jm" ||
            lowerCat === "abono a tarjeta" ||
            lowerCat.includes("abono") ||
            lowerNote.includes("abono a la deuda") ||
            lowerNote.includes("abono a tarjeta") ||
            lowerNote.includes("abono tarjeta") ||
            lowerNote.includes("liquidación tarjeta") ||
            lowerNote.includes("liquidacion tarjeta") ||
            lowerNote.includes("pago a tarjeta") ||
            lowerNote.includes("pago de tarjeta") ||
            lowerNote.includes("pago josé miguel") ||
            lowerNote.includes("pago jose miguel") ||
            lowerNote.includes("abono jm");

          // Excluir si es un consumo o servicio directo cargado a la tarjeta
          const isCharge =
            src === "tarjeta_jm_consumo" ||
            src === "servicio" ||
            lowerNote.includes("cargo en tarjeta") ||
            lowerNote.includes("consumo tarjeta");

          if (!isAbono || isCharge) {
            continue;
          }

          const cleanDesc = rawNote.replace(/\s*\[.*?\]\s*$/, "").trim() || "Abono Tarjeta José Miguel";

          // Extraer cuenta / banco y referencia
          let paidFrom = "Pago Móvil Banesco";
          let ref = exp.ref_id || "";
          const metaMatch = rawNote.match(/\[(.*?)\]$/);
          if (metaMatch) {
            const metaContent = metaMatch[1];
            const refMatch = metaContent.match(/Ref:\s*(\d+)/i);
            if (refMatch) ref = refMatch[1];
            const cleanAcc = metaContent.replace(/Ref:\s*\d+/i, "").replace(/^[·\s]+|[·\s]+$/g, "").trim();
            if (cleanAcc) paidFrom = cleanAcc;
          }

          const alreadyExists = abonos.some(
            (a) =>
              (exp.id && a.expenseId === exp.id) ||
              a.id === `abn_exp_${exp.id}` ||
              (a.amount === Number(exp.amount) &&
                a.paidOn === (exp.spent_on || exp.created_at?.slice(0, 10)) &&
                (a.description.toLowerCase().includes(cleanDesc.toLowerCase()) ||
                  cleanDesc.toLowerCase().includes(a.description.toLowerCase())))
          );

          if (!alreadyExists) {
            const nextNum = abonos.length + 1;
            const code = exp.code || formatEntityCode("Mas-Corp-ABN-", nextNum, 4);
            abonos.unshift({
              id: `abn_exp_${exp.id}`,
              code,
              description: cleanDesc,
              amount: Number(exp.amount),
              currency: exp.currency || "USD",
              paidOn: exp.spent_on || (exp.created_at ? exp.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
              paidFrom: paidFrom,
              paidAccountId: undefined,
              reference: ref || undefined,
              notes: rawNote,
              expenseId: exp.id,
              createdAt: exp.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error("Error al sincronizar abonos en Tarjeta José Miguel:", e);
    }
  }

  return abonos;
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

async function saveDeferredAbonos(abonos: DeferredAbono[]) {
  const cookieStore = await cookies();
  cookieStore.set(DEFERRED_ABONOS_COOKIE, encodeURIComponent(JSON.stringify(abonos)), {
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

  // Incrementar automáticamente la deuda total de la tarjeta
  try {
    await increaseDeferredCardDebt(newCharge.amount, `Consumo: ${newCharge.description}`);
  } catch {}

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

export async function addDeferredAbono(
  input: CreateDeferredAbonoInput
): Promise<MutationResult> {
  if (!input.description?.trim() || input.amount <= 0) {
    return { ok: false, error: "Concepto y monto válido son requeridos." };
  }
  if (!input.accountId) {
    return { ok: false, error: "Selecciona la cuenta de origen del pago." };
  }

  const abonos = await getDeferredAbonos();
  const nextNum = abonos.length + 1;
  const code = formatEntityCode("Mas-Corp-ABN-", nextNum, 4);

  const cleanAccount = (input.accountName || "")
    .replace(/Corriente Nacional/gi, "")
    .replace(/Cuenta Corriente/gi, "")
    .replace(/Cuenta Nacional/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const metaParts: string[] = [];
  if (cleanAccount) metaParts.push(cleanAccount);
  if (input.reference?.trim()) metaParts.push(`Ref: ${input.reference.trim()}`);
  if (input.notes?.trim()) metaParts.push(`"${input.notes.trim()}"`);

  const expenseNote = `${input.description.trim()} [${metaParts.join(" · ")}]`;
  const paymentDate = input.paidOn || new Date().toISOString().slice(0, 10);

  let createdExpenseId = `exp_abn_${Date.now()}`;

  // Insertar egreso real en expenses
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
              category: "Abono a Tarjeta",
              note: expenseNote,
              amount: input.amount,
              currency: input.currency,
              spent_on: paymentDate,
              source: "tarjeta_jm_abono",
            })
            .select("id")
            .single();

          if (expData?.id) {
            createdExpenseId = expData.id;
          }
        }
      }
    } catch (e) {
      console.error("Error al registrar abono en expenses:", e);
    }
  }

  const newAbono: DeferredAbono = {
    id: `abn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    code,
    description: input.description.trim(),
    amount: input.amount,
    currency: input.currency || "USD",
    paidOn: paymentDate,
    paidFrom: cleanAccount || input.accountName,
    paidAccountId: input.accountId,
    reference: input.reference?.trim(),
    notes: input.notes?.trim() || "",
    expenseId: createdExpenseId,
    createdAt: new Date().toISOString(),
  };

  abonos.unshift(newAbono);
  await saveDeferredAbonos(abonos);

  await logAuditEvent({
    action: "abono_deuda_tarjeta_jose_miguel",
    entityType: "gasto",
    entityId: createdExpenseId,
    description: `Abonó a la deuda de Tarjeta José Miguel: ${newAbono.description} (${newAbono.amount.toFixed(2)} ${newAbono.currency}) desde ${cleanAccount}`,
    details: {
      code,
      amount: newAbono.amount,
      paidFrom: cleanAccount,
      reference: newAbono.reference,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  revalidatePath("/reportes");
  return { ok: true, id: newAbono.id };
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

          if (expData?.id) {
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

export async function deleteDeferredAbono(id: string): Promise<MutationResult> {
  const abonos = await getDeferredAbonos();
  const abono = abonos.find((a) => a.id === id);
  if (!abono) return { ok: false, error: "Abono no encontrado." };

  if (abono.expenseId && isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      await supabase.from("expenses").delete().eq("id", abono.expenseId);
    } catch {}
  }

  const updated = abonos.filter((a) => a.id !== id);
  await saveDeferredAbonos(updated);

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getDeferredCardClosures(): Promise<DeferredCardClosure[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(DEFERRED_CARD_CLOSURES_COOKIE)?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
      }
    }
  } catch {}
  return [];
}

async function saveDeferredCardClosures(closures: DeferredCardClosure[]) {
  const cookieStore = await cookies();
  cookieStore.set(DEFERRED_CARD_CLOSURES_COOKIE, encodeURIComponent(JSON.stringify(closures)), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function executeDeferredCardClosure(input: {
  period: string;
  notes?: string;
  resetLimitTo?: number;
}): Promise<MutationResult & { closure?: DeferredCardClosure }> {
  if (!input.period?.trim()) {
    return { ok: false, error: "Indica el nombre o mes del periodo a cerrar." };
  }

  const periodName = input.period.trim();
  const [currentLimit, currentCharges, currentAbonos, closures] = await Promise.all([
    getDeferredCardLimit(),
    getDeferredCharges(),
    getDeferredAbonos(),
    getDeferredCardClosures(),
  ]);

  const totalCharges = currentCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalAbonos = currentAbonos.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const finalBalance = Math.max(0, currentLimit - totalAbonos);

  const nextNum = closures.length + 1;
  const code = formatEntityCode("Mas-Corp-CJM-", nextNum, 4);
  const closureTime = new Date().toISOString();

  const newClosure: DeferredCardClosure = {
    id: `cjm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    code,
    period: periodName,
    closedAt: closureTime,
    initialDebt: currentLimit,
    totalCharges,
    totalAbonos,
    finalBalance,
    currency: "USD",
    notes: input.notes?.trim() || "",
    charges: [...currentCharges],
    abonos: [...currentAbonos],
    createdAt: closureTime,
  };

  // Guardar en histórico de cierres
  closures.unshift(newClosure);
  await saveDeferredCardClosures(closures);

  // Reiniciar el ciclo activo desde CERO (o saldo indicado)
  const cookieStore = await cookies();
  const nextLimit = input.resetLimitTo !== undefined && !isNaN(input.resetLimitTo) && input.resetLimitTo >= 0 ? input.resetLimitTo : 0;
  
  cookieStore.set(DEFERRED_CARD_LIMIT_COOKIE, String(nextLimit), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(DEFERRED_CHARGES_COOKIE, encodeURIComponent(JSON.stringify([])), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(DEFERRED_ABONOS_COOKIE, encodeURIComponent(JSON.stringify([])), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(DEFERRED_LAST_CLOSURE_COOKIE, closureTime, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  await logAuditEvent({
    action: "cierre_mensual_tarjeta_jose_miguel",
    entityType: "gasto",
    entityId: newClosure.id,
    description: `Ejecutó cierre mensual ${newClosure.period} (${newClosure.code}). Deuda base: ${currentLimit.toFixed(2)} USD, Consumos: ${totalCharges.toFixed(2)} USD, Abonos: ${totalAbonos.toFixed(2)} USD, Saldo liquidado: ${finalBalance.toFixed(2)} USD. Nuevo ciclo reiniciado a ${nextLimit.toFixed(2)} USD.`,
    details: {
      code,
      period: periodName,
      initialDebt: currentLimit,
      totalCharges,
      totalAbonos,
      finalBalance,
      chargesCount: currentCharges.length,
      abonosCount: currentAbonos.length,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/reportes");
  revalidatePath("/dashboard");

  return { ok: true, id: newClosure.id, closure: newClosure };
}

export async function deleteDeferredCardClosure(id: string): Promise<MutationResult> {
  const closures = await getDeferredCardClosures();
  const updated = closures.filter((c) => c.id !== id);
  await saveDeferredCardClosures(updated);

  revalidatePath("/reportes");
  revalidatePath("/gastos");
  return { ok: true };
}
