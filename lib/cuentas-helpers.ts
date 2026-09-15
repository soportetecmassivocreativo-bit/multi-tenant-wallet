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
 * 
 * Reglas contables:
 * - NO INCIDEN (Excluidos):
 *   1. Servicios recurrentes (gestionados y mostrados en su módulo de Servicios).
 *   2. Lo que se CARGA a la tarjeta de José Miguel (consumos / cargos diferidos).
 * - SÍ INCIDEN (Incluidos en la suma):
 *   1. Gastos directos y nómina.
 *   2. Pagos y abonos reales a cargo de la Tarjeta de José Miguel (desembolso efectivo).
 */
export function isExcludedFromExpenseTotals(e: {
  note?: string;
  category?: string;
  source?: string;
}): boolean {
  const src = (e.source || "").toLowerCase().trim();
  const note = (e.note || "").toLowerCase().trim();
  const cat = (e.category || "").toLowerCase().trim();

  // 1. Pagos y Abonos a la Tarjeta de José Miguel: SÍ DEBEN INCIDIR (egreso real pagado)
  const isCardPayment =
    src === "tarjeta_jm_abono" ||
    src === "tarjeta_jm_pago" ||
    src === "tarjeta_jm" ||
    cat === "abono a tarjeta" ||
    cat.includes("abono") ||
    note.includes("abono a la deuda") ||
    note.includes("abono a tarjeta") ||
    note.includes("liquidación tarjeta") ||
    note.includes("liquidacion tarjeta") ||
    note.includes("pago a tarjeta") ||
    note.includes("pago de tarjeta");

  if (isCardPayment) {
    return false; // NO excluir -> SÍ SUMA
  }

  // 2. Cargos y consumos cargados a la Tarjeta de José Miguel: NO DEBEN INCIDIR
  const isCardCharge =
    src === "tarjeta_jm_consumo" ||
    src === "tarjeta" ||
    note.includes("[tarjeta josé miguel]") ||
    note.includes("[tarjeta jose miguel]") ||
    note.includes("[tarjeta jm]") ||
    note.includes("cargo en tarjeta") ||
    note.includes("consumo tarjeta") ||
    cat.includes("tarjeta de crédito") ||
    cat.includes("tarjeta de credito") ||
    cat === "gastos especiales";

  if (isCardCharge) {
    return true; // EXCLUIR -> NO SUMA
  }

  // 3. Servicios Recurrentes: NO DEBEN INCIDIR en la suma general
  const isService =
    src === "servicio" ||
    (note.startsWith("servicio ·") && !note.includes("nomina") && !note.includes("nómina")) ||
    note.includes("pago de servicio") ||
    cat === "servicios recurrentes";

  if (isService) {
    return true; // EXCLUIR -> NO SUMA
  }

  // 4. Gastos directos y nómina: SÍ DEBEN INCIDIR
  return false;
}


