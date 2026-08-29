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
}

export async function addEmployee(
  input: EmployeeInput,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  // Genera el código correlativo automáticamente (ej: Mas-Corp-0005)
  const code = await getNextCode("employee");

  const { error } = await ctx.supabase.from("employees").insert({
    company_id: ctx.companyId,
    full_name: input.fullName,
    role: input.role,
    salary: input.salary,
    currency: input.currency,
    active: true,
    code,
  });
  if (error) return { ok: false, error: error.message };

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

  const { error } = await ctx.supabase
    .from("employees")
    .update({
      full_name: input.fullName,
      role: input.role,
      salary: input.salary,
      currency: input.currency,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Baja lógica: el empleado deja de aparecer, sin borrar su historial. */
export async function deactivateEmployee(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { error } = await ctx.supabase
    .from("employees")
    .update({ active: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Paga la nómina: registra un egreso por cada empleado activo (en su moneda). */
export async function payPayroll(): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { data: emps } = await ctx.supabase
    .from("employees")
    .select("full_name, salary, currency")
    .eq("company_id", ctx.companyId)
    .eq("active", true);
  if (!emps || emps.length === 0)
    return { ok: false, error: "No hay empleados activos." };

  const rows = emps.map((e) => ({
    company_id: ctx.companyId,
    category: "Nómina",
    note: `Nómina · ${e.full_name}`,
    amount: e.salary,
    currency: e.currency,
    spent_on: today(),
    source: "nomina",
  }));
  const { error } = await ctx.supabase.from("expenses").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Paga a un solo empleado: registra su egreso (en su moneda). Para pagar de a poco. */
export async function payEmployee(
  employeeId: string,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("full_name, salary, currency")
    .eq("id", employeeId)
    .single();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const { error } = await ctx.supabase.from("expenses").insert({
    company_id: ctx.companyId,
    category: "Nómina",
    note: `Nómina · ${emp.full_name}`,
    amount: emp.salary,
    currency: emp.currency,
    spent_on: today(),
    source: "nomina",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nomina");
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}
