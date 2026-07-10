"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

const W = 320;
const H = 120;
const PAD = 8;

/** Balance acumulado real de los últimos días. Muestra un estado vacío si no hay datos. */
export function MiniLineChart({
  series,
  hasData,
}: {
  series: number[];
  hasData: boolean;
}) {
  const scope = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);

  const n = series.length;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = PAD + (n > 1 ? i / (n - 1) : 0) * (W - PAD * 2);
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  useGSAP(
    () => {
      const line = lineRef.current;
      if (!line) return;
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(line, {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: "power2.out",
        delay: 0.15,
      });
    },
    { scope, dependencies: [points] },
  );

  if (!hasData) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-2xl border border-dashed border-line px-4 text-center">
        <p className="text-xs text-hint">
          Tu gráfico crecerá a medida que registres cobros y gastos.
        </p>
      </div>
    );
  }

  return (
    <svg
      ref={scope}
      viewBox={`0 0 ${W} ${H}`}
      className="h-[120px] w-full"
      role="img"
      aria-label="Balance acumulado de los últimos días"
    >
      <line
        x1={PAD}
        y1={H - PAD}
        x2={W - PAD}
        y2={H - PAD}
        stroke="var(--line)"
        strokeWidth={1}
        strokeDasharray="2 4"
      />
      <polyline
        ref={lineRef}
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
