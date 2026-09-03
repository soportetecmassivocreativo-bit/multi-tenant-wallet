"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { MutationResult } from "@/lib/mutations";
import type { CurrencyCode } from "@/lib/currency";
import { getNextCode } from "@/lib/config-actions";

const today = () => new Date().toISOString().slice(0, 10);

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

export interface EmployeeInput {
  fullName: string;
  role: string;
  salary: number;
  currency: CurrencyCode;
  idNumber?: string;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  bankNotes?: string;
}

export async function addEmployee(
  input: EmployeeInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  try {
    const { error } = await ctx.supabase.from("employees").insert({
      company_id: ctx.companyId,
      full_name: input.fullName,
      role: input.role,
      salary: input.salary,
      currency: input.currency,
      id_number: input.idNumber || null,
      bank_name: input.bankName || null,
      account_type: input.accountType || null,
      account_number: input.accountNumber || null,
      bank_notes: input.bankNotes || null,
      active: true,
    });
    if (!error) {
      revalidatePath("/nomina");
      revalidatePath("/dashboard");
      return { ok: true };
    }
  } catch {}

  // Fallback seguro si la tabla aún no tiene las columnas adicionales en Supabase
  const { error: baseError } = await ctx.supabase.from("employees").insert({
    company_id: ctx.companyId,
    full_name: input.fullName,
    role: input.role,
    salary: input.salary,
    currency: input.currency,
    active: true,
  });
  if (baseError) return { ok: false, error: baseError.message };

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  try {
    const { error } = await ctx.supabase
      .from("employees")
      .update({
        full_name: input.fullName,
        role: input.role,
        salary: input.salary,
        currency: input.currency,
        id_number: input.idNumber || null,
        bank_name: input.bankName || null,
        account_type: input.accountType || null,
        account_number: input.accountNumber || null,
        bank_notes: input.bankNotes || null,
      })
      .eq("id", id);
    if (!error) {
      revalidatePath("/nomina");
      revalidatePath("/dashboard");
      return { ok: true };
    }
  } catch {}

  // Fallback seguro
  const { error: baseError } = await ctx.supabase
    .from("employees")
    .update({
      full_name: input.fullName,
      role: input.role,
      salary: input.salary,
      currency: input.currency,
    })
    .eq("id", id);
  if (baseError) return { ok: false, error: baseError.message };

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEmployee(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase
    .from("employees")
    .delete()
    .eq("id", id);
  if (error) {
    // Si hay registros vinculados, hacer baja lógica
    await ctx.supabase
      .from("employees")
      .update({ active: false })
      .eq("id", id);
  }

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deactivateEmployee(id: string): Promise<MutationResult> {
  return deleteEmployee(id);
}

export interface PayPayrollOptions {
  accountId?: string;
  accountName?: string;
  reference?: string;
  notes?: string;
  periodLabel?: string;
  status?: "pagado" | "pendiente"; // 'pagado' = aprobado y liquidado, 'pendiente' = pendiente por aprobar en gastos
}

/** Paga la nómina completa: registra los egresos vinculados para cada empleado activo */
export async function payPayroll(
  options?: PayPayrollOptions,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { data: emps } = await ctx.supabase
    .from("employees")
    .select("id, full_name, salary, currency, role, id_number, bank_name, account_number")
    .eq("company_id", ctx.companyId)
    .eq("active", true);
  if (!emps || emps.length === 0)
    return { ok: false, error: "No hay empleados activos." };

  const isApproved = options?.status === "pagado";
  const cleanAccount = (options?.accountName || "")
    .replace(/Corriente Nacional/gi, "")
    .replace(/Cuenta Corriente/gi, "")
    .replace(/Cuenta Nacional/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const rows = emps.map((e) => {
    let note = `Nómina · ${e.full_name}`;
    const metaParts: string[] = [];
    if (isApproved) {
      if (cleanAccount) metaParts.push(`Pagado desde ${cleanAccount}`);
      else metaParts.push("Pagado");
      if (options?.reference) metaParts.push(`Ref: ${options.reference}`);
    } else {
      metaParts.push("Por Aprobar / Pendiente de Pago");
      if (cleanAccount) metaParts.push(`Previsto: ${cleanAccount}`);
    }
    if (options?.periodLabel) metaParts.push(options.periodLabel);
    if (options?.notes) metaParts.push(`"${options.notes}"`);

    if (metaParts.length > 0) {
      note = `${note} [${metaParts.join(" · ")}]`;
    }

    return {
      company_id: ctx.companyId,
      category: "Nómina",
      note,
      amount: e.salary,
      currency: e.currency,
      spent_on: today(),
      source: "nomina",
      ref_id: e.id,
    };
  });

  const { error } = await ctx.supabase.from("expenses").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Paga a un solo empleado: registra su egreso vinculado (en su moneda) */
export async function payEmployee(
  employeeId: string,
  options?: PayPayrollOptions,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id, full_name, salary, currency, role, id_number, bank_name, account_number")
    .eq("id", employeeId)
    .single();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const isApproved = options?.status === "pagado";
  const cleanAccount = (options?.accountName || "")
    .replace(/Corriente Nacional/gi, "")
    .replace(/Cuenta Corriente/gi, "")
    .replace(/Cuenta Nacional/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  let note = `Nómina · ${emp.full_name}`;
  const metaParts: string[] = [];
  if (isApproved) {
    if (cleanAccount) metaParts.push(`Pagado desde ${cleanAccount}`);
    else metaParts.push("Pagado");
    if (options?.reference) metaParts.push(`Ref: ${options.reference}`);
  } else {
    metaParts.push("Por Aprobar / Pendiente de Pago");
    if (cleanAccount) metaParts.push(`Previsto: ${cleanAccount}`);
  }
  if (options?.periodLabel) metaParts.push(options.periodLabel);
  if (options?.notes) metaParts.push(`"${options.notes}"`);

  if (metaParts.length > 0) {
    note = `${note} [${metaParts.join(" · ")}]`;
  }

  const { error } = await ctx.supabase.from("expenses").insert({
    company_id: ctx.companyId,
    category: "Nómina",
    note,
    amount: emp.salary,
    currency: emp.currency,
    spent_on: today(),
    source: "nomina",
    ref_id: emp.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Aprueba y liquida un gasto de nómina pendiente directamente */
export async function approvePayrollExpense(
  expenseId: string,
  options?: { accountName?: string; reference?: string; notes?: string },
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { data: exp } = await ctx.supabase
    .from("expenses")
    .select("id, note, amount, currency")
    .eq("id", expenseId)
    .single();
  if (!exp) return { ok: false, error: "Gasto de nómina no encontrado." };

  const cleanBaseNote = exp.note.replace(/\s*\[.*?\]\s*$/, "").trim();
  const cleanAccount = (options?.accountName || "")
    .replace(/Corriente Nacional/gi, "")
    .replace(/Cuenta Corriente/gi, "")
    .replace(/Cuenta Nacional/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const metaParts: string[] = [];
  if (cleanAccount) metaParts.push(`Pagado desde ${cleanAccount}`);
  else metaParts.push("Pagado y Aprobado");
  if (options?.reference?.trim()) metaParts.push(`Ref: ${options.reference.trim()}`);
  if (options?.notes?.trim()) metaParts.push(`"${options.notes.trim()}"`);

  const updatedNote = `${cleanBaseNote} [${metaParts.join(" · ")}]`;

  const { error } = await ctx.supabase
    .from("expenses")
    .update({
      note: updatedNote,
    })
    .eq("id", expenseId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}
