"use client";

import { useState } from "react";
import { DownloadIcon, CheckIcon } from "@/components/ui/icons";
import { exportPdfReport, type PdfReportOptions } from "@/lib/pdf-export";

interface PdfDownloadButtonProps {
  reportOptions: () => PdfReportOptions;
  label?: string;
  className?: string;
}

export function PdfDownloadButton({
  reportOptions,
  label = "Descargar PDF",
  className,
}: PdfDownloadButtonProps) {
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    try {
      const options = reportOptions();
      exportPdfReport(options);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-soft active:scale-95 transition-all shadow-sm"
      }
      title="Descargar reporte en formato PDF"
    >
      {downloaded ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-income" />
          <span className="text-income">Descargado</span>
        </>
      ) : (
        <>
          <DownloadIcon className="h-3.5 w-3.5 text-muted" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
