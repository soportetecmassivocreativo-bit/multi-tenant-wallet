import Link from "next/link";
import { EmployeesManager } from "@/components/nomina/employees-manager";
import { NominaPdfButton } from "@/components/nomina/nomina-pdf-button";
import { getEmployees } from "@/lib/data";

export default async function NominaPage() {
  const employees = await getEmployees();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
        <NominaPdfButton employees={employees} />
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Nómina</h1>
        <p className="mt-1 text-sm text-muted">
          Quincenal · 15 y último · moneda por empleado
        </p>
      </div>

      <EmployeesManager employees={employees} />
    </div>
  );
}
