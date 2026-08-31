"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  HomeIcon,
  InvoiceIcon,
  SearchIcon,
  GridIcon,
  PlusIcon,
  CashIcon,
  ReceiptIcon,
  UserPlusIcon,
  BuildingIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
};

const left: NavItem[] = [
  { href: "/dashboard", label: "Inicio", Icon: HomeIcon },
  { href: "/cobros", label: "Cobros", Icon: InvoiceIcon },
];
const right: NavItem[] = [
  { href: "/buscar", label: "Buscar", Icon: SearchIcon },
  { href: "/mas", label: "Más", Icon: GridIcon },
];

const masterLeft: NavItem[] = [
  { href: "/admin/empresas", label: "Empresas", Icon: BuildingIcon },
  { href: "/configuracion", label: "Prefijos", Icon: SettingsIcon },
];
const masterRight: NavItem[] = [
  { href: "/equipo", label: "Admins", Icon: UsersIcon },
  { href: "/auditoria", label: "Auditoría", Icon: ShieldCheckIcon },
];

const quickActions = [
  { label: "Nueva factura", href: "/cobros/nueva", Icon: InvoiceIcon, color: "text-accent" },
  { label: "Registrar cobro", href: "/cobros", Icon: CashIcon, color: "text-income" },
  { label: "Nuevo gasto", href: "/gastos", Icon: ReceiptIcon, color: "text-overdue" },
  { label: "Nuevo cliente", href: "/clientes", Icon: UserPlusIcon, color: "text-accent" },
];

const masterQuickActions = [
  { label: "Nueva Empresa Multi-Tenant", href: "/admin/empresas", Icon: BuildingIcon, color: "text-accent" },
  { label: "Configuración & Nomenclatura", href: "/configuracion", Icon: SettingsIcon, color: "text-accent" },
  { label: "Gestión de Super Admins", href: "/equipo", Icon: UsersIcon, color: "text-income" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon, label, href } = item;
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 py-1"
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={`h-[22px] w-[22px] transition-colors ${
          active ? "text-accent" : "text-hint"
        }`}
      />
      <span
        className={`text-[9px] transition-colors ${
          active ? "text-accent" : "text-hint"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isMaster =
    pathname.startsWith("/admin") ||
    process.env.NEXT_PUBLIC_APP_MODE === "master" ||
    (typeof window !== "undefined" &&
      (window.location.host.includes("multi-tenant") ||
        window.location.host.includes("muti-tenant")));

  const currentLeft = isMaster ? masterLeft : left;
  const currentRight = isMaster ? masterRight : right;
  const currentActions = isMaster ? masterQuickActions : quickActions;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/admin/empresas") return pathname === "/admin/empresas";
    return pathname.startsWith(href);
  };

  // Entrada de la barra al montar.
  useGSAP(() => {
    gsap.from(barRef.current, {
      y: 100,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
      delay: 0.1,
    });
  });

  // Apertura del menú rápido + rotación del botón ＋.
  useGSAP(
    () => {
      gsap.to(plusRef.current, {
        rotate: open ? 45 : 0,
        duration: 0.35,
        ease: "power2.out",
      });
      if (open && sheetRef.current) {
        gsap.fromTo(
          sheetRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.2, ease: "power1.out" },
        );
        gsap.fromTo(
          sheetRef.current.querySelectorAll("[data-action]"),
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            ease: "back.out(1.6)",
            stagger: 0.06,
          },
        );
      }
    },
    { dependencies: [open] },
  );

  return (
    <>
      {open && (
        <>
          <button
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div
            ref={sheetRef}
            className="fixed inset-x-0 bottom-[92px] z-40 mx-auto w-[calc(100%-2.5rem)] max-w-[440px] space-y-2 lg:hidden"
          >
            {currentActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                data-action
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-[0_6px_24px_rgba(0,0,0,0.08)] active:scale-[0.98]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-soft">
                  <a.Icon className={`h-[18px] w-[18px] ${a.color}`} />
                </span>
                <span className="text-sm font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <nav
        ref={barRef}
        className="fixed inset-x-0 bottom-4 z-40 mx-auto flex h-14 w-[calc(100%-2.5rem)] max-w-[440px] items-center justify-around rounded-full border border-line bg-card px-2 shadow-[0_6px_24px_rgba(0,0,0,0.08)] lg:hidden"
      >
        {currentLeft.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <div className="flex flex-1 justify-center">
          <button
            ref={plusRef}
            onClick={() => setOpen((v) => !v)}
            aria-label="Crear"
            aria-expanded={open}
            className="-mt-7 grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-white shadow-[0_8px_20px_rgba(59,91,219,0.4)] transition-transform active:scale-95"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>

        {currentRight.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
    </>
  );
}
