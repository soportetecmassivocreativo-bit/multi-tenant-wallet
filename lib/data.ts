import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import * as mock from "@/lib/mock-data";
import type {
  Client,
  Invoice,
  Expense,
  Employee,
  PayrollPeriod,
  Service,
} from "@/lib/mock-data";

/**
 * Capa de acceso a datos. Si Supabase está configurado, consulta la base;
 * si no, devuelve los datos de ejemplo (modo demo). Las páginas solo usan esto.
 */

const OPEN_STATUSES = ["pendiente", "parcial", "vencida"];

export interface BcvRates {
  usd: number;
  eur: number;
  date: string;
}

export async function getBcvRates(): Promise<BcvRates> {
  if (!isSupabaseConfigured) {
    return { usd: mock.bcvRates.USD, eur: mock.bcvRates.EUR, date: mock.bcvRates.date };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("bcv_rates")
    .select("date:rate_date, usd, eur")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data
    ? { usd: Number(data.usd), eur: Number(data.eur), date: String(data.date) }
    : { usd: mock.bcvRates.USD, eur: mock.bcvRates.EUR, date: mock.bcvRates.date };
}

export async function getInvoices(): Promise<Invoice[]> {
  if (!isSupabaseConfigured) return mock.invoices;
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, number, clientId:client_id, date:issue_date, dueDate:due_date, total, status",
    )
    .order("issue_date", { ascending: false });
  return (data ?? []) as unknown as Invoice[];
}

export async function getClients(): Promise<Client[]> {
  if (!isSupabaseConfigured) return mock.clients;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, rif, score, termDays:term_days")
    .order("name");
  const clients = (data ?? []) as unknown as Client[];
  const invoices = await getInvoices();
  return clients.map((c) => ({
    ...c,
    balance: invoices
      .filter((i) => i.clientId === c.id && OPEN_STATUSES.includes(i.status))
      .reduce((s, i) => s + i.total, 0),
  }));
}

export async function getClient(id: string): Promise<Client | null> {
  const clients = await getClients();
  return clients.find((c) => c.id === id) ?? null;
}

export async function getExpenses(): Promise<Expense[]> {
  if (!isSupabaseConfigured) return mock.expenses;
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, category, note, amount, date:spent_on")
    .order("spent_on", { ascending: false });
  return (data ?? []) as unknown as Expense[];
}

export async function getEmployees(): Promise<Employee[]> {
  if (!isSupabaseConfigured) return mock.employees;
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, name:full_name, role, salary, currency")
    .eq("active", true)
    .order("full_name");
  return (data ?? []) as unknown as Employee[];
}

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  if (!isSupabaseConfigured) return mock.payrollPeriods;
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_periods")
    .select(
      "id, label, startDate:start_date, endDate:end_date, payDate:pay_date, status, total",
    )
    .order("pay_date", { ascending: false });
  return (data ?? []) as unknown as PayrollPeriod[];
}

export async function getServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) return mock.services;
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(
      "id, name, amount, currency, cycle, category, nextChargeDate:next_charge_date",
    )
    .eq("active", true)
    .order("next_charge_date");
  return (data ?? []) as unknown as Service[];
}

export interface DashboardSummary {
  balance: number;
  deltaPct: number;
  bcv: BcvRates;
  porCobrar: number;
  vencidas: number;
  cobradoMes: number;
  nominaMes: number;
  serviciosMes: number;
  chart: typeof mock.chart;
  transactions: typeof mock.transactions;
}

/** Resumen contable del dashboard: compone ingresos y egresos (incluye nómina y servicios). */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [invoices, employees, services, bcv] = await Promise.all([
    getInvoices(),
    getEmployees(),
    getServices(),
    getBcvRates(),
  ]);

  const porCobrar = invoices
    .filter((i) => OPEN_STATUSES.includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const vencidas = invoices.filter((i) => i.status === "vencida").length;

  // Nómina mensual = dos quincenas.
  const nominaMes = employees.reduce((s, e) => s + e.salary, 0) * 2;
  // Servicios mensuales + prorrateo de los anuales.
  const serviciosMes = services.reduce(
    (s, x) => s + (x.cycle === "anual" ? x.amount / 12 : x.amount),
    0,
  );

  return {
    balance: mock.balance,
    deltaPct: mock.deltaPct,
    bcv,
    porCobrar,
    vencidas,
    cobradoMes: mock.stats.cobradoMes,
    nominaMes,
    serviciosMes,
    chart: mock.chart,
    transactions: mock.transactions,
  };
}
