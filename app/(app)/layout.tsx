import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { DesktopHeader } from "@/components/layout/desktop-header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Barra lateral para PC / Laptop (pantallas lg+) */}
      <DesktopSidebar />

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Encabezado superior para PC / Laptop */}
        <DesktopHeader />

        {/* Contenedor responsivo: ajustado a teléfono en móvil y expandido a ancho completo en PC */}
        <main className="flex-1 w-full max-w-[500px] mx-auto px-4 pb-28 pt-4 lg:max-w-6xl lg:px-8 lg:py-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Barra de navegación inferior (solo en teléfonos / móviles) */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
