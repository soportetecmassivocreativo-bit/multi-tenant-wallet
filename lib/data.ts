import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getSystemConfig } from "@/lib/config-actions";
import { formatEntityCode } from "@/lib/config";
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

export type {
  Client,
  Invoice,
  Expense,
  Employee,
  PayrollPeriod,
  Service,
  Product,
};

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

import { fetchLiveBcvRates, syncAndSaveBcvRates } from "@/lib/bcv";

export async function getBcvRates(): Promise<BcvRates> {
  // Modo rápido cuando no hay Supabase
  if (!isSupabaseConfigured) {
    const live = await fetchLiveBcvRates();
    return { usd: live.usd, eur: live.eur, date: live.date };
  }

  try {
    // Timeout ultra rápido de 1s para DB: si Supabase tarda, caemos inmediatamente a live
    const dbPromise = (async (): Promise<BcvRates | null> => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("bcv_rates")
        .select("date:rate_date, usd, eur")
        .order("rate_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const today = new Date().toISOString().slice(0, 10);
      if (data && String(data.date) >= today) {
        return {
          usd: Number(data.usd),
          eur: Number(data.eur),
          date: String(data.date),
        };
      }
      return null;
    })();

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1000),
    );

    const fromDb = await Promise.race([dbPromise, timeoutPromise]);
    if (fromDb) return fromDb;

    // Sincronizar en background (no bloquea al usuario)
    syncAndSaveBcvRates().catch(() => {});
    const live = await fetchLiveBcvRates();
    return { usd: live.usd, eur: live.eur, date: live.date };
  } catch {
    const live = await fetchLiveBcvRates();
    return { usd: live.usd, eur: live.eur, date: live.date };
  }
}


export async function getInvoices(): Promise<Invoice[]> {
  const config = await getSystemConfig();
  const prefix = config.invoicePrefix || config.basePrefix || "Mas-Corp-Fact-";
  const digits = config.codeDigits || 4;

  if (!isSupabaseConfigured) return mock.invoices;
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, number, clientId:client_id, date:issue_date, dueDate:due_date, total, status",
    )
    .order("issue_date", { ascending: false });

  return (data ?? []).map((inv) => ({
    ...inv,
    code: formatEntityCode(prefix, Number(inv.number), digits),
  })) as unknown as Invoice[];
}

export async function getClients(): Promise<Client[]> {
  const config = await getSystemConfig();
  const digits = config.codeDigits || 4;

  if (!isSupabaseConfigured) return mock.clients;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, rif, score, termDays:term_days")
    .order("created_at", { ascending: true });

  const clients = (data ?? []).map((c, idx) => ({
    ...c,
    code: formatEntityCode("Mas-Corp-Clie-", idx + 1, digits),
  })) as unknown as Client[];

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
  invoiceId?: string | null;
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
    .select("id, amount, paidOn:paid_on, method, invoiceId:invoice_id")
    .order("paid_on", { ascending: false });
  return (data ?? []) as unknown as Payment[];
}

export interface Movement {
  id: string;
  kind: "cobro" | "gasto";
  title: string;
  subtitle: string;
  amount: number; // + cobro, − gasto
  date: string;
}

/** Movimientos recientes reales: pagos (ingresos) + gastos (egresos), más nuevos primero. */
export async function getRecentMovements(limit = 8): Promise<Movement[]> {
  if (!isSupabaseConfigured) {
    return mock.transactions.map((t) => ({
      id: t.id,
      kind: t.kind === "gasto" ? "gasto" : "cobro",
      title: t.title,
      subtitle: t.subtitle,
      amount: t.amount,
      date: mock.bcvRates.date,
    }));
  }

  const [payments, expenses, invoices, clients] = await Promise.all([
    getPayments(),
    getExpenses(),
    getInvoices(),
    getClients(),
  ]);
  const invMap = new Map(invoices.map((i) => [i.id, i]));
  const cliMap = new Map(clients.map((c) => [c.id, c.name]));

  const cobros: Movement[] = payments.map((p) => {
    const inv = p.invoiceId ? invMap.get(p.invoiceId) : undefined;
    const client = inv ? cliMap.get(inv.clientId) : undefined;
    return {
      id: `p_${p.id}`,
      kind: "cobro",
      title: inv ? `Cobro · Factura #${inv.number}` : "Cobro",
      subtitle: client ?? "",
      amount: Number(p.amount),
      date: p.paidOn,
    };
  });
  const gastos: Movement[] = expenses.map((e) => ({
    id: `e_${e.id}`,
    kind: "gasto",
    title: e.note,
    subtitle: e.category,
    amount: -e.amount,
    date: e.date,
  }));

  return [...cobros, ...gastos]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit);
}

