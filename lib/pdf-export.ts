import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from "@/lib/config";

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
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const config = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...(options.branding ?? {}),
  };

  const [prR, prG, prB] = hexToRgb(config.pdfPrimaryColor || "#2C21FF");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // 1. Encabezado Branding Massivo Corp
  // Fondo de barra superior sutil
  doc.setFillColor(245, 246, 255);
  doc.roundedRect(margin, margin, pageWidth - margin * 2, 26, 3, 3, "F");

  // Logo / Texto de Marca Massivo Corp
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(prR, prG, prB);
  doc.text("M-WALLET", margin + 5, margin + 8);

  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text(config.pdfCompanyName || "Massivo Corp", margin + 5, margin + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 120);
  doc.text(
    `${config.pdfHeaderSubtitle || "Sistema Financiero & Facturación"} · RIF: ${config.pdfCompanyRif || "J-50000000-0"}`,
    margin + 5,
    margin + 20
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

  if (config.pdfShowBcvRates && options.bcvRates && options.bcvRates.usd > 0) {
    doc.text(
      `Tasa Ref. BCV: USD ${options.bcvRates.usd.toFixed(2)} Bs. | EUR ${options.bcvRates.eur.toFixed(2)} Bs.`,
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
