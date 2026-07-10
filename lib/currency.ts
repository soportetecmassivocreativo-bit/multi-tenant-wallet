/**
 * Sistema de monedas de M-Wallet.
 * Divisas de trabajo: USD y EUR. Conversión fiscal a Bolívares (VES) a la tasa BCV.
 */

export type CurrencyCode = "USD" | "EUR" | "VES";

/** Referencia de tasa BCV usada para convertir a Bolívares. */
export type RateRef = "USD" | "EUR";

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", label: "Dólar" },
  EUR: { code: "EUR", symbol: "€", label: "Euro" },
  VES: { code: "VES", symbol: "Bs", label: "Bolívar" },
};

const fmt = (decimals: number) =>
  new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Formatea un monto con su símbolo: formatCurrency(1234.5, "USD") → "$1.234,50". */
export function formatCurrency(
  amount: number,
  code: CurrencyCode = "USD",
  decimals = 2,
): string {
  const n = fmt(decimals).format(amount);
  return code === "VES" ? `Bs ${n}` : `${CURRENCIES[code].symbol}${n}`;
}

/** Convierte un monto en divisa a Bolívares usando la tasa (Bs por unidad de divisa). */
export function toBolivars(amount: number, rate: number): number {
  return amount * rate;
}
