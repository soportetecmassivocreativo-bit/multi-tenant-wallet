import { formatCurrency, type CurrencyCode } from "@/lib/currency";

/** Monto con símbolo, sin decimales (para dashboard y listas). "$284.750" */
export function formatMoney(value: number, code: CurrencyCode = "USD"): string {
  return formatCurrency(value, code, 0);
}

const nf = new Intl.NumberFormat("es-VE");

/** Delta con signo unicode: 18500 → "+18.500", -2400 → "−2.400". */
export function formatSigned(value?: number | null): string {
  const safe = typeof value === "number" && !isNaN(value) ? value : 0;
  const sign = safe < 0 ? "−" : "+";
  return `${sign}${nf.format(Math.abs(Math.round(safe)))}`;
}

/** Número plano con separadores de miles. */
export function formatNumber(value?: number | null): string {
  const safe = typeof value === "number" && !isNaN(value) ? value : 0;
  return nf.format(Math.round(safe));
}

const df = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short" });

/** Fecha ISO (yyyy-mm-dd o timestamp ISO) → "8 jul". Se construye local para evitar desfase de zona. */
export function formatDate(iso?: string | null): string {
  if (!iso || typeof iso !== "string") return "";
  try {
    const clean = iso.trim().split("T")[0].split(" ")[0];
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [y, m, d] = parts;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) {
        return df.format(date);
      }
    }
    const fallbackDate = new Date(iso);
    if (!isNaN(fallbackDate.getTime())) {
      return df.format(fallbackDate);
    }
    return clean || iso;
  } catch {
    return iso || "";
  }
}
