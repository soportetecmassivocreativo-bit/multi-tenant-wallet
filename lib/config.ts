export interface SystemConfig {
  // Contabilizadores y Nomenclatura
  basePrefix: string; // ej: "Mas-Corp-"
  codeDigits: number; // 1, 2, 3, 4 (default: 4 -> "0001")
  invoicePrefix: string; // "Mas-Corp-" o "Mas-Corp-FAC-"
  invoiceCounter: number; // ej: 1
  expensePrefix: string; // "Mas-Corp-" o "Mas-Corp-GAS-"
  expenseCounter: number; // ej: 1
  employeePrefix: string; // "Mas-Corp-" o "Mas-Corp-NOM-"
  employeeCounter: number; // ej: 1
  servicePrefix: string; // "Mas-Corp-" o "Mas-Corp-SRV-"
  serviceCounter: number; // ej: 1

  // Personalización de Reportes PDF
  pdfCompanyName: string; // "Massivo Corp"
  pdfCompanyRif: string; // "J-50000000-0"
  pdfHeaderSubtitle: string; // "Sistema Financiero & Facturación"
  pdfPrimaryColor: string; // "#2C21FF"
  pdfContactEmail: string; // "contacto@massivocorp.com"
  pdfContactPhone: string; // "+58 412-0000000"
  pdfShowBcvRates: boolean; // true
  pdfFooterText: string; // "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet"
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  basePrefix: "Mas-Corp-",
  codeDigits: 4,
  invoicePrefix: "Mas-Corp-",
  invoiceCounter: 1,
  expensePrefix: "Mas-Corp-",
  expenseCounter: 1,
  employeePrefix: "Mas-Corp-",
  employeeCounter: 1,
  servicePrefix: "Mas-Corp-",
  serviceCounter: 1,

  pdfCompanyName: "Massivo Corp",
  pdfCompanyRif: "J-50000000-0",
  pdfHeaderSubtitle: "Sistema Financiero & Facturación",
  pdfPrimaryColor: "#2C21FF",
  pdfContactEmail: "contacto@massivocorp.com",
  pdfContactPhone: "+58 412-0000000",
  pdfShowBcvRates: true,
  pdfFooterText: "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet",
};

/**
 * Formatea un código correlativo con prefijo y relleno de ceros (hasta 4 dígitos).
 * Ej: formatEntityCode("Mas-Corp-", 5, 4) -> "Mas-Corp-0005"
 */
export function formatEntityCode(
  prefix: string = "Mas-Corp-",
  counter: number = 1,
  digits: number = 4
): string {
  const cleanDigits = Math.max(1, Math.min(4, digits));
  const padded = String(counter).padStart(cleanDigits, "0");
  return `${prefix}${padded}`;
}
