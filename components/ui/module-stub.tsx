import type { SVGProps } from "react";

/** Encabezado + estado "próximamente" reutilizable para módulos aún no construidos. */
export function ModuleStub({
  title,
  Icon,
  description,
  features,
}: {
  title: string;
  Icon: (p: SVGProps<SVGSVGElement>) => React.JSX.Element;
  description: string;
  features: string[];
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">{title}</h1>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-bg text-accent">
          <Icon className="h-5 w-5" />
        </span>
      </header>

      <p className="text-sm text-muted">{description}</p>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 font-serif text-[15px]">Incluirá</p>
        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[13px]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-hint">En construcción · Fase 1</p>
    </div>
  );
}
