"use client";

import { useState, useEffect, useRef } from "react";
import { DownloadIcon } from "@/components/ui/icons";

export interface PdfPreviewData {
  title: string;
  subtitle?: string;
  filename: string;
  blobUrl: string;
}

export function PdfPreviewModal() {
  const [data, setData] = useState<PdfPreviewData | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const customEvent = e as CustomEvent<PdfPreviewData>;
      if (customEvent.detail && customEvent.detail.blobUrl) {
        setData(customEvent.detail);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setData(null);
      }
    }

    window.addEventListener("m_wallet_open_pdf_preview", handleOpenEvent as EventListener);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("m_wallet_open_pdf_preview", handleOpenEvent as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!data) return null;

  function handleClose() {
    setData(null);
  }

  function handleDownload() {
    if (!data) return;
    const a = document.createElement("a");
    a.href = data.blobUrl;
    a.download = data.filename.endsWith(".pdf") ? data.filename : `${data.filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    if (!data) return;
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch {}
    const printWin = window.open(data.blobUrl, "_blank");
    if (printWin) {
      printWin.focus();
      printWin.print();
    }
  }

  function handleOpenNewTab() {
    if (!data) return;
    window.open(data.blobUrl, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-2 sm:p-4 md:p-6">
      
      {/* Barra de Control Superior */}
      <div className="w-full max-w-6xl mx-auto rounded-2xl bg-card border border-line shadow-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 shrink-0">
        
        {/* Identificación del Documento */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-lg font-bold shadow-xs">
            📄
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-sm sm:text-base font-bold text-foreground truncate">
                {data.title}
              </h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider shrink-0">
                Previsualizador PDF
              </span>
            </div>
            {data.subtitle && (
              <p className="text-xs text-muted truncate mt-0.5">{data.subtitle}</p>
            )}
          </div>
        </div>

        {/* Botones de Acción: Descargar, Imprimir, Pestaña, Cerrar */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
            title="Descargar archivo PDF al dispositivo"
          >
            <DownloadIcon className="h-3.5 w-3.5 text-white" />
            <span>Descargar PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-soft active:scale-95 transition-all shadow-xs"
            title="Enviar a imprimir"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            className="hidden md:inline-flex items-center gap-1 rounded-xl border border-line bg-card px-2.5 py-2 text-xs font-semibold text-muted hover:text-foreground hover:bg-soft transition-all"
            title="Abrir en pestaña independiente"
          >
            <span>↗</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-line bg-soft hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 p-2 text-muted transition-all active:scale-95"
            title="Cerrar previsualizador"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Contenedor del Visor PDF */}
      <div className="w-full max-w-6xl mx-auto flex-1 rounded-2xl bg-neutral-900 border border-line overflow-hidden shadow-2xl relative flex flex-col min-h-0">
        <iframe
          ref={iframeRef}
          src={data.blobUrl}
          className="w-full h-full flex-1 border-0 bg-white"
          title={data.title}
        />
      </div>
    </div>
  );
}
