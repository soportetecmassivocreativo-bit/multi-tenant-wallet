import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from "@/lib/config";
import { MASSIVO_LOGO_BASE64 } from "@/lib/logo-base64";

export interface PdfReportColumn {
  header: string;
  dataKey: string;
  align?: "left" | "center" | "right";
}

export interface PdfReportKpi {
  label: string;
  value: string;
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  kpis?: PdfReportKpi[];
  columns: PdfReportColumn[];
  data: Record<string, string | number>[];
  bcvRates?: { usd: number; eur: number; date?: string };
  branding?: Partial<SystemConfig>;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 44;
  const g = parseInt(clean.substring(2, 4), 16) || 33;
  const b = parseInt(clean.substring(4, 6), 16) || 255;
  return [r, g, b];
}

/**
 * Genera y descarga un reporte PDF profesional con el branding y personalización de Massivo Corp.
 */
export function exportPdfReport(options: PdfReportOptions): void {
  const config = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...(options.branding ?? {}),
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: config.pdfPaperSize || "a4",
  });

  const [prR, prG, prB] = hexToRgb(config.pdfPrimaryColor || "#2C21FF");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // 1. Encabezado Branding Massivo Corp
  // Fondo de barra superior sutil
  doc.setFillColor(245, 246, 255);
  doc.roundedRect(margin, margin, pageWidth - margin * 2, 26, 3, 3, "F");

  // Logo Imagen Oficial Massivo Creativo
  try {
    doc.addImage(MASSIVO_LOGO_BASE64, "PNG", margin + 5, margin + 4, 38, 10);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(prR, prG, prB);
    doc.text("MASSIVO CREATIVO", margin + 5, margin + 11);
  }

  // Subtítulo y RIF
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 110);
  doc.text(
    `${config.pdfHeaderSubtitle || "Sistema Financiero & Facturación"} · RIF: ${config.pdfCompanyRif || "J-50000000-0"}`,
    margin + 5,
    margin + 19
  );

  // Fecha y Tasa a la derecha
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  doc.text(`Emisión: ${dateFormatted} ${timeFormatted}`, pageWidth - margin - 5, margin + 8, {
    align: "right",
  });

  if ((config.pdfShowBcvRates ?? true) && config.pdfBcvCurrency !== "none" && options.bcvRates && options.bcvRates.usd > 0) {
    const bcvCurr = config.pdfBcvCurrency || "usd";
    const rateText =
      bcvCurr === "eur"
        ? `Tasa Ref. BCV: EUR ${options.bcvRates.eur.toFixed(2)} Bs.`
        : bcvCurr === "both"
          ? `Tasa Ref. BCV: USD ${options.bcvRates.usd.toFixed(2)} Bs. | EUR ${options.bcvRates.eur.toFixed(2)} Bs.`
          : `Tasa Ref. BCV: USD ${options.bcvRates.usd.toFixed(2)} Bs.`;

    doc.text(
      rateText,
      pageWidth - margin - 5,
      margin + 15,
      { align: "right" }
    );
  }

  if (config.pdfContactPhone || config.pdfContactEmail) {
    const contact = [config.pdfContactPhone, config.pdfContactEmail].filter(Boolean).join(" · ");
    doc.text(contact, pageWidth - margin - 5, margin + 20, { align: "right" });
  }

  let currentY = margin + 32;

  // 2. Título del Reporte
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(25, 25, 35);
  doc.text(options.title, margin, currentY);
  currentY += 5;

  if (options.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 130);
    doc.text(options.subtitle, margin, currentY);
    currentY += 6;
  } else {
    currentY += 3;
  }

  // 3. Tarjetas Resumen (KPIs) si existen
  if (options.kpis && options.kpis.length > 0) {
    const kpiCount = options.kpis.length;
    const gap = 3;
    const totalGap = gap * (kpiCount - 1);
    const kpiWidth = (pageWidth - margin * 2 - totalGap) / kpiCount;
    const kpiHeight = 16;

    options.kpis.forEach((kpi, idx) => {
      const kpiX = margin + idx * (kpiWidth + gap);
      doc.setFillColor(248, 249, 252);
      doc.setDrawColor(225, 228, 238);
      doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 130);
      doc.text(kpi.label, kpiX + 3, currentY + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 30, 45);
      doc.text(kpi.value, kpiX + 3, currentY + 12);
    });

    currentY += kpiHeight + 6;
  }

  // 4. Tabla de Datos con autoTable
  const columnStyles: Record<string, { halign: "left" | "center" | "right" }> = {};
  options.columns.forEach((col) => {
    if (col.align) {
      columnStyles[col.dataKey] = { halign: col.align };
    }
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 18 },
    columns: options.columns.map((c) => ({ header: c.header, dataKey: c.dataKey })),
    body: options.data,
    theme: "striped",
    headStyles: {
      fillColor: [prR, prG, prB],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 50],
      cellPadding: 2.8,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 254],
    },
    columnStyles,
    didDrawPage: (data) => {
      // 5. Pie de página en cada hoja
      const pageNumber = data.pageNumber;
      const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 160);
      doc.text(
        config.pdfFooterText || "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet",
        margin,
        doc.internal.pageSize.getHeight() - 8
      );
      doc.text(
        `Página ${pageNumber} de ${totalPages}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    },
  });

  // 6. Guardar / Descargar PDF
  const cleanFilename = options.filename.endsWith(".pdf")
    ? options.filename
    : `${options.filename}.pdf`;
  doc.save(cleanFilename);
}

/**
 * Genera y descarga un PDF de muestra para verificar el diseño, color y formato de papel.
 */
export function exportSamplePdf(branding: Partial<SystemConfig>): void {
  const paperLabel =
    branding.pdfPaperSize === "letter"
      ? "Carta (Letter)"
      : branding.pdfPaperSize === "legal"
      ? "Oficio (Legal)"
      : "A4 Estándar";

  exportPdfReport({
    title: "Reporte de Muestra & Previsualización",
    subtitle: `Formato de Papel: ${paperLabel} · Nomenclatura activa: ${branding.basePrefix || "Mas-Corp-"}0001`,
    filename: `M-Wallet_Muestra_${branding.pdfPaperSize || "A4"}`,
    branding,
    bcvRates: { usd: 794.99, eur: 922.69, date: new Date().toISOString() },
    kpis: [
      { label: "Facturas Emitidas", value: "14" },
      { label: "Total Facturado", value: "$ 18.450,00" },
      { label: "Nómina Mensual", value: "$ 1.760,00" },
      { label: "Servicios Activos", value: "$ 79,00" },
    ],
    columns: [
      { header: "Código", dataKey: "code", align: "left" },
      { header: "Descripción / Concepto", dataKey: "desc", align: "left" },
      { header: "Categoría", dataKey: "cat", align: "left" },
      { header: "Fecha Emisión", dataKey: "date", align: "center" },
      { header: "Estado", dataKey: "status", align: "center" },
      { header: "Monto Total", dataKey: "amount", align: "right" },
    ],
    data: [
      {
        code: `${branding.invoicePrefix || "Mas-Corp-"}0001`,
        desc: "Servicios de Consultoría Tecnológica & Infraestructura",
        cat: "Facturación",
        date: "2026-08-29",
        status: "Cobrada",
        amount: "$ 4.500,00",
      },
      {
        code: `${branding.invoicePrefix || "Mas-Corp-"}0002`,
        desc: "Desarrollo de Software y Wallet Corporativa",
        cat: "Facturación",
        date: "2026-08-28",
        status: "Pendiente",
        amount: "$ 7.200,00",
      },
      {
        code: `${branding.expensePrefix || "Mas-Corp-"}0001`,
        desc: "Servidor Cloud & Base de Datos Supabase Pro",
        cat: "Infraestructura",
        date: "2026-08-25",
        status: "Pagado",
        amount: "$ 25,00",
      },
      {
        code: `${branding.employeePrefix || "Mas-Corp-"}0001`,
        desc: "Nómina Quincenal · Ana Reyes (Diseño)",
        cat: "Nómina",
        date: "2026-08-15",
        status: "Pagado",
        amount: "$ 220,00",
      },
      {
        code: `${branding.servicePrefix || "Mas-Corp-"}0001`,
        desc: "Suscripción Claude AI Pro",
        cat: "Software / IA",
        date: "2026-08-18",
        status: "Recurrente",
        amount: "$ 20,00",
      },
    ],
  });
}

/**
 * Genera y descarga el Comprobante Individual de Gasto / Egreso en PDF.
 */
export function exportExpenseVoucherPdf(
  expense: { id: string; code?: string; category: string; note: string; amount: number; date: string; currency?: string },
  branding?: Partial<SystemConfig>
): void {
  const code = expense.code || "Mas-Corp-GAS-0001";
  exportPdfReport({
    title: "Comprobante de Egreso / Gasto",
    subtitle: `Comprobante Nº: ${code} · Fecha: ${expense.date}`,
    filename: `Comprobante_Gasto_${code}`,
    branding,
    kpis: [
      { label: "Código de Registro", value: code },
      { label: "Categoría", value: expense.category },
      { label: "Monto del Egreso", value: `$ ${expense.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` },
      { label: "Estado", value: "Aprobado / Contabilizado" },
    ],
    columns: [
      { header: "Código", dataKey: "code", align: "left" },
      { header: "Concepto / Detalle del Gasto", dataKey: "note", align: "left" },
      { header: "Categoría", dataKey: "cat", align: "left" },
      { header: "Fecha de Pago", dataKey: "date", align: "center" },
      { header: "Monto", dataKey: "amount", align: "right" },
    ],
    data: [
      {
        code,
        note: expense.note,
        cat: expense.category,
        date: expense.date,
        amount: `$ ${expense.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
      },
    ],
  });
}

