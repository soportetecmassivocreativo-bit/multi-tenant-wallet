"use client";

export function PrintButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0050D8] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0040B0] active:scale-95 transition-all"
        title="Guardar como PDF o enviar a imprimir"
      >
        <span>📥</span>
        <span>Descargar / Imprimir PDF</span>
      </button>
    </div>
  );
}
