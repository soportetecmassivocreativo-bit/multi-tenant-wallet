import { formatCurrency, type CurrencyCode } from "@/lib/currency";

/** Monto con símbolo, sin decimales (para dashboard y listas). "$284.750" */
export function formatMoney(value: number, code: CurrencyCode = "USD"): string {
  return formatCurrency(value, code, 0);
}

const nf = new Intl.NumberFormat("es-VE");

/** Delta con signo unicode: 18500 → "+18.500", -2400 → "−2.400". */
export function formatSigned(value: number): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${nf.format(Math.abs(Math.round(value)))}`;
}

/** Número plano con separadores de miles. */
export function formatNumber(value: number): string {
  return nf.format(Math.round(value));
}

const df = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short" });

/** Fecha ISO (yyyy-mm-dd) → "8 jul". Se construye local para evitar desfase de zona. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return df.format(new Date(y, m - 1, d));
}
