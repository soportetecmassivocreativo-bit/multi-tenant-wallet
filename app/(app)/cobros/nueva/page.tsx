import { NuevaFacturaForm } from "@/components/cobros/nueva-factura-form";
import { getClients, getProducts, getBcvRates } from "@/lib/data";

export default async function NuevaFacturaPage() {
  const [clients, products, bcv] = await Promise.all([
    getClients(),
    getProducts(),
    getBcvRates(),
  ]);

  return <NuevaFacturaForm clients={clients} products={products} bcv={bcv} />;
}
