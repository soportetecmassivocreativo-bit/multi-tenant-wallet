export const dynamic = "force-dynamic";

import { ReportesView } from "@/components/reportes/reportes-view";
import { getReport, getBcvRates, isAdmin, getExpenses } from "@/lib/data";
import {
  getDeferredCardClosures,
  getDeferredCardLimit,
  getDeferredCharges,
  getDeferredAbonos,
} from "@/lib/gastos-especiales-actions";

export default async function ReportesPage() {
  const [report, closures, activeCardLimit, activeCharges, activeAbonos, bcv, admin, expenses] =
    await Promise.all([
      getReport(),
      getDeferredCardClosures(),
      getDeferredCardLimit(),
      getDeferredCharges(),
      getDeferredAbonos(),
      getBcvRates(),
      isAdmin(),
      getExpenses(),
    ]);

  return (
    <ReportesView
      report={report}
      closures={closures}
      activeCardLimit={activeCardLimit}
      activeCharges={activeCharges}
      activeAbonos={activeAbonos}
      bcv={bcv}
      admin={admin}
    />
  );
}