export async function getExpenses(): Promise<Expense[]> {
  const config = await getSystemConfig();
  const prefix = config.expensePrefix || config.basePrefix || "Mas-Corp-Egre-";
  const digits = config.codeDigits || 4;
  const startNum = Number(config.expenseCounter || 1);

  if (!isSupabaseConfigured) {
    return mock.expenses.map((e, idx) => ({
      ...e,
      code: formatEntityCode(prefix, startNum + idx, digits),
    }));
  }
  const supabase = await createClient();
  // Ordenamos por created_at ASC para fijar el número único permanente de cada gasto
  const { data } = await supabase
    .from("expenses")
    .select("id, category, note, amount, currency, date:spent_on, created_at")
    .order("created_at", { ascending: true });

  const withPermanentCodes = (data ?? []).map((e, idx) => ({
    ...e,
    code: formatEntityCode(prefix, startNum + idx, digits),
  }));

  // Retornamos ordenado por fecha de gasto descendente para la vista
  return withPermanentCodes.sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
  ) as unknown as Expense[];
}

export async function getEmployees(): Promise<Employee[]> {
  const config = await getSystemConfig();
  const prefix = config.employeePrefix || config.basePrefix || "Mas-Corp-Nom-";
  const digits = config.codeDigits || 4;
  const startNum = Number(config.employeeCounter || 1);

  if (!isSupabaseConfigured) {
    return mock.employees.map((e, idx) => ({
      ...e,
      code: formatEntityCode(prefix, startNum + idx, digits),
    }));
  }
  const supabase = await createClient();
  // Ordenamos por created_at ASC para fijar el código inmutable del empleado
  const { data } = await supabase
    .from("employees")
    .select("id, name:full_name, role, salary, currency, created_at")
    .eq("active", true)
    .order("created_at", { ascending: true });

  const withPermanentCodes = (data ?? []).map((e, idx) => ({
    ...e,
    code: formatEntityCode(prefix, startNum + idx, digits),
  }));

  return withPermanentCodes.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  ) as unknown as Employee[];
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
  const config = await getSystemConfig();
  const prefix = config.servicePrefix || config.basePrefix || "Mas-Corp-Serv-";
  const digits = config.codeDigits || 4;
  const startNum = Number(config.serviceCounter || 1);

  if (!isSupabaseConfigured) {
    return mock.services.map((s, idx) => ({
      ...s,
      code: formatEntityCode(prefix, startNum + idx, digits),
    }));
  }
  const supabase = await createClient();
  // Ordenamos por created_at ASC para que el código asignado sea FIJO e INMUTABLE aunque se pague o modifique
  const { data } = await supabase
    .from("services")
    .select(
      "id, name, amount, currency, cycle, category, nextChargeDate:next_charge_date, created_at",
    )
    .eq("active", true)
    .order("created_at", { ascending: true });

  const withPermanentCodes = (data ?? []).map((s, idx) => ({
    ...s,
    code: formatEntityCode(prefix, startNum + idx, digits),
  }));

  // Ordenamos para la vista por fecha de próximo cobro sin modificar el código permanente
  return withPermanentCodes.sort((a, b) =>
    (a.nextChargeDate || "").localeCompare(b.nextChargeDate || "")
  ) as unknown as Service[];
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
  return p?.role === "admin" || p?.role === "ceo" || p?.role === "project_manager";
}

