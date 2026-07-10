import Link from "next/link";
import { BuildingIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getBcvRates } from "@/lib/data";

const company = {
  name: "Massivo Creativo",
  rif: "J-31000000-0",
};

export default async function EmpresasPage() {
  const bcv = await getBcvRates();

  const rows: Array<[string, string]> = [
    ["RIF", company.rif],
    ["Moneda de trabajo", "US$ / € (divisa)"],
    ["Conversión fiscal", "Bolívares a tasa BCV"],
    ["IVA por defecto", "16%"],
    ["Tasa BCV dólar", `${formatCurrency(bcv.usd, "VES")} / $`],
    ["Tasa BCV euro", `${formatCurrency(bcv.eur, "VES")} / €`],
    ["Numeración", "Próxima factura #1053"],
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <section className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-bg text-accent">
          <BuildingIcon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-serif text-2xl leading-tight tracking-tight">
            {company.name}
          </h1>
          <p className="text-xs text-hint">Empresa emisora</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`flex items-center justify-between px-4 py-3.5 ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="text-sm text-muted">{k}</span>
            <span className="text-sm font-medium">{v}</span>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-hint">
        Tasas BCV del {formatDate(bcv.date)} · sincronización automática
        próximamente
      </p>
    </div>
  );
}
