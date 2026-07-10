import type { InvoiceStatus } from "@/lib/mock-data";

const styles: Record<InvoiceStatus, string> = {
  pagada: "bg-income/10 text-income",
  pendiente: "bg-pending/10 text-pending",
  parcial: "bg-accent/10 text-accent",
  vencida: "bg-overdue/10 text-overdue",
  borrador: "bg-soft text-muted",
};

const labels: Record<InvoiceStatus, string> = {
  pagada: "Pagada",
  pendiente: "Pendiente",
  parcial: "Parcial",
  vencida: "Vencida",
  borrador: "Borrador",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
