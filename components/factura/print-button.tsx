"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-[#3b5bdb] px-4 py-2 text-sm font-medium text-white active:scale-95"
    >
      Descargar / Imprimir PDF
    </button>
  );
}
