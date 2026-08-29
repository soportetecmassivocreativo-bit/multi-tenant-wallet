/**
 * Logo oficial de Massivo Corp Wallet (tamaño ampliado y legible).
 * Muestra el ícono oficial de la "M" morada con degradado seguido de "Massivo Corp" y "Wallet".
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-massivo-creativo.png"
        alt="Massivo Creativo"
        className="block h-9 sm:h-10 w-auto shrink-0 object-contain drop-shadow-sm"
      />
      <span className="font-sans text-[16px] sm:text-[18px] font-extrabold text-[#2C21FF] dark:text-[#7293FF] tracking-wider uppercase">
        Wallet
      </span>
    </span>
  );
}
