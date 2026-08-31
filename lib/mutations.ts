"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { computeInvoice } from "@/lib/calc";
import { logAuditEvent } from "@/lib/audit";
import type { CurrencyCode, RateRef } from "@/lib/currency";
import { getNextCode } from "@/lib/config-actions";

export interface MutationResult {
  ok: boolean;
  error?: string;
  id?: string;
  demo?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Cliente Supabase + perfil (empresa/rol/nombre) del usuario autenticado. */
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

/* ------------------------------- Crear ------------------------------- */

export interface CreateInvoiceInput {
  clientId: string;
  currency: CurrencyCode;
  lines: { description: string; qty: number; unitPrice: number }[];
  taxRate: number;
  discountPct: number; // 0-100
  creditDays: number;
  rateRef: RateRef;
  rate: number;
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  const { supabase, companyId } = ctx;

  const issueDateISO = today();
  const result = computeInvoice({
    lines: input.lines,
    taxRate: input.taxRate,
    discountPct: input.discountPct / 100,
    creditDays: input.creditDays,
    issueDateISO,
  });
  const isForeign = input.currency !== "VES";

  const { data: company } = await supabase
    .from("companies")
    .select("next_invoice_number")
    .eq("id", companyId)
    .single();
  const number = company?.next_invoice_number ?? 1;

  const { data: inv, error } = await supabase
    .from("invoices")
    .insert({
      company_id: companyId,
      client_id: input.clientId,
      number,
      currency: input.currency,
      subtotal: result.subtotal,
      discount: result.discount,
      tax_rate: input.taxRate,
      tax: result.tax,
      total: result.total,
      ves_rate: isForeign ? input.rate : null,
      ves_rate_ref: isForeign ? input.rateRef : null,
      ves_total: isForeign ? result.total * input.rate : null,
      status: "pendiente",
      issue_date: issueDateISO,
      due_date: result.dueDateISO,
    })
    .select("id")
    .single();
  if (error || !inv) return { ok: false, error: error?.message ?? "Error al crear la factura." };

  if (input.lines.length) {
    await supabase.from("invoice_items").insert(
      input.lines.map((l) => ({
        company_id: companyId,
        invoice_id: inv.id,
        description: l.description,
        qty: l.qty,
        unit_price: l.unitPrice,
      })),
    );
  }
  await supabase
    .from("companies")
    .update({ next_invoice_number: number + 1 })
    .eq("id", companyId);

