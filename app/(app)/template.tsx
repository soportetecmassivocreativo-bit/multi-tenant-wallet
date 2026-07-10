"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/** Transición de página: fade + leve desplazamiento en cada cambio de ruta. */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );
  });

  return <div ref={ref}>{children}</div>;
}
