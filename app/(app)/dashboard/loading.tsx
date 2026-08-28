// Skeleton de carga que se muestra inmediatamente mientras el dashboard
// carga sus datos. Esto evita que el usuario vea una pantalla en blanco.
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-lg bg-soft" />
        <div className="h-7 w-7 rounded-full bg-soft" />
      </div>

      {/* Balance hero */}
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-soft" />
        <div className="h-10 w-40 rounded-lg bg-soft" />
        <div className="h-3 w-52 rounded bg-soft" />
      </div>

      {/* Mini chart */}
      <div className="h-20 rounded-2xl bg-soft" />

      {/* Stat pills */}
      <div className="flex gap-2">
        <div className="h-16 flex-1 rounded-2xl bg-soft" />
        <div className="h-16 flex-1 rounded-2xl bg-soft" />
        <div className="h-16 flex-1 rounded-2xl bg-soft" />
      </div>

      {/* Cards nómina / servicios */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-soft" />
        <div className="h-20 rounded-2xl bg-soft" />
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-soft" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-soft" />
              <div className="h-3 w-20 rounded bg-soft" />
            </div>
            <div className="h-4 w-16 rounded bg-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