/**
 * Genera y descarga el Recibo Individual de Pago de Nómina en PDF.
 */
export function exportPayrollReceiptPdf(
  employee: { id: string; code?: string; name: string; role: string; salary: number; currency: string; payDate?: string; period?: string },
  branding?: Partial<SystemConfig>
): void {
  const code = employee.code || "Mas-Corp-NOM-0001";
  const period = employee.period || "Quincena Actual (15 y último)";
  const payDate = employee.payDate || new Date().toISOString().slice(0, 10);

  exportPdfReport({
    title: "Recibo de Pago de Nómina",
    subtitle: `Empleado: ${employee.name} (${code}) · Período: ${period}`,
    filename: `Recibo_Nomina_${employee.name.replace(/\s+/g, "_")}_${code}`,
    branding,
    kpis: [
      { label: "Código Empleado", value: code },
      { label: "Cargo / Rol", value: employee.role },
      { label: "Período Liquidado", value: period },
      { label: "Salario Quincenal", value: `${employee.currency} ${employee.salary.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` },
    ],
    columns: [
      { header: "Concepto", dataKey: "concept", align: "left" },
      { header: "Beneficiario", dataKey: "name", align: "left" },
      { header: "Cargo", dataKey: "role", align: "left" },
      { header: "Fecha de Pago", dataKey: "date", align: "center" },
      { header: "Neto a Cobrar", dataKey: "amount", align: "right" },
    ],
    data: [
      {
        concept: `Honorarios / Sueldo Quincenal (${period})`,
        name: employee.name,
        role: employee.role,
        date: payDate,
        amount: `${employee.currency} ${employee.salary.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
      },
    ],
  });
}

/**
 * Genera y descarga el Comprobante Individual de Pago de Servicio en PDF.
 */
export function exportServiceVoucherPdf(
  service: { id: string; code?: string; name: string; category: string; cycle: string; amount: number; currency: string; nextChargeDate: string },
  branding?: Partial<SystemConfig>
): void {
  const code = service.code || "Mas-Corp-SRV-0001";
  exportPdfReport({
    title: "Comprobante de Pago de Servicio Recurrente",
    subtitle: `Servicio: ${service.name} (${code}) · Ciclo: ${service.cycle}`,
    filename: `Comprobante_Servicio_${service.name.replace(/\s+/g, "_")}_${code}`,
    branding,
    kpis: [
      { label: "Código de Servicio", value: code },
      { label: "Proveedor / Servicio", value: service.name },
      { label: "Ciclo de Facturación", value: service.cycle === "anual" ? "Anual" : "Mensual" },
      { label: "Monto Pagado", value: `${service.currency} ${service.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` },
    ],
    columns: [
      { header: "Código", dataKey: "code", align: "left" },
      { header: "Servicio / Plataforma", dataKey: "name", align: "left" },
      { header: "Categoría", dataKey: "category", align: "left" },
      { header: "Frecuencia", dataKey: "cycle", align: "center" },
      { header: "Próxima Renovación", dataKey: "next", align: "center" },
      { header: "Monto", dataKey: "amount", align: "right" },
    ],
    data: [
      {
        code,
        name: service.name,
        category: service.category,
        cycle: service.cycle,
        next: service.nextChargeDate,
        amount: `${service.currency} ${service.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
      },
    ],
  });
}
