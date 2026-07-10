import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import * as mock from "@/lib/mock-data";
import type { CurrencyCode } from "@/lib/currency";
import type {
  Client,
  Invoice,
  Expense,
  Employee,
  PayrollPeriod,
  Service,
  Product,
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

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Payment {
  id: string;
  amount: number;
  paidOn: string;
  method: string;
}

export interface InvoiceDetail {
  id: string;
  number: number | string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  status: string;
  currency: CurrencyCode;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  vesRate: number | null;
  vesRateRef: string | null;
  vesTotal: number | null;
  items: InvoiceItem[];
  payments: Payment[];
  paidTotal: number;
  balance: number;
}

export async function getInvoiceDetail(
  id: string,
): Promise<InvoiceDetail | null> {
  if (!isSupabaseConfigured) {
    const inv = mock.invoices.find((i) => i.id === id);
    if (!inv) return null;
    const clientName =
      mock.clients.find((c) => c.id === inv.clientId)?.name ?? "—";
    const paidTotal = inv.status === "pagada" ? inv.total : 0;
    return {
      id: inv.id,
      number: inv.number,
      clientId: inv.clientId,
      clientName,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status,
      currency: "USD",
      subtotal: inv.total,
      discount: 0,
      tax: 0,
      total: inv.total,
      vesRate: null,
      vesRateRef: null,
      vesTotal: null,
      items: [],
      payments: [],
      paidTotal,
      balance: inv.total - paidTotal,
    };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, number, clientId:client_id, date:issue_date, dueDate:due_date, status, currency, subtotal, discount, tax, total, vesRate:ves_rate, vesRateRef:ves_rate_ref, vesTotal:ves_total",
    )
    .eq("id", id)
    .single();
  if (!inv) return null;
  const row = inv as Record<string, unknown>;

  const [itemsRes, paymentsRes, clientRes] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("id, description, qty, unitPrice:unit_price")
      .eq("invoice_id", id),
    supabase
      .from("payments")
      .select("id, amount, paidOn:paid_on, method")
      .eq("invoice_id", id)
      .order("paid_on"),
    supabase
      .from("clients")
      .select("name")
      .eq("id", row.clientId as string)
      .maybeSingle(),
  ]);

  const items = (itemsRes.data ?? []) as unknown as InvoiceItem[];
  const payments = (paymentsRes.data ?? []) as unknown as Payment[];
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0);

  return {
    ...(row as unknown as InvoiceDetail),
    clientName: (clientRes.data?.name as string) ?? "—",
    items,
    payments,
    paidTotal,
    balance: Number(row.total) - paidTotal,
  };
}

export async function getPayments(): Promise<Payment[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("id, amount, paidOn:paid_on, method")
    .order("paid_on", { ascending: false });
  return (data ?? []) as unknown as Payment[];
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

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return mock.products;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, price, currency")
    .order("name");
  return (data ?? []) as unknown as Product[];
}

export interface CurrentProfile {
  userId: string;
  companyId: string;
  role: string;
}

/** Perfil del usuario autenticado (empresa + rol). En modo demo devuelve un admin ficticio. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!isSupabaseConfigured)
    return { userId: "demo", companyId: "demo", role: "admin" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return { userId: user.id, companyId: data.company_id, role: data.role };
}

export async function isAdmin(): Promise<boolean> {
  const p = await getCurrentProfile();
  return p?.role === "admin";
}

export interface TeamMember {
  userId: string;
  name: string;
  role: string;
}

export async function getTeam(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured)
    return [{ userId: "demo", name: "Tú (demo)", role: "admin" }];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("userId:id, name:full_name, role");
  return (data ?? []) as unknown as TeamMember[];
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
}

export async function getInvitations(): Promise<Invitation[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("id, email, role")
    .eq("status", "pendiente")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Invitation[];
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
  const [invoices, employees, services, bcv, payments, expenses] =
    await Promise.all([
      getInvoices(),
      getEmployees(),
      getServices(),
      getBcvRates(),
      getPayments(),
      getExpenses(),
    ]);

  const porCobrar = invoices
    .filter((i) => OPEN_STATUSES.includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const vencidas = invoices.filter((i) => i.status === "vencida").length;

  // Convierte a USD-equivalente usando la tasa BCV (para sumar monedas mixtas).
  const toUSD = (amount: number, currency: string) =>
    currency === "VES"
      ? amount / bcv.usd
      : currency === "EUR"
        ? amount * (bcv.eur / bcv.usd)
        : amount;

  // Nómina mensual = dos quincenas (en USD-equivalente).
  const nominaMes =
    employees.reduce((s, e) => s + toUSD(e.salary, e.currency), 0) * 2;
  // Servicios mensuales + prorrateo de los anuales (en USD-equivalente).
  const serviciosMes = services.reduce(
    (s, x) =>
      s + toUSD(x.cycle === "anual" ? x.amount / 12 : x.amount, x.currency),
    0,
  );

  // Contabilidad real: ingresos (pagos cobrados) − egresos (gastos).
  const cobrado = payments.reduce((s, p) => s + Number(p.amount), 0);
  const gastos = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = isSupabaseConfigured ? cobrado - gastos : mock.balance;
  const cobradoMes = isSupabaseConfigured ? cobrado : mock.stats.cobradoMes;

  return {
    balance,
    deltaPct: mock.deltaPct,
    bcv,
    porCobrar,
    vencidas,
    cobradoMes,
    nominaMes,
    serviciosMes,
    chart: mock.chart,
    transactions: mock.transactions,
  };
}
