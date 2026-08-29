import { HeroBalance } from "@/components/dashboard/hero-balance";
import { MiniLineChart } from "@/components/dashboard/mini-line-chart";
import { StatPills } from "@/components/dashboard/stat-pills";
import { Transactions } from "@/components/dashboard/transactions";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PayrollIcon, GridIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/currency";
import { formatMoney, formatDate } from "@/lib/format";
import { getDashboardSummary } from "@/lib/data";

export default async function DashboardPage() {
  const s = await getDashboardSummary();

  const currentMonth = new Intl.DateTimeFormat("es-VE", { month: "long" }).format(new Date());
  const vesEquivalent = s.balance * s.bcv.usd;
  const eurEquivalent = s.bcv.eur > 0 ? (s.balance * s.bcv.usd) / s.bcv.eur : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between lg:hidden">
        <Logo />
        <ThemeToggle />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Principal (8 columnas en desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl border border-line bg-card p-6 shadow-sm">
            <p className="font-serif text-[15px] text-muted capitalize">
              Saldo Total Disponible · {currentMonth}
            </p>
            <HeroBalance value={s.balance} />

            {/* Equivalencia en Bolívares y Euros */}
            <p className="mt-2 text-xs text-hint">
              ≈ {formatCurrency(vesEquivalent, "VES")} · ≈ {formatCurrency(eurEquivalent, "EUR")}
            </p>

            {/* Tasas oficiales del día (siempre visibles) */}
            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-2xl bg-soft px-3.5 py-2.5 text-xs text-muted">
              <span className="font-medium text-foreground">
                Tasas Oficiales BCV ({formatDate(s.bcv.date)}):
              </span>
              <span>
                $ 1 = <strong className="font-medium text-foreground">{formatCurrency(s.bcv.usd, "VES")}</strong>
              </span>
              <span className="text-hint">·</span>
              <span>
                € 1 = <strong className="font-medium text-foreground">{formatCurrency(s.bcv.eur, "VES")}</strong>
              </span>
            </div>
          </section>

          <MiniLineChart series={s.chartSeries} hasData={s.hasMovements} />

          <StatPills
            porCobrar={s.porCobrar}
            vencidas={s.vencidas}
            cobradoMes={s.cobradoMes}
          />
        </div>

        {/* Columna Lateral (5 columnas en desktop): Compromisos y Movimientos */}
        <div className="lg:col-span-5 space-y-6">
          {/* Compromisos fijos del mes (contabilidad de nómina + servicios) */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <PayrollIcon className="h-4 w-4 text-purple-600" /> Nómina (mes)
              </p>
              <p className="tnum mt-1 text-lg font-medium">
                {formatMoney(s.nominaMes)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <GridIcon className="h-4 w-4 text-accent" /> Servicios (mes)
              </p>
              <p className="tnum mt-1 text-lg font-medium">
                {formatMoney(s.serviciosMes)}
              </p>
            </div>
          </section>

          <div className="rounded-3xl border border-line bg-card p-5 shadow-sm">
            <Transactions movements={s.movements} />
          </div>
        </div>
      </div>
    </div>
  );
}
