/**
 * Datos de ejemplo (modo demo). La capa `lib/data.ts` los usa como fallback
 * cuando Supabase no está configurado.
 */
import type { CurrencyCode } from "@/lib/currency";

export const balance = 284750;
export const deltaPct = 12.4;

/**
 * Tasas del Banco Central de Venezuela (BCV) — mock editable.
 * Bs por unidad de divisa. En la Fase 1 se sincroniza con el BCV.
 */
export const bcvRates = {
  date: "2026-07-10",
  USD: 148.2, // Bs por dólar
  EUR: 161.35, // Bs por euro
};

export const stats = {
  porCobrar: 62300,
  vencidas: 3,
  cobradoMes: 118900,
};

/** Serie del gráfico: dos líneas normalizadas 0..1 (mes actual vs. anterior). */
export const chart = {
  actual: [0.18, 0.24, 0.22, 0.46, 0.42, 0.7, 0.62, 0.82, 0.9],
  anterior: [0.28, 0.34, 0.5, 0.44, 0.66, 0.58, 0.74, 0.8, 0.86],
  markerIndex: 6,
};

/* ----------------------------- Clientes ----------------------------- */

export interface Client {
  id: string;
  name: string;
  rif:string;
  /** Score de comportamiento de pago (0-100). */
  score: number;
  /** Términos de crédito por defecto en días. */
  termDays: number;
  /** Saldo pendiente. */
  balance: number;
}

export const clients: Client[] = [
  { id: "c1", name: "Ferretería Peña", rif: "1-01-45678-9", score: 92, termDays: 30, balance: 18500 },
  { id: "c2", name: "Distribuidora Sol", rif: "1-30-11223-4", score: 74, termDays: 15, balance: 9750 },
  { id: "c3", name: "Colmado La Bendición", rif: "0-01-99887-6", score: 88, termDays: 0, balance: 0 },
  { id: "c4", name: "Constructora RD", rif: "1-31-55010-2", score: 61, termDays: 60, balance: 45200 },
  { id: "c5", name: "Farmacia Nova", rif: "1-01-77654-3", score: 95, termDays: 30, balance: 0 },
];

export const getClient = (id: string) => clients.find((c) => c.id === id);

/* ----------------------------- Productos ---------------------------- */

export interface Product {
  id: string;
  name: string;
  price: number;
}

export const products: Product[] = [
  { id: "p1", name: "Servicio de diseño", price: 350 },
  { id: "p2", name: "Consultoría (hora)", price: 25 },
  { id: "p3", name: "Mantenimiento mensual", price: 120 },
  { id: "p4", name: "Impresión gran formato", price: 18 },
];

/* ----------------------------- Facturas ----------------------------- */

export type InvoiceStatus =
  | "pagada"
  | "pendiente"
  | "parcial"
  | "vencida"
  | "borrador";

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  date: string; // ISO yyyy-mm-dd
  dueDate: string;
  total: number;
  status: InvoiceStatus;
}

export const invoices: Invoice[] = [
  { id: "i1", number: "1042", clientId: "c1", date: "2026-07-08", dueDate: "2026-08-07", total: 18500, status: "pagada" },
  { id: "i2", number: "1048", clientId: "c2", date: "2026-07-05", dueDate: "2026-07-20", total: 9750, status: "pendiente" },
  { id: "i3", number: "1051", clientId: "c4", date: "2026-06-01", dueDate: "2026-06-15", total: 45200, status: "vencida" },
  { id: "i4", number: "1050", clientId: "c1", date: "2026-07-02", dueDate: "2026-08-01", total: 12300, status: "parcial" },
  { id: "i5", number: "1039", clientId: "c3", date: "2026-06-28", dueDate: "2026-06-28", total: 6200, status: "pagada" },
  { id: "i6", number: "1052", clientId: "c5", date: "2026-07-10", dueDate: "2026-08-09", total: 0, status: "borrador" },
];

/* ------------------------------ Gastos ------------------------------ */

export interface Expense {
  id: string;
  category: string;
  note: string;
  amount: number;
  date: string;
}

export const expenses: Expense[] = [
  { id: "g1", category: "Transporte", note: "Combustible", amount: 2400, date: "2026-07-10" },
  { id: "g2", category: "Local", note: "Alquiler de oficina", amount: 25000, date: "2026-07-01" },
  { id: "g3", category: "Marketing", note: "Publicidad Meta Ads", amount: 4800, date: "2026-07-06" },
  { id: "g4", category: "Materiales", note: "Insumos de impresión", amount: 7300, date: "2026-07-04" },
];

/* -------------------------- Movimientos (home) ---------------------- */

export type TxKind = "cobro" | "gasto" | "pendiente";

export interface Transaction {
  id: string;
  kind: TxKind;
  title: string;
  subtitle: string;
  amount: number;
  group: "Hoy" | "Ayer";
}

export const transactions: Transaction[] = [
  { id: "t1", kind: "cobro", title: "Cobro · Factura #1042", subtitle: "Ferretería Peña", amount: 18500, group: "Hoy" },
  { id: "t2", kind: "gasto", title: "Gasto · Combustible", subtitle: "Transporte", amount: -2400, group: "Hoy" },
  { id: "t3", kind: "pendiente", title: "Factura #1048 · vence en 3d", subtitle: "Distribuidora Sol", amount: 9750, group: "Ayer" },
  { id: "t4", kind: "cobro", title: "Cobro · Factura #1039", subtitle: "Colmado La Bendición", amount: 6200, group: "Ayer" },
];

/* ------------------------------ Nómina ------------------------------ */

export interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number; // salario por quincena
  currency: CurrencyCode;
}

export const employees: Employee[] = [
  { id: "e1", name: "Ana Reyes", role: "Diseñadora", salary: 220, currency: "USD" },
  { id: "e2", name: "Luis Peña", role: "Desarrollador", salary: 300, currency: "USD" },
  { id: "e3", name: "María Gómez", role: "Administración", salary: 180, currency: "USD" },
  { id: "e4", name: "Jorge Díaz", role: "Ventas", salary: 160, currency: "USD" },
];

export type PayrollStatus = "pendiente" | "pagada";

export interface PayrollPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  payDate: string; // 15 y último de cada mes
  status: PayrollStatus;
  total: number;
}

const nominaQuincena = employees.reduce((s, e) => s + e.salary, 0);

export const payrollPeriods: PayrollPeriod[] = [
  { id: "n1", label: "1–15 jul", startDate: "2026-07-01", endDate: "2026-07-15", payDate: "2026-07-15", status: "pagada", total: nominaQuincena },
  { id: "n2", label: "16–31 jul", startDate: "2026-07-16", endDate: "2026-07-31", payDate: "2026-07-31", status: "pendiente", total: nominaQuincena },
];

/* ---------------------------- Servicios ----------------------------- */

export type ServiceCycle = "mensual" | "anual";

export interface Service {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  cycle: ServiceCycle;
  category: string;
  nextChargeDate: string;
}

export const services: Service[] = [
  { id: "s1", name: "Claude", amount: 20, currency: "USD", cycle: "mensual", category: "IA", nextChargeDate: "2026-07-18" },
  { id: "s2", name: "Supabase", amount: 25, currency: "USD", cycle: "mensual", category: "Backend", nextChargeDate: "2026-07-22" },
  { id: "s3", name: "Vercel", amount: 20, currency: "USD", cycle: "mensual", category: "Hosting", nextChargeDate: "2026-07-25" },
  { id: "s4", name: "Dominio .com", amount: 14, currency: "USD", cycle: "anual", category: "Dominio", nextChargeDate: "2027-03-01" },
];
