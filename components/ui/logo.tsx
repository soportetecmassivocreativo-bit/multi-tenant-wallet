"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Logo adaptativo:
 * - En el portal multi-tenant: Muestra "M-WALLET" con isotipo "M" degradado moderno (sin texto Massivo Creativo).
 * - En el portal operativo de Massivo: Muestra el logo oficial de Massivo Creativo Wallet.
 */
export function Logo({ className }: { className?: string }) {
  const pathname = usePathname();
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.host.includes("multi-tenant") ||
        window.location.host.includes("muti-tenant") ||
        process.env.NEXT_PUBLIC_APP_MODE === "master" ||
        pathname?.startsWith("/admin"))
    ) {
      setIsMaster(true);
    }
  }, [pathname]);

  if (isMaster) {
    return (
      <span className={`inline-flex items-center gap-3 select-none ${className ?? ""}`}>
        <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#2C21FF] via-[#4F46E5] to-[#7293FF] text-white shadow-md ring-2 ring-accent/20">
          <svg className="h-5 w-5 fill-current drop-shadow-sm" viewBox="0 0 24 24">
            <path d="M4 19V5h3.5l4.5 7.5L16.5 5H20v14h-3V9.8l-4.2 7-1.6 0L7 9.8V19H4z" />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-sans text-[20px] font-black tracking-tight text-foreground leading-none flex items-center gap-1">
            <span className="text-[#2C21FF] dark:text-[#7293FF]">M-</span>
            <span>WALLET</span>
          </span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent mt-0.5">
            Multi-Tenant
          </span>
        </div>
      </span>
    );
  }

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
