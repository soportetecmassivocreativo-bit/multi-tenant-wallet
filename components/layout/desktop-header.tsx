"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon, SearchIcon, ReceiptIcon } from "@/components/ui/icons";

export function DesktopHeader() {
  const pathname = usePathname();

  const isMaster =
    pathname.startsWith("/admin") ||
    process.env.NEXT_PUBLIC_APP_MODE === "master" ||
    (typeof window !== "undefined" &&
      (window.location.host.includes("multi-tenant") ||
        window.location.host.includes("muti-tenant")));

  const getPageTitle = () => {
    if (pathname.startsWith("/admin/empresas")) return "Panel Master Multi-Tenant";
    if (pathname.startsWith("/configuracion")) return "Configuración Global & Prefijos";
    if (pathname.startsWith("/equipo")) return "Super Administradores";
    if (pathname.startsWith("/auditoria")) return "Auditoría de Seguridad Multi-Tenant";
    if (pathname === "/dashboard") return "Panel Financiero Principal";
    if (pathname.startsWith("/cobros/nueva")) return "Emitir Nueva Factura";
    if (pathname.startsWith("/cobros")) return "Cuentas por Cobrar & Facturas";
    if (pathname.startsWith("/gastos")) return "Control de Gastos & Egresos";
    if (pathname.startsWith("/nomina")) return "Nómina de Empleados";
    if (pathname.startsWith("/servicios")) return "Servicios Recurrentes";
    if (pathname.startsWith("/clientes")) return "Directorio de Clientes";
    if (pathname.startsWith("/reportes")) return "Reportes Financieros & Balances";
    if (pathname.startsWith("/cuentas")) return "Cuentas Bancarias & Métodos de Pago";
    if (pathname.startsWith("/perfil")) return "Mi Perfil & Seguridad de Equipo";
    if (pathname.startsWith("/buscar")) return "Buscador Global";
    return isMaster ? "Multi-Tenant Master Wallet" : "Massivo Corp Wallet";
  };

  return (
    <header className="hidden lg:flex h-16 items-center justify-between border-b border-line bg-card/60 px-8 backdrop-blur sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-lg font-semibold tracking-tight text-foreground">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/buscar"
          className="flex items-center gap-2 rounded-full border border-line bg-soft px-3.5 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground transition-all"
        >
          <SearchIcon className="h-3.5 w-3.5 text-hint" />
          <span>{isMaster ? "Buscar empresas, configuraciones..." : "Buscar clientes, facturas, gastos..."}</span>
          <kbd className="rounded bg-card px-1.5 py-0.5 text-[10px] font-mono text-hint border border-line">
            ⌘K
          </kbd>
        </Link>

        <div className="h-4 w-px bg-line" />

        <div className="flex items-center gap-2">
          {isMaster ? (
            <Link
              href="/admin/empresas"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90 transition-all"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>+ Nueva Empresa</span>
            </Link>
          ) : (
            <>
              <Link
                href="/gastos"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
              >
                <ReceiptIcon className="h-3.5 w-3.5 text-overdue" />
                <span>+ Gasto</span>
              </Link>
              <Link
                href="/cobros/nueva"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90 transition-all"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>+ Factura</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