  await logAuditEvent({
    action: "crear_factura",
    entityType: "factura",
    entityId: inv.id as string,
    description: `Creó la factura #${number} por ${result.total.toFixed(2)} ${input.currency}`,
    details: { number, total: result.total, currency: input.currency },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/cobros");
  revalidatePath("/dashboard");
  return { ok: true, id: inv.id as string };
}

export interface CreateExpenseInput {
  category: string;
  note: string;
  amount: number;
  currency?: CurrencyCode;
  accountId?: string;
  accountName?: string;
  reference?: string; // Últimos 8 dígitos
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const currency = input.currency ?? "USD";
  
  // Guardamos cuenta de débito y referencia de 8 dígitos formateados en la nota si aplica
  let finalNote = input.note.trim();
  const metaParts: string[] = [];
  if (input.accountName) metaParts.push(input.accountName.trim());
  if (input.reference) metaParts.push(`Ref: ${input.reference.trim()}`);
  if (metaParts.length > 0) {
    finalNote = `${finalNote} [${metaParts.join(" · ")}]`;
  }

  const { data: exp, error } = await ctx.supabase
    .from("expenses")
    .insert({
      company_id: ctx.companyId,
      category: input.category || "General",
      note: finalNote,
      amount: input.amount,
      currency,
      spent_on: today(),
      source: "manual",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "crear_gasto",
    entityType: "gasto",
    entityId: exp?.id,
    description: `Registró gasto en ${input.category || "General"}: ${input.amount.toFixed(2)} ${currency} ("${finalNote}")`,
    details: {
      category: input.category,
      amount: input.amount,
      currency,
      accountName: input.accountName,
      reference: input.reference,
    },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateExpense(
  id: string,
  input: CreateExpenseInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  let finalNote = input.note.trim();
  // Evitar duplicar corchetes existentes si ya tenía metadata
  const cleanBaseNote = finalNote.replace(/\s*\[.*?\]\s*$/, "").trim();
  const metaParts: string[] = [];
  if (input.accountName) metaParts.push(input.accountName.trim());
  if (input.reference) metaParts.push(`Ref: ${input.reference.trim()}`);
  if (metaParts.length > 0) {
    finalNote = `${cleanBaseNote} [${metaParts.join(" · ")}]`;
  } else {
    finalNote = cleanBaseNote;
  }

  const { error } = await ctx.supabase
    .from("expenses")
    .update({
      category: input.category || "General",
      note: finalNote,
      amount: input.amount,
      currency: input.currency ?? "USD",
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "editar_gasto",
    entityType: "gasto",
    entityId: id,
    description: `Modificó gasto: ${input.amount.toFixed(2)} ${input.currency ?? "USD"} ("${finalNote}")`,
    details: {
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      accountName: input.accountName,
      reference: input.reference,
    },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface CreateClientInput {
  name: string;
  rif?: string;
  termDays?: number;
  score?: number;
}

export async function addClient(
  input: CreateClientInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const score = Math.min(100, Math.max(0, Math.round(input.score ?? 80)));
  const { data: cl, error } = await ctx.supabase
    .from("clients")
    .insert({
      company_id: ctx.companyId,
      name: input.name,
      rif: input.rif ?? "",
      score,
      term_days: input.termDays ?? 0,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "crear_cliente",
    entityType: "cliente",
    entityId: cl?.id,
    description: `Creó el cliente "${input.name}" (RIF: ${input.rif || "N/A"})`,
    details: { name: input.name, rif: input.rif },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/clientes");
  return { ok: true };
}

export async function updateClient(
  id: string,
  input: CreateClientInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const score = Math.min(100, Math.max(0, Math.round(input.score ?? 80)));
  const { error } = await ctx.supabase
    .from("clients")
    .update({
      name: input.name,
      rif: input.rif ?? "",
      score,
      term_days: input.termDays ?? 0,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "editar_cliente",
    entityType: "cliente",
    entityId: id,
    description: `Modificó cliente "${input.name}" (RIF: ${input.rif || "N/A"})`,
    details: { name: input.name, rif: input.rif },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/clientes");
  return { ok: true };
}

/** Actualiza el estado de una factura (ej. marcar como pagada, anulada o pendiente) */
export async function updateInvoiceStatus(
  id: string,
  status: string,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase
    .from("invoices")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "editar_factura",
    entityType: "factura",
    entityId: id,
    description: `Cambió estado de la factura a ${status}`,
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface RegisterPaymentInput {
  amount: number;
  method?: string;
  accountId?: string;
  accountName?: string;
  reference?: string; // Últimos 8 dígitos
  description?: string; // Concepto o detalle del pago
}

/** Registra un pago (o abono) contra una factura y actualiza su estado. */
export async function registerPayment(
  invoiceId: string,
  inputOrAmount: number | RegisterPaymentInput,
  fallbackMethod = "transferencia",
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const isObj = typeof inputOrAmount === "object";
  const amount = isObj ? inputOrAmount.amount : inputOrAmount;
  const baseMethod = isObj ? inputOrAmount.method || fallbackMethod : fallbackMethod;
  const accountName = isObj ? inputOrAmount.accountName : undefined;
  const reference = isObj ? inputOrAmount.reference : undefined;
  const paymentDescription = isObj ? inputOrAmount.description : undefined;

  if (amount <= 0) return { ok: false, error: "Monto inválido." };

  const { data: inv } = await ctx.supabase
    .from("invoices")
    .select("number, total, currency")
    .eq("id", invoiceId)
    .single();
  if (!inv) return { ok: false, error: "Factura no encontrada." };

  // Construir descripción formateada del método de pago con cuenta, referencia y descripción
  let formattedMethod = baseMethod.trim();
  const metaParts: string[] = [];
  if (paymentDescription?.trim()) metaParts.push(`"${paymentDescription.trim()}"`);
  if (accountName) metaParts.push(accountName.trim());
  if (reference) metaParts.push(`Ref: ${reference.trim()}`);
  if (metaParts.length > 0) {
    formattedMethod = `${formattedMethod} · ${metaParts.join(" · ")}`;
  }

  const { error } = await ctx.supabase.from("payments").insert({
    company_id: ctx.companyId,
    invoice_id: invoiceId,
    amount,
    currency: inv.currency,
    paid_on: today(),
    method: formattedMethod,
  });
  if (error) return { ok: false, error: error.message };

  const { data: pays } = await ctx.supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const status =
    paid >= Number(inv.total) ? "pagada" : paid > 0 ? "parcial" : "pendiente";
  await ctx.supabase.from("invoices").update({ status }).eq("id", invoiceId);

  await logAuditEvent({
    action: "registrar_pago",
    entityType: "pago",
    entityId: invoiceId,
    description: `Registró pago de ${amount.toFixed(2)} ${inv.currency} para la factura #${inv.number} vía ${formattedMethod}`,
    details: {
      invoiceId,
      number: inv.number,
      amount,
      method: formattedMethod,
      accountName,
      reference,
      status,
    },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${invoiceId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ------------------------------ Eliminar ----------------------------- */

async function deleteRow(
  table: "invoices" | "expenses" | "clients" | "payments",
  id: string,
  paths: string[],
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (ctx.role !== "admin" && ctx.role !== "ceo" && ctx.role !== "project_manager")
    return { ok: false, error: "Solo el Administrador, CEO o Project Manager puede eliminar." };

  const { error } = await ctx.supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: `eliminar_${table === "invoices" ? "factura" : table === "expenses" ? "gasto" : table === "clients" ? "cliente" : "pago"}`,
    entityType: table === "invoices" ? "factura" : table === "expenses" ? "gasto" : table === "clients" ? "cliente" : "pago",
    entityId: id,
    description: `Eliminó registro de ${table} (ID: ${id})`,
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  paths.forEach((p) => revalidatePath(p));
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<MutationResult> {
  return deleteRow("invoices", id, ["/cobros", "/dashboard"]);
}

export async function deleteExpense(id: string): Promise<MutationResult> {
  return deleteRow("expenses", id, ["/gastos", "/dashboard"]);
}

export async function deleteClient(id: string): Promise<MutationResult> {
  return deleteRow("clients", id, ["/clientes"]);
}

export async function deletePayment(id: string): Promise<MutationResult> {
  return deleteRow("payments", id, ["/cobros", "/dashboard"]);
}
