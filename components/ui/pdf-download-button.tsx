"use client";

import { DownloadIcon } from "@/components/ui/icons";
import { previewPdfReport, type PdfReportOptions } from "@/lib/pdf-export";

interface PdfDownloadButtonProps {
  reportOptions: () => PdfReportOptions;
  label?: string;
  className?: string;
}

export function PdfDownloadButton({
  reportOptions,
  label = "Previsualizar / Descargar PDF",
  className,
}: PdfDownloadButtonProps) {
  function handlePreview() {
    try {
      const options = reportOptions();
      previewPdfReport(options);
    } catch (err) {
      console.error("Error al previsualizar PDF:", err);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePreview}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-soft active:scale-95 transition-all shadow-sm"
      }
      title="Previsualizar, imprimir o descargar reporte en formato PDF"
    >
      <DownloadIcon className="h-3.5 w-3.5 text-muted" />
      <span>{label}</span>
    </button>
  );
}
