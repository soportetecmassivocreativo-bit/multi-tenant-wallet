"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { computeInvoice } from "@/lib/calc";
import type { CurrencyCode, RateRef } from "@/lib/currency";

export interface MutationResult {
  ok: boolean;
  error?: string;
  id?: string;
  demo?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Cliente Supabase + perfil (empresa/rol) del usuario autenticado. */
async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { supabase, companyId: profile.company_id as string, role: profile.role as string };
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

  revalidatePath("/cobros");
  revalidatePath("/dashboard");
  return { ok: true, id: inv.id as string };
}

export interface CreateExpenseInput {
  category: string;
  note: string;
  amount: number;
  currency?: CurrencyCode;
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase.from("expenses").insert({
    company_id: ctx.companyId,
    category: input.category || "General",
    note: input.note,
    amount: input.amount,
    currency: input.currency ?? "USD",
    spent_on: today(),
    source: "manual",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface CreateClientInput {
  name: string;
  rif?: string;
  termDays?: number;
}

export async function addClient(
  input: CreateClientInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase.from("clients").insert({
    company_id: ctx.companyId,
    name: input.name,
    rif: input.rif ?? "",
    score: 80,
    term_days: input.termDays ?? 0,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientes");
  return { ok: true };
}

/** Registra un pago (o abono) contra una factura y actualiza su estado. */
export async function registerPayment(
  invoiceId: string,
  amount: number,
  method = "transferencia",
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (amount <= 0) return { ok: false, error: "Monto inválido." };

  const { data: inv } = await ctx.supabase
    .from("invoices")
    .select("total, currency")
    .eq("id", invoiceId)
    .single();
  if (!inv) return { ok: false, error: "Factura no encontrada." };

  const { error } = await ctx.supabase.from("payments").insert({
    company_id: ctx.companyId,
    invoice_id: invoiceId,
    amount,
    currency: inv.currency,
    paid_on: today(),
    method,
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

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${invoiceId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ------------------------------ Eliminar ----------------------------- */
/* Solo el rol 'admin' puede eliminar. */

async function deleteRow(
  table: "invoices" | "expenses" | "clients",
  id: string,
  paths: string[],
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (ctx.role !== "admin")
    return { ok: false, error: "Solo el administrador puede eliminar." };

  const { error } = await ctx.supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

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
