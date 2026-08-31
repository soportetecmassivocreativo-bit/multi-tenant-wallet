export const dynamic = "force-dynamic";

import Link from "next/link";
import { EmployeesManager } from "@/components/nomina/employees-manager";
import { NominaPdfButton } from "@/components/nomina/nomina-pdf-button";
import { getEmployees, getPayrollPeriods } from "@/lib/data";

export default async function NominaPage() {
  const [employees, payrollPeriods] = await Promise.all([
    getEmployees(),
    getPayrollPeriods(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95 lg:hidden">
          ‹ Más
        </Link>
        <div className="hidden lg:block">
          <h1 className="font-serif text-2xl tracking-tight">Nómina de Empleados</h1>
          <p className="text-xs text-hint mt-0.5">
            Gestión quincenal, historial de liquidaciones y recibos PDF
          </p>
        </div>
        <NominaPdfButton employees={employees} />
      </header>

      <div className="lg:hidden">
        <h1 className="font-serif text-2xl tracking-tight">Nómina</h1>
        <p className="mt-1 text-sm text-muted">
          Quincenal · 15 y último · moneda por empleado
        </p>
      </div>

      <EmployeesManager employees={employees} payrollPeriods={payrollPeriods} />
    </div>
  );
}
