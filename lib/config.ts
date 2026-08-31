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

  // Identidad, Branding y Logos
  systemLogoUrl: string; // URL o Base64 del logo en el sistema / header
  pdfLogoUrl: string; // URL o Base64 del logo en el PDF
  brandPrimaryColor: string; // Color primario de marca (ej: "#2C21FF")
  brandAccentColor: string; // Color secundario / botones (ej: "#3b82f6")
  defaultCurrency: string; // "USD" | "VES" | "EUR"
  defaultTaxRate: number; // 16%

  // Personalización de Reportes PDF
  pdfCompanyName: string; // "Massivo Corp"
  pdfCompanyRif: string; // "J-50000000-0"
  pdfHeaderSubtitle: string; // "Sistema Financiero & Facturación"
  pdfPrimaryColor: string; // "#2C21FF"
  pdfPaperSize: "a4" | "letter" | "legal"; // "a4" | "letter" | "legal"
  pdfContactEmail: string; // "contacto@massivocorp.com"
  pdfContactPhone: string; // "+58 412-0000000"
  pdfShowBcvRates: boolean; // true
  pdfFooterText: string; // "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet"
  pdfTermsAndConditions: string; // Términos y condiciones
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  basePrefix: "Mas-Corp-",
  codeDigits: 4,
  invoicePrefix: "Mas-Corp-Fact-",
  invoiceCounter: 1,
  expensePrefix: "Mas-Corp-Egre-",
  expenseCounter: 1,
  employeePrefix: "Mas-Corp-Nom-",
  employeeCounter: 1,
  servicePrefix: "Mas-Corp-Serv-",
  serviceCounter: 1,

  systemLogoUrl: "/logo-massivo-creativo.png",
  pdfLogoUrl: "/logo-massivo-creativo.png",
  brandPrimaryColor: "#2C21FF",
  brandAccentColor: "#3b82f6",
  defaultCurrency: "USD",
  defaultTaxRate: 16,

  pdfCompanyName: "Massivo Corp",
  pdfCompanyRif: "J-50000000-0",
  pdfHeaderSubtitle: "Sistema Financiero & Facturación",
  pdfPrimaryColor: "#2C21FF",
  pdfPaperSize: "a4",
  pdfContactEmail: "contacto@massivocorp.com",
  pdfContactPhone: "+58 412-0000000",
  pdfShowBcvRates: true,
  pdfFooterText: "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet",
  pdfTermsAndConditions: "Factura emitida conforme a las regulaciones vigentes. Pagadera a la fecha de vencimiento.",
};

/**
 * Aplica el color corporativo seleccionado en tiempo real a todo el sistema
 * mediante variables CSS (--accent, --accent-strong, --accent-bg, --accent-text).
 */
export function applyBrandColor(primaryHex?: string) {
  if (typeof document === "undefined") return;
  const hex = primaryHex || "#2C21FF";
  const root = document.documentElement;

  try {
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-strong", hex);
    
    // Crear fondo suave y color de texto adaptativo
    root.style.setProperty("--accent-bg", hex.startsWith("#") && hex.length === 7 ? `${hex}1a` : "rgba(44, 33, 255, 0.1)");
    root.style.setProperty("--accent-text", hex);
  } catch (err) {
    console.error("Error applying brand color:", err);
  }
}

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

