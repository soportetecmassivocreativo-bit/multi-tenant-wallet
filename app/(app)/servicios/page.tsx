export const dynamic = "force-dynamic";

import Link from "next/link";
import { ServicesManager } from "@/components/servicios/services-manager";
import { ServiciosPdfButton } from "@/components/servicios/servicios-pdf-button";
import { getServices, getServiceExpenses } from "@/lib/data";

export default async function ServiciosPage() {
  const [services, serviceExpenses] = await Promise.all([
    getServices(),
    getServiceExpenses(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
        <ServiciosPdfButton services={services} />
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Servicios</h1>
        <p className="mt-1 text-sm text-muted">
          Suscripciones y pagos recurrentes
        </p>
      </div>

      <ServicesManager services={services} serviceExpenses={serviceExpenses} />
    </div>
  );
}
