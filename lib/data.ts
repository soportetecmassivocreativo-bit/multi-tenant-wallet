import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getSystemConfig } from "@/lib/config-actions";
import { formatEntityCode } from "@/lib/config";
import * as mock from "@/lib/mock-data";
import type { CurrencyCode } from "@/lib/currency";
import type {
  Client,
  Invoice,
  Proforma,
  ProformaStatus,
  Expense,
  Employee,
  PayrollPeriod,
  Service,
  Product,
} from "@/lib/mock-data";

export type {
  Client,
  Invoice,
  Proforma,
  ProformaStatus,
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
  try {
    const live = await fetchLiveBcvRates();
    if (isSupabaseConfigured) {
      syncAndSaveBcvRates().catch(() => {});
    }
    return { usd: live.usd, eur: live.eur, date: live.date };
  } catch {
    return { usd: 798.326, eur: 926.5531, date: new Date().toISOString().slice(0, 10) };
  }
}


export async function getInvoices(): Promise<Invoice[]> {
  const config = await getSystemConfig();
  const prefix = config.invoicePrefix || config.basePrefix || "Mas-Corp-Fact-";
  const digits = config.codeDigits || 4;

  if (!isSupabaseConfigured) {
    return [...mock.invoices]
      .map((inv) => ({
        ...inv,
        code: formatEntityCode(prefix, Number(inv.number), digits),
      }))
      .sort((a, b) => Number(b.number) - Number(a.number));
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, number, clientId:client_id, date:issue_date, dueDate:due_date, total, status, created_at",
    )
    .order("number", { ascending: false });

  const invoices = (data ?? []).map((inv) => ({
    ...inv,
    code: formatEntityCode(prefix, Number(inv.number), digits),
  })) as unknown as Invoice[];

  // Garantizar siempre el orden numérico correlativo descendente (#10, #9, #8... #1)
  return invoices.sort((a, b) => Number(b.number) - Number(a.number));
}

/* ----------------------------- Proformas ---------------------------- */

export interface ProformaItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface ProformaDetail {
  id: string;
  number: number | string;
  code?: string;
  clientId: string;
  clientName: string;
  clientRif?: string;
  date: string;
  validUntil?: string;
  status: ProformaStatus;
  currency: CurrencyCode;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  vesRate: number | null;
  vesRateRef: string | null;
  vesTotal: number | null;
  notes?: string;
  items: ProformaItem[];
  invoiceId?: string;
  targetAccountId?: string;
  targetAccountName?: string;
  paidAmount?: number;
  hasConditions?: boolean;
  conditions?: {
    payment?: string;
    delivery?: string;
    ip?: string;
    confidentiality?: string;
  };
}

export async function getProformas(): Promise<Proforma[]> {
  const config = await getSystemConfig();
  const prefix = config.proformaPrefix || "Mas-Corp-Prof-";
  const digits = config.codeDigits || 4;

  if (!isSupabaseConfigured) {
    return [...mock.proformas]
      .map((p) => ({
        ...p,
        code: formatEntityCode(prefix, Number(p.number), digits),
      }))
      .sort((a, b) => Number(b.number) - Number(a.number));
  }

  const supabase = await createClient();

  // 1. Intentar consultar tabla proformas
  try {
    const { data, error } = await supabase
      .from("proformas")
      .select(
        "id, number, clientId:client_id, date:issue_date, validUntil:valid_until, total, status, currency, notes, invoiceId:invoice_id, created_at",
      )
      .order("number", { ascending: false });

    if (!error && data && data.length > 0) {
      const list = data.map((p) => ({
        ...p,
        code: formatEntityCode(prefix, Number(p.number), digits),
      })) as unknown as Proforma[];
      return list.sort((a, b) => Number(b.number) - Number(a.number));
    }
  } catch (err) {
    // Si la tabla no existe aún, seguimos al puente de facturas pendientes
  }

  // 2. Puente / Migración de facturas pendientes existentes
  const { data: invData } = await supabase
    .from("invoices")
    .select(
      "id, number, clientId:client_id, date:issue_date, dueDate:due_date, total, status, currency, created_at",
    )
    .order("number", { ascending: false });

  if (invData && invData.length > 0) {
    return invData
      .filter((inv) => inv.status !== "pagada")
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        code: formatEntityCode(prefix, Number(inv.number), digits),
        clientId: inv.clientId,
        date: inv.date,
        validUntil: inv.dueDate,
        total: inv.total,
        currency: (inv.currency as CurrencyCode) || "USD",
        status: "pendiente" as ProformaStatus,
        notes: "Proforma derivada de cuenta por cobrar",
        invoiceId: inv.id,
      }))
      .sort((a, b) => Number(b.number) - Number(a.number));
  }

  return [];
}

