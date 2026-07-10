function tone(score: number) {
  if (score >= 85) return "bg-income/10 text-income";
  if (score >= 70) return "bg-pending/10 text-pending";
  return "bg-overdue/10 text-overdue";
}

/** Chip con el score de comportamiento de pago del cliente. */
export function ScoreChip({ score }: { score: number }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone(score)}`}
    >
      Score {score}
    </span>
  );
}
