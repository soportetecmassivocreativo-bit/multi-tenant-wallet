"use client";

import { useEffect, useState } from "react";

/**
 * Logo Oficial M-WALLET
 * Muestra el isotipo oficial "M" junto al texto "WALLET" en azul corporativo.
 */
export function Logo({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isMassivo, setIsMassivo] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (
      typeof window !== "undefined" &&
      window.location.host.includes("m-wallet-gamma")
    ) {
      setIsMassivo(true);
    }
  }, []);

  if (mounted && isMassivo) {
    return (
      <span className={`inline-flex items-center gap-2 select-none ${className ?? ""}`}>
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

  return (
    <span className={`inline-flex items-center gap-2 select-none ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-m-icon.png"
        alt="M-Wallet"
        className="block h-9 sm:h-10 w-auto shrink-0 object-contain drop-shadow-sm"
      />
      <span className="font-sans text-[18px] sm:text-[20px] font-black text-[#2C21FF] dark:text-[#7293FF] tracking-wider uppercase">
        WALLET
      </span>
    </span>
  );
}
