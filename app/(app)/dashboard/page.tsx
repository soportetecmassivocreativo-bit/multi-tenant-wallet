import { HeroBalance } from "@/components/dashboard/hero-balance";
import { MiniLineChart } from "@/components/dashboard/mini-line-chart";
import { StatPills } from "@/components/dashboard/stat-pills";
import { Transactions } from "@/components/dashboard/transactions";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowUpRightIcon, PayrollIcon, GridIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/currency";
import { formatMoney, formatDate } from "@/lib/format";
import { getDashboardSummary } from "@/lib/data";

export default async function DashboardPage() {
  const s = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>

      <section>
        <p className="font-serif text-[15px] text-muted">Saldo · julio</p>
        <HeroBalance value={s.balance} />
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-muted">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-accent-bg text-accent">
            <ArrowUpRightIcon className="h-3 w-3" />
          </span>
          +{s.deltaPct}% vs. mes pasado
        </p>
        <p className="mt-1.5 text-xs text-hint">
          ≈ {formatCurrency(s.balance * s.bcv.usd, "VES")} · tasa BCV{" "}
          {formatDate(s.bcv.date)}
        </p>
      </section>

      <MiniLineChart />

      <StatPills
        porCobrar={s.porCobrar}
        vencidas={s.vencidas}
        cobradoMes={s.cobradoMes}
      />

      {/* Compromisos fijos del mes (contabilidad de nómina + servicios) */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-soft p-4">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted">
            <PayrollIcon className="h-4 w-4" /> Nómina (mes)
          </p>
          <p className="tnum mt-1 text-lg font-medium">
            {formatMoney(s.nominaMes)}
          </p>
        </div>
        <div className="rounded-2xl bg-soft p-4">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted">
            <GridIcon className="h-4 w-4" /> Servicios (mes)
          </p>
          <p className="tnum mt-1 text-lg font-medium">
            {formatMoney(s.serviciosMes)}
          </p>
        </div>
      </section>

      <Transactions />
    </div>
  );
}
