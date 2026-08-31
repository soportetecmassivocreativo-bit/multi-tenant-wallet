export const dynamic = "force-dynamic";

import { SearchClient } from "@/components/buscar/search-client";
import { getClients, getInvoices, getExpenses } from "@/lib/data";

export default async function BuscarPage() {
  const [clients, invoices, expenses] = await Promise.all([
    getClients(),
    getInvoices(),
    getExpenses(),
  ]);

  return (
    <SearchClient clients={clients} invoices={invoices} expenses={expenses} />
  );
}
