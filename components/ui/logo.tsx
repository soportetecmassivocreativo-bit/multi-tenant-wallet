"use client";

/**
 * Logo Oficial Massivo Corp / M-WALLET
 * Muestra el nuevo logotipo oficial de Massivo Corp.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 select-none ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-massivo-corp.png"
        alt="Massivo Corp"
        className="block h-8 sm:h-9 w-auto shrink-0 object-contain drop-shadow-xs"
      />
    </span>
  );
}
