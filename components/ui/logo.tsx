/**
 * Logo oficial de Massivo Corp Wallet.
 * Muestra el ícono oficial de la "M" morada con degradado seguido de "Massivo Corp" y "Wallet".
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-m-mark.svg"
        alt="Massivo Corp"
        className="block h-7 w-auto shrink-0"
      />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-serif text-[18px] font-bold tracking-tight text-foreground">
          Massivo Corp
        </span>
        <span className="font-sans text-[17px] font-medium text-[#2C21FF] dark:text-[#7293FF]">
          Wallet
        </span>
      </span>
    </span>
  );
}
