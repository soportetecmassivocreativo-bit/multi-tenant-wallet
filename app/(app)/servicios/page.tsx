import Link from "next/link";
import { ServicesManager } from "@/components/servicios/services-manager";
import { getServices } from "@/lib/data";

export default async function ServiciosPage() {
  const services = await getServices();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Servicios</h1>
        <p className="mt-1 text-sm text-muted">
          Suscripciones y pagos recurrentes
        </p>
      </div>

      <ServicesManager services={services} />
    </div>
  );
}