export interface Company {
  id: string;
  name: string;
  rif: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  nextInvoiceNumber: number;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export async function getCompany(): Promise<Company | null> {
  if (!isSupabaseConfigured) {
    return {
      id: "demo",
      name: "Massivo Creativo",
      rif: "J-31000000-0",
      defaultCurrency: "USD",
      defaultTaxRate: 0.16,
      nextInvoiceNumber: 1053,
      address: "",
      phone: "",
      email: "",
      logoUrl: "",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!prof) return null;
  const { data } = await supabase
    .from("companies")
    .select(
      "id, name, rif, defaultCurrency:default_currency, defaultTaxRate:default_tax_rate, nextInvoiceNumber:next_invoice_number, address, phone, email, logoUrl:logo_url",
    )
    .eq("id", prof.company_id)
    .single();
  return (data as unknown as Company) ?? null;
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

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface ReportData {
  ingresos: number;
  egresos: number;
  neto: number;
  porCategoria: CategoryTotal[];
  hasData: boolean;
}

/** Reporte del mes actual: ingresos (pagos) vs egresos (gastos) + desglose por categoría. */
export async function getReport(): Promise<ReportData> {
  const [payments, expenses] = await Promise.all([
    getPayments(),
    getExpenses(),
  ]);
  const ym = new Date().toISOString().slice(0, 7); // "2026-07"
  const inMonth = (d: string) => d.startsWith(ym);

  const ingresos = payments
    .filter((p) => inMonth(p.paidOn))
    .reduce((s, p) => s + Number(p.amount), 0);
  const monthExpenses = expenses.filter((e) => inMonth(e.date));
  const egresos = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const catMap = new Map<string, number>();
  for (const e of monthExpenses)
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
  const porCategoria = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    ingresos,
    egresos,
    neto: ingresos - egresos,
    porCategoria,
    hasData: payments.length + expenses.length > 0,
  };
}

export interface DashboardSummary {
  balance: number;
  bcv: BcvRates;
  porCobrar: number;
  vencidas: number;
  cobradoMes: number;
  nominaMes: number;
  serviciosMes: number;
  movements: Movement[];
  hasMovements: boolean;
  chartSeries: number[];
}

/** Resumen contable del dashboard: compone ingresos y egresos (incluye nómina y servicios). */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Timeout de seguridad: si Supabase tarda más de 12s, usamos mock data.
  const fetchAll = Promise.all([
    getInvoices(),
    getEmployees(),
    getServices(),
    getBcvRates(),
    getPayments(),
    getExpenses(),
    getRecentMovements(),
  ]);

  const timeoutFallback = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 7000)
  );

  const result = await Promise.race([fetchAll, timeoutFallback]);

  // Si hubo timeout, devolver resumen con datos mock para no bloquear el dashboard
  if (!result) {
    return {
      balance: mock.balance,
      bcv: { usd: mock.bcvRates.USD, eur: mock.bcvRates.EUR, date: mock.bcvRates.date },
      porCobrar: mock.stats.porCobrar,
      vencidas: 0,
      cobradoMes: mock.stats.cobradoMes,
      nominaMes: 0,
      serviciosMes: 0,
      movements: mock.transactions.map((t) => ({
        id: t.id,
        kind: t.kind === "gasto" ? "gasto" as const : "cobro" as const,
        title: t.title,
        subtitle: t.subtitle,
        amount: t.amount,
        date: mock.bcvRates.date,
      })),
      hasMovements: true,
      chartSeries: mock.chart.actual,
    };
  }

  const [invoices, employees, services, bcv, payments, expenses, movements] = result;

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

  const hasMovements = isSupabaseConfigured
    ? payments.length + expenses.length > 0
    : true;
  const chartSeries = isSupabaseConfigured
    ? buildBalanceSeries(payments, expenses, 12)
    : mock.chart.actual;

  return {
    balance,
    bcv,
    porCobrar,
    vencidas,
    cobradoMes,
    nominaMes,
    serviciosMes,
    movements,
    hasMovements,
    chartSeries,
  };
}

/** Serie del balance acumulado (ingresos − egresos) de los últimos N días. */
function buildBalanceSeries(
  payments: Payment[],
  expenses: Expense[],
  days: number,
): number[] {
  const netByDate = new Map<string, number>();
  for (const p of payments)
    netByDate.set(p.paidOn, (netByDate.get(p.paidOn) ?? 0) + Number(p.amount));
  for (const e of expenses)
    netByDate.set(e.date, (netByDate.get(e.date) ?? 0) - e.amount);

  const series: number[] = [];
  let running = 0;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    running += netByDate.get(iso) ?? 0;
    series.push(running);
  }
  return series;
}
