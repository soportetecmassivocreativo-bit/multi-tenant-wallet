/**
 * Logo oficial de M-Wallet (archivos vectoriales en /public).
 * - Claro: logo a color (degradado índigo→violeta).
 * - Oscuro: versión blanca.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mwallet.svg"
        alt="M-Wallet"
        className="block h-7 w-auto dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mwallet-white.svg"
        alt="M-Wallet"
        className="hidden h-7 w-auto dark:block"
      />
    </span>
  );
}
