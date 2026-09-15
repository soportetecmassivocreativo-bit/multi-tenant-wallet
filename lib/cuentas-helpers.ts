import type { CompanyAccount } from "./cuentas-actions";

/**
 * Filtra los métodos de pago disponibles según la cuenta seleccionada.
 * - Banesco / Banco Nacional / VES: Transferencia Bancaria, Pago Móvil.
 * - Binance / USDT / Cripto: Binance USDT / Cripto.
 * - Zelle: Zelle.
 * - Efectivo: Efectivo / Caja.
 */
export function getPaymentMethodsForAccount(account?: CompanyAccount): string[] {
  if (!account) {
    return [
      "Transferencia Bancaria",
      "Pago Móvil",
      "Zelle",
      "Efectivo / Caja",
      "Binance USDT / Cripto",
    ];
  }

  const name = (account.name || "").toLowerCase();
  const type = (account.accountType || "").toLowerCase();
  const cur = (account.currency || "").toUpperCase();

  if (type === "crypto" || name.includes("binance") || name.includes("usdt") || cur === "USDT") {
    return ["Binance USDT / Cripto"];
  }

  if (type === "zelle" || name.includes("zelle")) {
    return ["Zelle"];
  }

  if (type === "efectivo" || name.includes("efectivo") || name.includes("caja")) {
    return ["Efectivo / Caja"];
  }

  if (type === "pago_movil" || name.includes("pago móvil") || name.includes("pago movil")) {
    return ["Pago Móvil", "Transferencia Bancaria"];
  }

  if (
    type === "banco_nacional" ||
    name.includes("banesco") ||
    name.includes("mercantil") ||
    name.includes("provincial") ||
    name.includes("venezuela") ||
    name.includes("bancaribe") ||
    name.includes("bancamiga") ||
    cur === "VES"
  ) {
    return ["Transferencia Bancaria", "Pago Móvil"];
  }

  if (type === "banco_internacional" || cur === "USD" || cur === "EUR") {
    return ["Transferencia Bancaria", "Zelle"];
  }

  return [
    "Transferencia Bancaria",
    "Pago Móvil",
    "Zelle",
    "Efectivo / Caja",
    "Binance USDT / Cripto",
  ];
}

export interface ExpenseBreakdown {
  isPending: boolean;
  isPartial: boolean;
  paidAmount: number;
  pendingAmount: number;
}

export function getExpenseBreakdown(e: { note?: string; amount: number }): ExpenseBreakdown {
  const note = e.note || "";

  // Buscar si tiene desglose de abono parcial: [Abonado $X desde ... · Pendiente $Y]
  const pendingMatch = note.match(/Pendiente\s+\$?([\d.,]+)/i);
  if (pendingMatch) {
    const rawNum = pendingMatch[1].replace(/\./g, "").replace(",", ".");
    const parsedPending = parseFloat(rawNum);
    if (!isNaN(parsedPending)) {
      const pendingAmount = Math.min(e.amount, Math.max(0, parsedPending));
      const paidAmount = Math.max(0, e.amount - pendingAmount);
      return {
        isPending: pendingAmount > 0,
        isPartial: true,
        paidAmount,
        pendingAmount,
      };
    }
  }

  // Verificar si es un gasto pendiente / a crédito / por pagar / por aprobar
  const isPendingTag =
    note.includes("Por Aprobar") ||
    note.includes("A Crédito") ||
    note.includes("Por Pagar") ||
    note.includes("Pendiente");

  if (isPendingTag) {
    return {
      isPending: true,
      isPartial: false,
      paidAmount: 0,
      pendingAmount: e.amount,
    };
  }

  // Si no tiene etiquetas pendientes, se considera pagado de contado
  return {
    isPending: false,
    isPartial: false,
    paidAmount: e.amount,
    pendingAmount: 0,
  };
}

/**
 * Determina si un gasto debe excluirse de los totales de gastos corrientes / operativos.
 * Excluye:
 * 1. Pagos de Servicios Recurrentes (gestionados en su módulo y cargos especiales).
 * 2. Consumos, cargos o abonos de la Tarjeta de José Miguel (Gastos Especiales).
 */
export function isExcludedFromExpenseTotals(e: {
  note?: string;
  category?: string;
  source?: string;
}): boolean {
  const src = (e.source || "").toLowerCase().trim();
  const note = (e.note || "").toLowerCase().trim();
  const cat = (e.category || "").toLowerCase().trim();

  // 1. Tarjeta de José Miguel (cargos diferidos, abonos o pagos a la tarjeta)
  const isCardJM =
    src.startsWith("tarjeta_jm") ||
    src === "tarjeta" ||
    note.includes("tarjeta josé miguel") ||
    note.includes("tarjeta jose miguel") ||
    note.includes("tarjeta jm") ||
    note.includes("abono a tarjeta") ||
    cat.includes("abono a tarjeta") ||
    cat.includes("tarjeta de crédito") ||
    cat.includes("tarjeta de credito") ||
    cat.includes("gastos especiales");

  if (isCardJM) return true;

  // 2. Servicios recurrentes
  const isService =
    src === "servicio" ||
    (note.startsWith("servicio ·") && !note.includes("nomina") && !note.includes("nómina")) ||
    note.includes("pago de servicio") ||
    cat === "servicios recurrentes";

  if (isService) return true;

  return false;
}


