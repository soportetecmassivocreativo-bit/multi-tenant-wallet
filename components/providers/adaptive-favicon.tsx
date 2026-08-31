"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyBrandColor } from "@/lib/config";

/**
 * AdaptiveFavicon:
 * - En Massivo Creativo (m-wallet-gamma.vercel.app): Ajusta el título de la pestaña del navegador a "Massivo-Wallet" y favicon oficial.
 * - En el portal Multi-Tenant (multi-tenant-wallet.vercel.app): Ajusta el título a "M-Wallet" y el favicon con la "M" transparente.
 * - Carga y aplica el color de marca personalizado en tiempo real.
 */
export function AdaptiveFavicon() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Cargar color de marca guardado
    try {
      const savedColor = localStorage.getItem("m_wallet_brand_color");
      if (savedColor) {
        applyBrandColor(savedColor);
      }
    } catch (e) {}

    // 2. Favicons y Títulos según el Host
    const host = window.location.host;
    const isMultiTenant = host.includes("multi-tenant") || host.includes("muti-tenant");

    let faviconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!faviconEl) {
      faviconEl = document.createElement("link");
      faviconEl.rel = "shortcut icon";
      document.head.appendChild(faviconEl);
    }

    if (isMultiTenant) {
      // Portal Multi-Tenant
      faviconEl.href = "/logo-m-icon.png";
      faviconEl.type = "image/png";
      document.title = "M-Wallet";
    } else {
      // Portal Massivo Creativo Wallet
      faviconEl.href = "/logo-massivo-creativo.png";
      faviconEl.type = "image/png";
      document.title = "Massivo-Wallet";
    }
  }, [pathname]);

  return null;
}
