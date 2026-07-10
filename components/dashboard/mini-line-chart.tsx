"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { chart } from "@/lib/mock-data";

const W = 320;
const H = 120;
const PAD = 8;

function toPoints(series: number[]) {
  const n = series.length;
  return series
    .map((v, i) => {
      const x = PAD + (i / (n - 1)) * (W - PAD * 2);
      const y = H - PAD - v * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Gráfico de línea sobrio que se "dibuja" al aparecer (draw-in GSAP). */
export function MiniLineChart() {
  const scope = useRef<SVGSVGElement>(null);
  const prevRef = useRef<SVGPolylineElement>(null);
  const curRef = useRef<SVGPolylineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  const n = chart.actual.length;
  const markerX = PAD + (chart.markerIndex / (n - 1)) * (W - PAD * 2);
  const markerY = H - PAD - chart.actual[chart.markerIndex] * (H - PAD * 2);

  useGSAP(
    () => {
      const lines = [prevRef.current, curRef.current];
      lines.forEach((line, idx) => {
        if (!line) return;
        const len = line.getTotalLength();
        gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(line, {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: "power2.out",
          delay: 0.15 + idx * 0.12,
        });
      });
      gsap.from(dotRef.current, {
        scale: 0,
        transformOrigin: "center",
        duration: 0.4,
        ease: "back.out(2)",
        delay: 1.1,
      });
    },
    { scope },
  );

  return (
    <svg
      ref={scope}
      viewBox={`0 0 ${W} ${H}`}
      className="h-[120px] w-full"
      role="img"
      aria-label="Ingresos del mes actual comparados con el mes anterior"
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
      <line
        x1={markerX}
        y1={PAD}
        x2={markerX}
        y2={H - PAD}
        stroke="var(--accent)"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.45}
      />
      <polyline
        ref={prevRef}
        points={toPoints(chart.anterior)}
        fill="none"
        stroke="var(--hint)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        ref={curRef}
        points={toPoints(chart.actual)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle ref={dotRef} cx={markerX} cy={markerY} r={3.5} fill="var(--accent)" />
    </svg>
  );
}
