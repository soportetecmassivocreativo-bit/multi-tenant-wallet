/**
 * Motor de cálculo de cobro inteligente de M-Wallet.
 * Impuestos, descuentos, términos de crédito y predicción de pago.
 */

export interface CalcLine {
  qty: number;
  unitPrice: number;
}

export interface CalcInput {
  lines: CalcLine[];
  /** Tasa de impuesto (ITBIS), ej. 0.18. */
  taxRate: number;
  /** Descuento sobre el subtotal, ej. 0.05 = 5%. */
  discountPct: number;
  /** Días de crédito (0 = contado). */
  creditDays: number;
  /** Fecha de emisión ISO (yyyy-mm-dd). */
  issueDateISO: string;
}

export interface CalcResult {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
  dueDateISO: string;
}

/** Suma días a una fecha ISO devolviendo otra fecha ISO (sin desfase de zona). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Calcula todos los totales de una factura. */
export function computeInvoice(input: CalcInput): CalcResult {
  const subtotal = input.lines.reduce(
    (sum, l) => sum + (l.qty || 0) * (l.unitPrice || 0),
    0,
  );
  const discount = subtotal * input.discountPct;
  const taxable = subtotal - discount;
  const tax = taxable * input.taxRate;
  const total = taxable + tax;
  const dueDateISO = addDays(input.issueDateISO, input.creditDays);

  return { subtotal, discount, taxable, tax, total, dueDateISO };
}

/**
 * Predicción de días hasta el pago según el score del cliente y los términos.
 * Score alto → paga cerca (o antes) del vencimiento; score bajo → se atrasa.
 */
export function predictPaymentDays(creditDays: number, score: number): number {
  if (creditDays === 0) return 1;
  // Factor 0.85 (score 100, paga antes) … 1.4 (score 40, se atrasa).
  const factor = 1.4 - (Math.min(100, Math.max(0, score)) / 100) * 0.55;
  return Math.max(1, Math.round(creditDays * factor));
}
