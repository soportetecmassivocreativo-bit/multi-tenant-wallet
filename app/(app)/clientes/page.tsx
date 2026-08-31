export const dynamic = "force-dynamic";

import { NuevoClienteForm } from "@/components/clientes/nuevo-cliente-form";
import { ClientesPdfButton } from "@/components/clientes/clientes-pdf-button";
import { ClientesManager } from "@/components/clientes/clientes-manager";
import { getClients, isAdmin } from "@/lib/data";

export default async function ClientesPage() {
  const [clients, admin] = await Promise.all([getClients(), isAdmin()]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Clientes</h1>
        <div className="flex items-center gap-2">
          <ClientesPdfButton clients={clients} />
          <NuevoClienteForm />
        </div>
      </header>

      <ClientesManager clients={clients} admin={admin} />
    </div>
  );
}
