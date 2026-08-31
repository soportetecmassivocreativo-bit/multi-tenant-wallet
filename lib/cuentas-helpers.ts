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
