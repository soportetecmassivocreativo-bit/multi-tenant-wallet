export const dynamic = "force-dynamic";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/lib/auth-actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  UsersIcon,
  BuildingIcon,
  PayrollIcon,
  ReceiptIcon,
  RepeatIcon,
  UserPlusIcon,
  ChartIcon,
  ChevronRightIcon,
  SunIcon,
  LogoutIcon,
  UserIcon,
  ShieldCheckIcon,
  SettingsIcon,
  FileTextIcon,
} from "@/components/ui/icons";

type Item = {
  href: string;
  label: string;
  desc: string;
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
};

const modules: Item[] = [
  { href: "/proformas",     label: "Proformas & Cotizaciones", desc: "Cotizaciones y pagos en espera antes de facturar", Icon: FileTextIcon },
  { href: "/cobros",        label: "Facturación & Cobros",     desc: "Facturas, cobros y cuentas por cobrar",          Icon: ReceiptIcon },
  { href: "/gastos",        label: "Gastos & Egresos",         desc: "Egresos y categorías",                          Icon: ChartIcon },
  { href: "/nomina",        label: "Nómina",                   desc: "Empleados y pagos quincenales",                 Icon: PayrollIcon },
  { href: "/servicios",     label: "Servicios Recurrentes",    desc: "Suscripciones y cobros periódicos",             Icon: RepeatIcon },
  { href: "/clientes",      label: "Directorio de Clientes",   desc: "Fichas, historial y score",                     Icon: UsersIcon },
  { href: "/equipo",        label: "Equipo & Accesos",         desc: "Gestión de roles y miembros",                   Icon: UserPlusIcon },
  { href: "/reportes",      label: "Reportes Financieros",     desc: "Ingresos vs egresos y balances",                Icon: ChartIcon },
  { href: "/auditoria",     label: "Auditoría del Sistema",    desc: "Registro de movimientos y acciones",            Icon: ShieldCheckIcon },
  { href: "/cuentas",       label: "Cuentas de Empresa",       desc: "Bancos, Pago Móvil, Zelle y cripto",            Icon: BuildingIcon },
  { href: "/configuracion", label: "Configuración Mas-Corp-",  desc: "Personalización PDF y contabilizadores",        Icon: SettingsIcon },
  { href: "/perfil",        label: "Mi Perfil & Seguridad",    desc: "Cambiar clave y datos de cuenta",               Icon: UserIcon },
  { href: "/empresas",      label: "Empresas",                 desc: "Datos fiscales e impuestos",                    Icon: BuildingIcon },
];

export default function MasPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl tracking-tight">Más</h1>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        {modules.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            className={`flex items-center gap-3 px-4 py-3.5 active:bg-soft ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-bg text-accent">
              <m.Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-[11px] text-hint">{m.desc}</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-hint" />
          </Link>
        ))}
      </section>

      <section>
        <p className="mb-2 text-xs text-muted">Apariencia</p>
        <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-soft text-muted">
              <SunIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-medium">Modo claro / oscuro</span>
          </span>
          <ThemeToggle />
        </div>
      </section>

      {isSupabaseConfigured && (
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left active:bg-soft"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-soft text-overdue">
              <LogoutIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-medium text-overdue">
              Cerrar sesión
            </span>
          </button>
        </form>
      )}

      <p className="text-center text-xs text-hint">M-Wallet · v0.1 · Fase 1</p>
    </div>
  );
}