export async function getProformaDetail(id: string): Promise<ProformaDetail | null> {
  const config = await getSystemConfig();
  const prefix = config.proformaPrefix || "Mas-Corp-Prof-";
  const digits = config.codeDigits || 4;

  if (!isSupabaseConfigured) {
    const p = mock.proformas.find((x) => x.id === id);
    if (!p) return null;
    const clientName = mock.clients.find((c) => c.id === p.clientId)?.name ?? "—";
    return {
      id: p.id,
      number: p.number,
      code: formatEntityCode(prefix, Number(p.number), digits),
      clientId: p.clientId,
      clientName,
      date: p.date,
      validUntil: p.validUntil,
      status: p.status,
      currency: p.currency || "USD",
      subtotal: p.total,
      discount: 0,
      tax: 0,
      total: p.total,
      vesRate: null,
      vesRateRef: null,
      vesTotal: null,
      notes: p.notes,
      items: [
        {
          id: "item1",
          description: p.notes || "Servicios Comerciales",
          qty: 1,
          unitPrice: p.total,
        },
      ],
      invoiceId: p.invoiceId,
    };
  }

  const supabase = await createClient();

  // Buscar en proformas o en invoices
  let row: Record<string, unknown> | null = null;
  let isFromInvoices = false;

  try {
    const { data } = await supabase
      .from("proformas")
      .select(
        "id, number, clientId:client_id, date:issue_date, validUntil:valid_until, status, currency, subtotal, discount, tax, total, vesRate:ves_rate, vesRateRef:ves_rate_ref, vesTotal:ves_total, notes, invoiceId:invoice_id",
      )
      .eq("id", id)
      .single();
    if (data) row = data as Record<string, unknown>;
  } catch (err) {}

  if (!row) {
    // Buscar en invoices
    const { data: inv } = await supabase
      .from("invoices")
      .select(
        "id, number, clientId:client_id, date:issue_date, dueDate:due_date, status, currency, subtotal, discount, tax, total, vesRate:ves_rate, vesRateRef:ves_rate_ref, vesTotal:ves_total",
      )
      .eq("id", id)
      .single();
    if (inv) {
      row = inv as Record<string, unknown>;
      isFromInvoices = true;
    }
  }

  if (!row) return null;

  const [itemsRes, clientRes] = await Promise.all([
    supabase
      .from(isFromInvoices ? "invoice_items" : "proforma_items")
      .select("id, description, qty, unitPrice:unit_price")
      .eq(isFromInvoices ? "invoice_id" : "proforma_id", id),
    supabase
      .from("clients")
      .select("name, tax_id")
      .eq("id", row.clientId as string)
      .maybeSingle(),
  ]);

  const items = (itemsRes.data ?? []) as unknown as ProformaItem[];
  const clientData = clientRes.data as { name?: string; tax_id?: string; rif?: string } | null;

  return {
    id: row.id as string,
    number: row.number as string | number,
    code: formatEntityCode(prefix, Number(row.number), digits),
    clientId: row.clientId as string,
    clientName: clientData?.name ?? "—",
    clientRif: clientData?.tax_id || clientData?.rif || "J-00000000-0",
    date: (row.date as string) || (row.issue_date as string) || new Date().toISOString().slice(0, 10),
    validUntil: (row.validUntil as string) || (row.dueDate as string) || (row.due_date as string),
    status: (row.status as ProformaStatus) || "pendiente",
    currency: (row.currency as CurrencyCode) || "USD",
    subtotal: Number(row.subtotal) || Number(row.total) || 0,
    discount: Number(row.discount) || 0,
    tax: Number(row.tax) || 0,
    total: Number(row.total) || 0,
    vesRate: (row.vesRate as number) || null,
    vesRateRef: (row.vesRateRef as string) || null,
    vesTotal: (row.vesTotal as number) || null,
    notes: (row.notes as string) || undefined,
    items,
    invoiceId: isFromInvoices ? (row.id as string) : (row.invoiceId as string),
  };
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
  code?: string;
  clientId: string;
  clientName: string;
  clientRif?: string;
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
  const config = await getSystemConfig();
  const prefix = config.invoicePrefix || config.basePrefix || "Mas-Corp-Fact-";
  const digits = config.codeDigits || 4;

  if (!isSupabaseConfigured) {
    const inv = mock.invoices.find((i) => i.id === id);
    if (!inv) return null;
    const clientName =
      mock.clients.find((c) => c.id === inv.clientId)?.name ?? "—";
    const paidTotal = inv.status === "pagada" ? inv.total : 0;
    return {
      id: inv.id,
      number: inv.number,
      code: formatEntityCode(prefix, Number(inv.number), digits),
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
      .select("name, tax_id")
      .eq("id", row.clientId as string)
      .maybeSingle(),
  ]);

  const items = (itemsRes.data ?? []) as unknown as InvoiceItem[];
  const payments = (paymentsRes.data ?? []) as unknown as Payment[];
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const clientData = clientRes.data as { name?: string; tax_id?: string; rif?: string } | null;

  return {
    ...(row as unknown as InvoiceDetail),
    code: formatEntityCode(prefix, Number(row.number), digits),
    clientName: clientData?.name ?? "—",
    clientRif: clientData?.tax_id || clientData?.rif || "J-00000000-0",
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

import { getExpenseBreakdown } from "./cuentas-helpers";
export { getExpenseBreakdown };

export async function getExpenses(): Promise<Expense[]> {
  const config = await getSystemConfig();
  const prefix = config.expensePrefix || config.basePrefix || "Mas-Corp-Egre-";
  const digits = config.codeDigits || 4;
  const startNum = Number(config.expenseCounter || 1);

  if (!isSupabaseConfigured) {
    return [...mock.expenses]
      .map((e, idx) => ({
        ...e,
        code: formatEntityCode(prefix, startNum + idx, digits),
      }))
      .reverse();
  }
  const supabase = await createClient();
  // Ordenamos por created_at ASC para fijar el número único permanente de cada gasto
  const { data } = await supabase
    .from("expenses")
    .select("id, category, note, amount, currency, date:spent_on, source, refId:ref_id, created_at")
    .order("created_at", { ascending: true });

  const withPermanentCodes = (data ?? []).map((e, idx) => ({
    ...e,
    code: formatEntityCode(prefix, startNum + idx, digits),
  }));

  // Retornamos de forma fija y correlativa descendente (el más reciente arriba)
  return withPermanentCodes.reverse() as unknown as Expense[];
}

export async function getPayrollExpenses(): Promise<Expense[]> {
  const allExpenses = await getExpenses();
  return allExpenses.filter(
    (e) =>
      (e.source || "").toLowerCase() === "nomina" ||
      (e.category || "").toLowerCase().includes("nómina") ||
      (e.category || "").toLowerCase().includes("nomina") ||
      (e.note || "").toLowerCase().includes("nómina") ||
      (e.note || "").toLowerCase().includes("nomina")
  );
}

/** Egresos registrados desde pagos de Servicios Recurrentes, ordenados más recientes primero. */
export async function getServiceExpenses(): Promise<Expense[]> {
  const allExpenses = await getExpenses();
  return allExpenses.filter(
    (e) =>
      (e.source || "").toLowerCase() === "servicio" ||
      ((e.note || "").toLowerCase().includes("servicio") &&
        !(e.note || "").toLowerCase().includes("nomina"))
  );
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
  let data: any[] | null = null;
  try {
    const res = await supabase
      .from("employees")
      .select("id, name:full_name, role, salary, currency, idNumber:id_number, bankName:bank_name, accountType:account_type, accountNumber:account_number, bankNotes:bank_notes, created_at")
      .eq("active", true)
      .order("created_at", { ascending: true });
    if (!res.error && res.data) {
      data = res.data;
    }
  } catch {}

  if (!data) {
    const fallbackRes = await supabase
      .from("employees")
      .select("id, name:full_name, role, salary, currency, created_at")
      .eq("active", true)
      .order("created_at", { ascending: true });
    data = fallbackRes.data ?? [];
  }

  const withPermanentCodes = (data ?? []).map((e, idx) => ({
    ...e,
    code: formatEntityCode(prefix, startNum + idx, digits),
  }));

  // Ordenados explícitamente por código correlativo ascendente (Mas-Corp-Nom-0001, 0002, ...)
  return withPermanentCodes.sort((a, b) =>
    (a.code || "").localeCompare(b.code || "", undefined, { numeric: true })
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

  // Contabilidad real: ingresos (pagos cobrados) − egresos pagados (gastos pagados).
  const cobrado = payments.reduce((s, p) => s + Number(p.amount), 0);
  const gastos = expenses.reduce((s, e) => s + getExpenseBreakdown(e).paidAmount, 0);
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
