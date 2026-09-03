import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { getMaintenanceStatus } from "@/lib/maintenance-actions";
import { isAdmin } from "@/lib/data";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { MaintenanceBanner } from "@/components/maintenance/maintenance-banner";
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [maintenance, userIsAdmin] = await Promise.all([
    getMaintenanceStatus(),
    isAdmin(),
  ]);

  // Si el sistema está en mantenimiento y el usuario NO es administrador, bloquear y mostrar pantalla
  if (maintenance.active && !userIsAdmin) {
    return <MaintenanceScreen message={maintenance.message} updatedAt={maintenance.updatedAt} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Banner de alerta persistente cuando el modo mantenimiento está activo (visible solo para admin) */}
      {maintenance.active && userIsAdmin && (
        <MaintenanceBanner message={maintenance.message} updatedAt={maintenance.updatedAt} />
      )}

      {/* Previsualizador de PDF Interactivo Global */}
      <PdfPreviewModal />

      <div className="flex-1 flex min-w-0">
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
      </div>

      {/* Barra de navegación inferior (solo en teléfonos / móviles) */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
