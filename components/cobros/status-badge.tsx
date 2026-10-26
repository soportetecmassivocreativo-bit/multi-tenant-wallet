export type AnyEntityStatus =
  | "pagada"
  | "pagado"
  | "pendiente"
  | "parcial"
  | "vencida"
  | "borrador"
  | "aprobada"
  | "anulada"
  | string;

const styles: Record<string, string> = {
  pagada: "bg-income/10 text-income font-semibold",
  pagado: "bg-income/10 text-income font-semibold",
  pendiente: "bg-pending/10 text-pending font-semibold",
  parcial: "bg-accent/15 text-accent font-bold ring-1 ring-accent/30",
  vencida: "bg-overdue/10 text-overdue font-semibold",
  borrador: "bg-soft text-muted font-medium",
  aprobada: "bg-income/10 text-income font-semibold",
  anulada: "bg-soft text-muted line-through font-medium",
};

const labels: Record<string, string> = {
  pagada: "Pagada",
  pagado: "Pagado",
  pendiente: "Pendiente",
  parcial: "Parcial",
  vencida: "Vencida",
  borrador: "Borrador",
  aprobada: "Aprobada",
  anulada: "Anulada",
};

export function StatusBadge({ status }: { status: AnyEntityStatus }) {
  const normalized = (status || "").toLowerCase().trim();
  const style = styles[normalized] || "bg-soft text-muted";
  const label = labels[normalized] || status;

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] ${style}`}
    >
      {label}
    </span>
  );
}
