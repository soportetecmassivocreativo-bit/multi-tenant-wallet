"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/lib/auth-actions";
import {
  HomeIcon,
  InvoiceIcon,
  ReceiptIcon,
  PayrollIcon,
  RepeatIcon,
  UsersIcon,
  ChartIcon,
  ShieldCheckIcon,
  SettingsIcon,
  BuildingIcon,
  BankIcon,
  UserIcon,
  LogoutIcon,
  SearchIcon,
  PlusIcon,
} from "@/components/ui/icons";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Inicio / Resumen", Icon: HomeIcon },
  { href: "/cobros", label: "Cobros & Facturas", Icon: InvoiceIcon },
  { href: "/gastos", label: "Gastos & Egresos", Icon: ReceiptIcon },
  { href: "/nomina", label: "Nómina de Empleados", Icon: PayrollIcon },
  { href: "/servicios", label: "Servicios Recurrentes", Icon: RepeatIcon },
  { href: "/clientes", label: "Clientes", Icon: UsersIcon },
  { href: "/reportes", label: "Reportes Financieros", Icon: ChartIcon },
  { href: "/auditoria", label: "Auditoría de Seguridad", Icon: ShieldCheckIcon },
  { href: "/cuentas", label: "Cuentas de Empresa", Icon: BuildingIcon },
  { href: "/configuracion", label: "Configuración Mas-Corp-", Icon: SettingsIcon },
];

const masterNav: NavItem[] = [
  { href: "/admin/empresas", label: "Empresas & Supabase DB", badge: "Master", Icon: BuildingIcon },
  { href: "/configuracion", label: "Configuración & Prefijos", Icon: SettingsIcon },
  { href: "/equipo", label: "Super Admins & Roles", Icon: UsersIcon },
  { href: "/auditoria", label: "Auditoría Multi-Tenant", Icon: ShieldCheckIcon },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  // Detectar si está en el portal master multi-tenant
  const isMaster =
    pathname.startsWith("/admin") ||
    process.env.NEXT_PUBLIC_APP_MODE === "master" ||
    (typeof window !== "undefined" &&
      (window.location.host.includes("multi-tenant") ||
        window.location.host.includes("muti-tenant")));

  const currentNav = isMaster ? masterNav : mainNav;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/admin/empresas") return pathname === "/admin/empresas";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r border-line bg-card/95 backdrop-blur">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <Link href={isMaster ? "/admin/empresas" : "/dashboard"} className="flex items-center gap-2 group">
          {isMaster ? (
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm">
                <BuildingIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-bold text-foreground tracking-tight block truncate">
                  Multi-Tenant Wallet
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-accent block">
                  Master Admin
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-massivo-creativo.png"
                alt="Massivo Creativo"
                className="h-8 w-auto shrink-0 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
              />
              <span className="text-[12px] font-extrabold text-accent tracking-widest uppercase ml-1">
                Wallet
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Quick Action Button */}
      <div className="p-4 pb-2">
        {isMaster ? (
          <Link
            href="/admin/empresas"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-accent/90 transition-all active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            <span>+ Nueva Empresa</span>
          </Link>
        ) : (
          <Link
            href="/cobros/nueva"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-accent/90 transition-all active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Nueva Factura</span>
          </Link>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 text-xs">
        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-hint">
          {isMaster ? "Administración Global" : "Módulos Principales"}
        </div>
        {currentNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all ${
                active
                  ? "bg-accent text-white shadow-sm font-semibold"
                  : "text-muted hover:bg-soft hover:text-foreground"
              }`}
            >
              <item.Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-white" : "text-hint"
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-accent/15 text-accent"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-3">
          <Link
            href="/buscar"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all ${
              pathname === "/buscar"
                ? "bg-accent text-white"
                : "text-muted hover:bg-soft hover:text-foreground"
            }`}
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-hint" />
            <span className="flex-1 truncate">Buscador Global</span>
          </Link>
        </div>
      </nav>

      {/* User & Settings Footer */}
      <div className="border-t border-line p-3 space-y-2 bg-soft/40">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/perfil"
            className="flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground"
          >
            <UserIcon className="h-4 w-4 text-hint" />
            <span>Mi Perfil & Seguridad</span>
          </Link>
          <ThemeToggle />
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-overdue hover:bg-overdue/10 transition-colors"
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
