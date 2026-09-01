export interface SystemConfig {
  // Contabilizadores y Nomenclatura
  basePrefix: string; // ej: "Mas-Corp-"
  codeDigits: number; // 1, 2, 3, 4 (default: 4 -> "0001")
  proformaPrefix: string; // "Mas-Corp-Prof-"
  proformaCounter: number; // ej: 1
  invoicePrefix: string; // "Mas-Corp-Fact-"
  invoiceCounter: number; // ej: 1
  expensePrefix: string; // "Mas-Corp-Egre-"
  expenseCounter: number; // ej: 1
  employeePrefix: string; // "Mas-Corp-Nom-"
  employeeCounter: number; // ej: 1
  servicePrefix: string; // "Mas-Corp-Serv-"
  serviceCounter: number; // ej: 1

  // Identidad, Branding y Logos
  systemLogoUrl: string; // URL o Base64 del logo en el sistema / header
  pdfLogoUrl: string; // URL o Base64 del logo en el PDF
  brandPrimaryColor: string; // Color primario de marca (ej: "#2C21FF")
  brandAccentColor: string; // Color secundario / botones (ej: "#3b82f6")
  defaultCurrency: string; // "USD" | "VES" | "EUR"
  defaultTaxRate: number; // 16%

  // 1. Personalización de Reportes PDF General (Egresos, Nómina, Servicios, Cuentas, etc.)
  pdfGeneralTemplateUrl?: string;
  pdfCompanyName: string; // "Massivo Corp"
  pdfCompanyRif: string; // "J-50000000-0"
  pdfHeaderSubtitle: string; // "Sistema Financiero & Facturación"
  pdfPrimaryColor: string; // "#2C21FF"
  pdfPaperSize: "a4" | "letter" | "legal";
  pdfContactEmail: string; // "contacto@massivocorp.com"
  pdfContactPhone: string; // "+58 412-0000000"
  pdfShowBcvRates: boolean; // true
  pdfFooterText: string;
  pdfTermsAndConditions: string;
  pdfShowConditions?: boolean;
  pdfConditionsPayment?: string;
  pdfConditionsDelivery?: string;
  pdfConditionsIP?: string;
  pdfConditionsConfidentiality?: string;

  // 2. Personalización de PDF Exclusivo para Facturas
  pdfInvoiceTemplateUrl?: string;
  pdfInvoiceTargetAccountId?: string;
  pdfInvoiceCompanyName: string;
  pdfInvoiceCompanyRif: string;
  pdfInvoiceHeaderSubtitle: string;
  pdfInvoicePrimaryColor: string;
  pdfInvoicePaperSize: "a4" | "letter" | "legal";
  pdfInvoiceContactEmail: string;
  pdfInvoiceContactPhone: string;
  pdfInvoiceShowBcvRates: boolean;
  pdfInvoiceFooterText: string;
  pdfInvoiceTermsAndConditions: string;
  pdfInvoiceShowConditions?: boolean;
  pdfInvoiceConditionsPayment?: string;
  pdfInvoiceConditionsDelivery?: string;
  pdfInvoiceConditionsIP?: string;
  pdfInvoiceConditionsConfidentiality?: string;

  // 3. Personalización de PDF Exclusivo para Proformas / Presupuestos
  pdfProformaTemplateUrl?: string;
  pdfProformaTargetAccountId?: string;
  pdfProformaCompanyName: string;
  pdfProformaCompanyRif: string;
  pdfProformaHeaderSubtitle: string;
  pdfProformaPrimaryColor: string;
  pdfProformaPaperSize: "a4" | "letter" | "legal";
  pdfProformaContactEmail: string;
  pdfProformaContactPhone: string;
  pdfProformaShowBcvRates: boolean;
  pdfProformaFooterText: string;
  pdfProformaTermsAndConditions: string;
  pdfProformaShowConditions?: boolean;
  pdfProformaConditionsPayment?: string;
  pdfProformaConditionsDelivery?: string;
  pdfProformaConditionsIP?: string;
  pdfProformaConditionsConfidentiality?: string;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  basePrefix: "Mas-Corp-",
  codeDigits: 4,
  proformaPrefix: "Mas-Corp-Prof-",
  proformaCounter: 1,
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

  // General
  pdfGeneralTemplateUrl: "",
  pdfCompanyName: "Massivo Corp",
  pdfCompanyRif: "J-50000000-0",
  pdfHeaderSubtitle: "Sistema Financiero & Reportes",
  pdfPrimaryColor: "#2C21FF",
  pdfPaperSize: "letter",
  pdfContactEmail: "contacto@massivocorp.com",
  pdfContactPhone: "+58 412-0000000",
  pdfShowBcvRates: true,
  pdfFooterText: "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet",
  pdfTermsAndConditions: "Documento oficial generado para fines contables y de auditoría interna.",
  pdfShowConditions: false,
  pdfConditionsPayment: "Se requiere un anticipo del 50% del precio total al inicio del proyecto. El 50% restante se pagará al finalizar el proyecto y a satisfacción del cliente.",
  pdfConditionsDelivery: "El proyecto se entregará en un plazo de 2 semanas aproximadamente, a partir de la recepción del anticipo y la información completa por parte del cliente.",
  pdfConditionsIP: "La propiedad intelectual de todos los elementos del proyecto, incluyendo el código fuente, el diseño gráfico, los contenidos y la marca, corresponderá al cliente.",
  pdfConditionsConfidentiality: "Todas las partes se comprometen a mantener la confidencialidad de toda la información relacionada con el proyecto.",

  // Facturas
  pdfInvoiceTemplateUrl: "",
  pdfInvoiceTargetAccountId: "",
  pdfInvoiceCompanyName: "Massivo Corp",
  pdfInvoiceCompanyRif: "J-50000000-0",
  pdfInvoiceHeaderSubtitle: "Factura Comercial & Comprobante de Cobro",
  pdfInvoicePrimaryColor: "#2C21FF",
  pdfInvoicePaperSize: "letter",
  pdfInvoiceContactEmail: "contacto@massivocorp.com",
  pdfInvoiceContactPhone: "+58 412-0000000",
  pdfInvoiceShowBcvRates: true,
  pdfInvoiceFooterText: "Massivo Corp · Factura Oficial · Validez fiscal según regulaciones vigentes",
  pdfInvoiceTermsAndConditions: "Factura pagadera de contado o a los términos acordados. Montos en VES calculados a la tasa oficial BCV del día.",
  pdfInvoiceShowConditions: true,
  pdfInvoiceConditionsPayment: "Se requiere un anticipo del 50% del precio total al inicio del proyecto. El 50% restante se pagará al finalizar el proyecto y a satisfacción del cliente.",
  pdfInvoiceConditionsDelivery: "El proyecto se entregará en un plazo de 2 semanas aproximadamente, a partir de la recepción del anticipo y la información completa por parte del cliente.",
  pdfInvoiceConditionsIP: "La propiedad intelectual de todos los elementos del proyecto, incluyendo el código fuente, el diseño gráfico, los contenidos y la marca, corresponderá al cliente.",
  pdfInvoiceConditionsConfidentiality: "Todas las partes se comprometen a mantener la confidencialidad de toda la información relacionada con el proyecto.",

  // Proformas
  pdfProformaTemplateUrl: "",
  pdfProformaTargetAccountId: "",
  pdfProformaCompanyName: "Massivo Corp",
  pdfProformaCompanyRif: "J-50000000-0",
  pdfProformaHeaderSubtitle: "Proforma / Presupuesto Comercial",
  pdfProformaPrimaryColor: "#2C21FF",
  pdfProformaPaperSize: "letter",
  pdfProformaContactEmail: "contacto@massivocorp.com",
  pdfProformaContactPhone: "+58 412-0000000",
  pdfProformaShowBcvRates: true,
  pdfProformaFooterText: "Massivo Corp · Proforma Preliminar · No válida como factura fiscal hasta su acreditación",
  pdfProformaTermsAndConditions: "Esta proforma / cotización tiene una validez de 15 días continuos a partir de su emisión. Los precios en divisas se cancelan a la tasa BCV del día de pago.",
  pdfProformaShowConditions: true,
  pdfProformaConditionsPayment: "Se requiere un anticipo del 50% del precio total al inicio del proyecto. El 50% restante se pagará al finalizar el proyecto y a satisfacción del cliente.",
  pdfProformaConditionsDelivery: "El proyecto se entregará en un plazo de 2 semanas aproximadamente, a partir de la recepción del anticipo y la información completa por parte del cliente.",
  pdfProformaConditionsIP: "La propiedad intelectual de todos los elementos del proyecto, incluyendo el código fuente, el diseño gráfico, los contenidos y la marca, corresponderá al cliente.",
  pdfProformaConditionsConfidentiality: "Todas las partes se comprometen a mantener la confidencialidad de toda la información relacionada con el proyecto.",
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
